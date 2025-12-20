import { Hono } from 'hono';
import { z } from 'zod';
import { getAdminClient } from '../lib/supabase';
import { success, created, noContent, errors, paginated } from '../lib/response';
import { getTenantFilter } from '../middleware/tenant';
import { escapeSearchQuery } from '@listing-platform/shared';

export const listingsRoutes = new Hono();

// ============================================================================
// Validation Schemas
// ============================================================================

const createListingSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  description: z.string().optional().nullable(),
  excerpt: z.string().max(500).optional().nullable(),
  featuredImage: z.string().url().optional().nullable(),
  gallery: z.array(z.object({
    url: z.string().url(),
    alt: z.string().optional(),
    caption: z.string().optional(),
  })).optional().nullable(),
  videoUrl: z.string().url().optional().nullable(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    region: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
  }).optional().nullable(),
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }).optional().nullable(),
  price: z.number().min(0).optional().nullable(),
  currency: z.string().length(3).default('USD'),
  priceType: z.enum(['fixed', 'hourly', 'per_night', 'per_month', 'negotiable', 'free']).optional().nullable(),
  priceMetadata: z.record(z.unknown()).optional().nullable(),
  customFields: z.record(z.unknown()).optional().nullable(),
  seoTitle: z.string().max(60).optional().nullable(),
  seoDescription: z.string().max(160).optional().nullable(),
  seoKeywords: z.array(z.string()).optional().nullable(),
  status: z.enum(['draft', 'published', 'archived', 'suspended']).default('draft'),
  taxonomyTermIds: z.array(z.string().uuid()).optional().nullable(),
});

const updateListingSchema = createListingSchema.partial();

const listQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived', 'suspended']).optional(),
  ownerId: z.string().uuid().optional(),
  taxonomyTermId: z.string().uuid().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  sortBy: z.enum(['created_at', 'updated_at', 'published_at', 'title', 'price', 'view_count']).default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ============================================================================
// Routes
// ============================================================================

/**
 * GET /api/listings
 * List all listings for the tenant
 */
listingsRoutes.get('/', async (c) => {
  const query = listQuerySchema.parse(c.req.query());
  const { tenant_id } = getTenantFilter(c);
  const supabase = getAdminClient();
  
  let dbQuery = supabase
    .from('listings')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenant_id)
    .order(query.sortBy, { ascending: query.sortOrder === 'asc' })
    .range((query.page - 1) * query.limit, query.page * query.limit - 1);
  
  if (query.search) {
    const escapedSearch = escapeSearchQuery(query.search);
    dbQuery = dbQuery.or(`title.ilike.%${escapedSearch}%,description.ilike.%${escapedSearch}%`);
  }
  
  if (query.status) {
    dbQuery = dbQuery.eq('status', query.status);
  }
  
  if (query.ownerId) {
    dbQuery = dbQuery.eq('owner_id', query.ownerId);
  }
  
  if (query.minPrice !== undefined) {
    dbQuery = dbQuery.gte('price', query.minPrice);
  }
  
  if (query.maxPrice !== undefined) {
    dbQuery = dbQuery.lte('price', query.maxPrice);
  }
  
  const { data, error, count } = await dbQuery;
  
  if (error) throw error;
  
  return paginated(c, data || [], query.page, query.limit, count || 0);
});

/**
 * GET /api/listings/published
 * Get published listings (public endpoint)
 */
listingsRoutes.get('/published', async (c) => {
  const query = listQuerySchema.parse(c.req.query());
  const { tenant_id } = getTenantFilter(c);
  const supabase = getAdminClient();
  
  let dbQuery = supabase
    .from('listings')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenant_id)
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString())
    .order(query.sortBy, { ascending: query.sortOrder === 'asc' })
    .range((query.page - 1) * query.limit, query.page * query.limit - 1);
  
  if (query.search) {
    const escapedSearch = escapeSearchQuery(query.search);
    dbQuery = dbQuery.or(`title.ilike.%${escapedSearch}%,description.ilike.%${escapedSearch}%`);
  }
  
  if (query.minPrice !== undefined) {
    dbQuery = dbQuery.gte('price', query.minPrice);
  }
  
  if (query.maxPrice !== undefined) {
    dbQuery = dbQuery.lte('price', query.maxPrice);
  }
  
  const { data, error, count } = await dbQuery;
  
  if (error) throw error;
  
  return paginated(c, data || [], query.page, query.limit, count || 0);
});

