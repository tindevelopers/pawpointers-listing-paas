import { Hono } from 'hono';
import Stripe from 'stripe';
import { getAdminClient } from '../../lib/supabase';

export const stripeWebhookRoutes = new Hono();

// Initialize Stripe
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

/**
 * POST /api/webhooks/stripe
 * Handle Stripe webhook events
 */
stripeWebhookRoutes.post('/', async (c) => {
  if (!stripe || !webhookSecret) {
    console.error('Stripe not configured');
    return c.json({ error: 'Stripe not configured' }, 500);
  }
  
  const signature = c.req.header('stripe-signature');
  if (!signature) {
    return c.json({ error: 'Missing stripe-signature header' }, 400);
  }
  
  let event: Stripe.Event;
  
  try {
    const body = await c.req.text();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return c.json({ error: 'Webhook signature verification failed' }, 400);
  }
  
  const supabase = getAdminClient();
  
  // Check for duplicate event (idempotency check)
  const { data: existingEvent } = await supabase
    .from('stripe_webhook_events')
    .select('id, processed')
    .eq('stripe_event_id', event.id)
    .single();
  
  if (existingEvent) {
    // Event already exists - if processed, skip; if not, it might be a retry
    if (existingEvent.processed) {
      console.log(`Duplicate event ${event.id} already processed, skipping`);
      return c.json({ received: true, duplicate: true });
    }
    console.log(`Retrying unprocessed event ${event.id}`);
  } else {
    // Log the webhook event (first time seeing it)
    const { error: insertError } = await supabase.from('stripe_webhook_events').insert({
      stripe_event_id: event.id,
      event_type: event.type,
      payload: JSON.parse(JSON.stringify(event.data.object)) as Record<string, unknown>,
      processed: false,
    });
    
    // Handle unique constraint violation (race condition with concurrent requests)
    if (insertError?.code === '23505') {
      console.log(`Concurrent duplicate event ${event.id}, skipping`);
      return c.json({ received: true, duplicate: true });
    }
  }
  
  try {
    switch (event.type) {
      // Customer events
      case 'customer.created':
      case 'customer.updated': {
        const customer = event.data.object as Stripe.Customer;
        await handleCustomerEvent(supabase, customer);
        break;
      }
      
      // Subscription events
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionEvent(supabase, subscription, event.type);
        break;
      }
      
      // Invoice events
      case 'invoice.paid':
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoiceEvent(supabase, invoice, event.type);
        break;
      }
      
      // Payment intent events
      case 'payment_intent.succeeded':
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentEvent(supabase, paymentIntent, event.type);
        break;
      }
      
      // Checkout session completed
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(supabase, session);
        break;
      }
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
    
    // Mark event as processed
    await supabase
      .from('stripe_webhook_events')
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq('stripe_event_id', event.id);
    
  } catch (err) {
    console.error(`Error processing webhook ${event.type}:`, err);
    // Still return 200 to acknowledge receipt
  }
  
  return c.json({ received: true });
});

// ============================================================================
// Event Handlers
// ============================================================================

async function handleCustomerEvent(supabase: ReturnType<typeof getAdminClient>, customer: Stripe.Customer) {
  const { error } = await supabase
    .from('stripe_customers')
    .upsert({
      stripe_customer_id: customer.id,
      email: customer.email,
      name: customer.name,
      metadata: customer.metadata,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'stripe_customer_id',
    });
  
  if (error) {
    console.error('Error upserting customer:', error);
  }
}

async function handleSubscriptionEvent(
  supabase: ReturnType<typeof getAdminClient>,
  subscription: Stripe.Subscription,
  _eventType: string
) {
  const { error } = await supabase
    .from('stripe_subscriptions')
    .upsert({
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer as string,
      status: subscription.status,
      price_id: subscription.items.data[0]?.price.id,
      quantity: subscription.items.data[0]?.quantity,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
      metadata: subscription.metadata,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'stripe_subscription_id',
    });
  
  if (error) {
    console.error('Error upserting subscription:', error);
  }
  
  // If tenant_id is in metadata, update tenant's subscription status
  if (subscription.metadata.tenant_id) {
    await supabase
      .from('tenants')
      .update({
        subscription_status: subscription.status,
        subscription_id: subscription.id,
      })
      .eq('id', subscription.metadata.tenant_id);
  }
}

async function handleInvoiceEvent(
  supabase: ReturnType<typeof getAdminClient>,
  invoice: Stripe.Invoice,
  _eventType: string
) {
  const { error } = await supabase
    .from('stripe_invoices')
    .upsert({
      stripe_invoice_id: invoice.id,
      stripe_customer_id: invoice.customer as string,
      stripe_subscription_id: invoice.subscription as string | null,
      status: invoice.status,
      amount_due: invoice.amount_due,
      amount_paid: invoice.amount_paid,
      currency: invoice.currency,
      invoice_pdf: invoice.invoice_pdf,
      hosted_invoice_url: invoice.hosted_invoice_url,
      period_start: new Date(invoice.period_start * 1000).toISOString(),
      period_end: new Date(invoice.period_end * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'stripe_invoice_id',
    });
  
  if (error) {
    console.error('Error upserting invoice:', error);
  }
}

async function handlePaymentIntentEvent(
  supabase: ReturnType<typeof getAdminClient>,
  paymentIntent: Stripe.PaymentIntent,
  _eventType: string
) {
  const { error } = await supabase
    .from('stripe_payment_intents')
    .upsert({
      stripe_payment_intent_id: paymentIntent.id,
      stripe_customer_id: paymentIntent.customer as string | null,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
      metadata: paymentIntent.metadata,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'stripe_payment_intent_id',
    });
  
  if (error) {
    console.error('Error upserting payment intent:', error);
  }
}

async function handleCheckoutSessionCompleted(
  supabase: ReturnType<typeof getAdminClient>,
  session: Stripe.Checkout.Session
) {
  // Handle checkout completion - typically means a new subscription was created
  console.log('Checkout session completed:', session.id);
  
  // If there's a tenant_id in metadata, update the tenant
  if (session.metadata?.tenant_id && session.subscription) {
    await supabase
      .from('tenants')
      .update({
        stripe_customer_id: session.customer as string,
        subscription_id: session.subscription as string,
        subscription_status: 'active',
      })
      .eq('id', session.metadata.tenant_id);
  }
}


