import { Hono } from 'hono';
import { z } from 'zod';
import { getAdminClient } from '../lib/supabase';
import { success, created, noContent, errors, paginated } from '../lib/response';
import { getTenantFilter } from '../middleware/tenant';
import { escapeSearchQuery } from '@listing-platform/shared';

export const companiesRoutes = new Hono();

// ============================================================================
// Validation Schemas
// ============================================================================

const createCompanySchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  website: z.string().url('Invalid URL').optional().nullable(),
  industry: z.string().optional().nullable(),
  size: z.enum(['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']).optional().nullable(),
  annualRevenue: z.number().optional().nullable(),
  description: z.string().optional().nullable(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
  }).optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email('Invalid email').optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  customFields: z.record(z.unknown()).optional().nullable(),
});

const updateCompanySchema = createCompanySchema.partial();

const listQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  industry: z.string().optional(),
  sortBy: z.enum(['created_at', 'updated_at', 'name']).default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ============================================================================
// Routes
// ============================================================================

/**
 * GET /api/companies
 * List all companies for the tenant
 */
companiesRoutes.get('/', async (c) => {
  const query = listQuerySchema.parse(c.req.query());
  const { tenant_id } = getTenantFilter(c);
  const supabase = getAdminClient();
  
  let dbQuery = supabase
    .from('companies')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenant_id)
    .order(query.sortBy, { ascending: query.sortOrder === 'asc' })
    .range((query.page - 1) * query.limit, query.page * query.limit - 1);
  
  if (query.search) {
    const escapedSearch = escapeSearchQuery(query.search);
    dbQuery = dbQuery.or(`name.ilike.%${escapedSearch}%,email.ilike.%${escapedSearch}%`);
  }
  
  if (query.industry) {
    dbQuery = dbQuery.eq('industry', query.industry);
  }
  
  const { data, error, count } = await dbQuery;
  
  if (error) throw error;
  
  return paginated(c, data || [], query.page, query.limit, count || 0);
});

/**
 * GET /api/companies/:id
 * Get a single company with contacts count
 */
companiesRoutes.get('/:id', async (c) => {
  const { id } = c.req.param();
  const { tenant_id } = getTenantFilter(c);
  const supabase = getAdminClient();
  
  const { data, error } = await supabase
    .from('companies')
    .select('*, contacts(count)')
    .eq('id', id)
    .eq('tenant_id', tenant_id)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      return errors.notFound(c, 'Company');
    }
    throw error;
  }
  
  return success(c, data);
});

/**
 * POST /api/companies
 * Create a new company
 */
companiesRoutes.post('/', async (c) => {
  const body = await c.req.json();
  const parsed = createCompanySchema.safeParse(body);
  
  if (!parsed.success) {
    return errors.validationError(c, parsed.error.errors);
  }
  
  const { tenant_id } = getTenantFilter(c);
  const user = c.get('user');
  const supabase = getAdminClient();
  
  const { data, error } = await supabase
    .from('companies')
    .insert({
      tenant_id,
      name: parsed.data.name,
      website: parsed.data.website,
      industry: parsed.data.industry,
      size: parsed.data.size,
      annual_revenue: parsed.data.annualRevenue,
      description: parsed.data.description,
      address: parsed.data.address,
      phone: parsed.data.phone,
      email: parsed.data.email,
      tags: parsed.data.tags,
      custom_fields: parsed.data.customFields,
      created_by: user.id,
    })
    .select()
    .single();
  
  if (error) throw error;
  
  return created(c, data);
});

/**
 * PATCH /api/companies/:id
 * Update a company
 */
companiesRoutes.patch('/:id', async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json();
  const parsed = updateCompanySchema.safeParse(body);
  
  if (!parsed.success) {
    return errors.validationError(c, parsed.error.errors);
  }
  
  const { tenant_id } = getTenantFilter(c);
  const supabase = getAdminClient();
  
  const updates: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.website !== undefined) updates.website = parsed.data.website;
  if (parsed.data.industry !== undefined) updates.industry = parsed.data.industry;
  if (parsed.data.size !== undefined) updates.size = parsed.data.size;
  if (parsed.data.annualRevenue !== undefined) updates.annual_revenue = parsed.data.annualRevenue;
  if (parsed.data.description !== undefined) updates.description = parsed.data.description;
  if (parsed.data.address !== undefined) updates.address = parsed.data.address;
  if (parsed.data.phone !== undefined) updates.phone = parsed.data.phone;
  if (parsed.data.email !== undefined) updates.email = parsed.data.email;
  if (parsed.data.tags !== undefined) updates.tags = parsed.data.tags;
  if (parsed.data.customFields !== undefined) updates.custom_fields = parsed.data.customFields;
  updates.updated_at = new Date().toISOString();
  
  const { data, error } = await supabase
    .from('companies')
    .update(updates)
    .eq('id', id)
    .eq('tenant_id', tenant_id)
    .select()
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      return errors.notFound(c, 'Company');
    }
    throw error;
  }
  
  return success(c, data);
});

/**
 * DELETE /api/companies/:id
 * Delete a company
 */
companiesRoutes.delete('/:id', async (c) => {
  const { id } = c.req.param();
  const { tenant_id } = getTenantFilter(c);
  const supabase = getAdminClient();
  
  const { error } = await supabase
    .from('companies')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenant_id);
  
  if (error) throw error;
  
  return noContent(c);
});

/**
 * GET /api/companies/:id/contacts
 * Get all contacts for a company
 */
companiesRoutes.get('/:id/contacts', async (c) => {
  const { id } = c.req.param();
  const { tenant_id } = getTenantFilter(c);
  const supabase = getAdminClient();
  
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('company_id', id)
    .eq('tenant_id', tenant_id)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  
  return success(c, data || []);
});