/**
 * GET /api/listings/slug/:slug
 * Get a listing by slug (must be before /:id to avoid route conflicts)
 */
listingsRoutes.get('/slug/:slug', async (c) => {
  const { slug } = c.req.param();
  const { tenant_id } = getTenantFilter(c);
  const supabase = getAdminClient();
  
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('slug', slug)
    .eq('tenant_id', tenant_id)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      return errors.notFound(c, 'Listing');
    }
    throw error;
  }
  
  // Increment view count atomically using raw SQL to avoid race conditions
  await supabase.rpc('increment_view_count', { listing_id: data.id });
  
  return success(c, data);
});

/**
 * GET /api/listings/:id
 * Get a single listing
 */
listingsRoutes.get('/:id', async (c) => {
  const { id } = c.req.param();
  const { tenant_id } = getTenantFilter(c);
  const supabase = getAdminClient();
  
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenant_id)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      return errors.notFound(c, 'Listing');
    }
    throw error;
  }
  
  return success(c, data);
});

/**
 * POST /api/listings
 * Create a new listing
 */
listingsRoutes.post('/', async (c) => {
  const body = await c.req.json();
  const parsed = createListingSchema.safeParse(body);
  
  if (!parsed.success) {
    return errors.validationError(c, parsed.error.errors);
  }
  
  const { tenant_id } = getTenantFilter(c);
  const user = c.get('user');
  const supabase = getAdminClient();
  
  // Check for duplicate slug
  const { data: existing } = await supabase
    .from('listings')
    .select('id')
    .eq('tenant_id', tenant_id)
    .eq('slug', parsed.data.slug)
    .single();
  
  if (existing) {
    return errors.conflict(c, 'A listing with this slug already exists');
  }
  
  const { data, error } = await supabase
    .from('listings')
    .insert({
      tenant_id,
      owner_id: user.id,
      title: parsed.data.title,
      slug: parsed.data.slug,
      description: parsed.data.description,
      excerpt: parsed.data.excerpt,
      featured_image: parsed.data.featuredImage,
      gallery: parsed.data.gallery,
      video_url: parsed.data.videoUrl,
      address: parsed.data.address,
      // Note: location needs PostGIS format conversion
      price: parsed.data.price,
      currency: parsed.data.currency,
      price_type: parsed.data.priceType,
      price_metadata: parsed.data.priceMetadata,
      custom_fields: parsed.data.customFields,
      seo_title: parsed.data.seoTitle,
      seo_description: parsed.data.seoDescription,
      seo_keywords: parsed.data.seoKeywords,
      status: parsed.data.status,
      published_at: parsed.data.status === 'published' ? new Date().toISOString() : null,
    })
    .select()
    .single();
  
  if (error) throw error;
  
  // Add taxonomy terms if provided
  if (parsed.data.taxonomyTermIds?.length) {
    await supabase
      .from('listing_taxonomies')
      .insert(
        parsed.data.taxonomyTermIds.map((termId, index) => ({
          listing_id: data.id,
          taxonomy_term_id: termId,
          is_primary: index === 0,
        }))
      );
  }
  
  return created(c, data);
});

/**
 * PATCH /api/listings/:id
 * Update a listing
 */
listingsRoutes.patch('/:id', async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json();
  const parsed = updateListingSchema.safeParse(body);
  
  if (!parsed.success) {
    return errors.validationError(c, parsed.error.errors);
  }
  
  const { tenant_id } = getTenantFilter(c);
  const supabase = getAdminClient();
  
  // Check if listing exists
  const { data: existing } = await supabase
    .from('listings')
    .select('id, status')
    .eq('id', id)
    .eq('tenant_id', tenant_id)
    .single();
  
  if (!existing) {
    return errors.notFound(c, 'Listing');
  }
  
  // Check for duplicate slug if being changed
  if (parsed.data.slug) {
    const { data: slugExists } = await supabase
      .from('listings')
      .select('id')
      .eq('tenant_id', tenant_id)
      .eq('slug', parsed.data.slug)
      .neq('id', id)
      .single();
    
    if (slugExists) {
      return errors.conflict(c, 'A listing with this slug already exists');
    }
  }
  
  const updates: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) updates.title = parsed.data.title;
  if (parsed.data.slug !== undefined) updates.slug = parsed.data.slug;
  if (parsed.data.description !== undefined) updates.description = parsed.data.description;
  if (parsed.data.excerpt !== undefined) updates.excerpt = parsed.data.excerpt;
  if (parsed.data.featuredImage !== undefined) updates.featured_image = parsed.data.featuredImage;
  if (parsed.data.gallery !== undefined) updates.gallery = parsed.data.gallery;
  if (parsed.data.videoUrl !== undefined) updates.video_url = parsed.data.videoUrl;
  if (parsed.data.address !== undefined) updates.address = parsed.data.address;
  if (parsed.data.price !== undefined) updates.price = parsed.data.price;
  if (parsed.data.currency !== undefined) updates.currency = parsed.data.currency;
  if (parsed.data.priceType !== undefined) updates.price_type = parsed.data.priceType;
  if (parsed.data.priceMetadata !== undefined) updates.price_metadata = parsed.data.priceMetadata;
  if (parsed.data.customFields !== undefined) updates.custom_fields = parsed.data.customFields;
  if (parsed.data.seoTitle !== undefined) updates.seo_title = parsed.data.seoTitle;
  if (parsed.data.seoDescription !== undefined) updates.seo_description = parsed.data.seoDescription;
  if (parsed.data.seoKeywords !== undefined) updates.seo_keywords = parsed.data.seoKeywords;
  
  if (parsed.data.status !== undefined) {
    updates.status = parsed.data.status;
    // Set published_at when first published
    if (parsed.data.status === 'published' && existing.status !== 'published') {
      updates.published_at = new Date().toISOString();
    }
  }
  
  updates.updated_at = new Date().toISOString();
  
  const { data, error } = await supabase
    .from('listings')
    .update(updates)
    .eq('id', id)
    .eq('tenant_id', tenant_id)
    .select()
    .single();
  
  if (error) throw error;
  
  return success(c, data);
});

/**
 * DELETE /api/listings/:id
 * Delete a listing
 */
listingsRoutes.delete('/:id', async (c) => {
  const { id } = c.req.param();
  const { tenant_id } = getTenantFilter(c);
  const supabase = getAdminClient();
  
  const { error } = await supabase
    .from('listings')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenant_id);
  
  if (error) throw error;
  
  return noContent(c);
});

/**
 * PATCH /api/listings/:id/publish
 * Publish a listing
 */
listingsRoutes.patch('/:id/publish', async (c) => {
  const { id } = c.req.param();
  const { tenant_id } = getTenantFilter(c);
  const supabase = getAdminClient();
  
  const { data, error } = await supabase
    .from('listings')
    .update({
      status: 'published',
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('tenant_id', tenant_id)
    .select()
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      return errors.notFound(c, 'Listing');
    }
    throw error;
  }
  
  return success(c, data);
});

/**
 * PATCH /api/listings/:id/archive
 * Archive a listing
 */
listingsRoutes.patch('/:id/archive', async (c) => {
  const { id } = c.req.param();
  const { tenant_id } = getTenantFilter(c);
  const supabase = getAdminClient();
  
  const { data, error } = await supabase
    .from('listings')
    .update({
      status: 'archived',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('tenant_id', tenant_id)
    .select()
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      return errors.notFound(c, 'Listing');
    }
    throw error;
  }
  
  return success(c, data);
});


