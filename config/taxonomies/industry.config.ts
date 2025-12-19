import type { TaxonomyConfig } from '@listing-platform/config';

/**
 * Industry Directory Configuration
 * For profession-based listings (lawyers, doctors, contractors, etc.)
 * Primary navigation: /[profession]/[slug]
 */
export const industryConfig: TaxonomyConfig = {
  taxonomyType: 'industry',
  name: 'Industry Directory',
  description: 'Professional services directory organized by profession',
  
  primaryTaxonomy: {
    name: 'profession',
    slug: 'profession',
    hierarchical: true, // Legal Services > Lawyers > Family Law
    urlPattern: '/{profession}/{slug}',
    importance: 'primary',
    labels: {
      singular: 'Profession',
      plural: 'Professions',
      all: 'All Professionals',
    },
    showInNavigation: true,
    showInFilters: true,
  },
  
  secondaryTaxonomies: [
    {
      name: 'location',
      slug: 'location',
      hierarchical: true, // Country > State > City
      urlPattern: '/in/{location}',
      importance: 'medium',
      labels: {
        singular: 'Location',
        plural: 'Locations',
        all: 'All Locations',
      },
      showInNavigation: false,
      showInFilters: true,
    },
    {
      name: 'specialization',
      slug: 'specialization',
      hierarchical: false,
      urlPattern: '/specializing-in/{specialization}',
      importance: 'medium',
      labels: {
        singular: 'Specialization',
        plural: 'Specializations',
      },
      showInNavigation: false,
      showInFilters: true,
    },
  ],
  
  listingFields: [
    {
      key: 'business_name',
      label: 'Business Name',
      type: 'text',
      required: true,
      searchable: true,
      displayInCard: true,
      placeholder: 'Enter your business or practice name',
      helpText: 'The official name of your business or practice',
    },
    {
      key: 'tagline',
      label: 'Tagline',
      type: 'text',
      required: false,
      searchable: true,
      displayInCard: true,
      placeholder: 'A brief description of your services',
      helpText: 'A short, compelling description (max 100 characters)',
      validation: {
        max: 100,
        message: 'Tagline must be 100 characters or less',
      },
    },
    {
      key: 'years_experience',
      label: 'Years of Experience',
      type: 'number',
      required: false,
      filterable: true,
      displayInCard: true,
      placeholder: '0',
      helpText: 'Total years of professional experience',
      validation: {
        min: 0,
        max: 100,
      },
    },
    {
      key: 'certifications',
      label: 'Certifications',
      type: 'multiselect',
      required: false,
      filterable: true,
      displayInCard: false,
      helpText: 'Professional certifications and licenses',
    },
    {
      key: 'education',
      label: 'Education',
      type: 'rich_text',
      required: false,
      searchable: false,
      helpText: 'Educational background and degrees',
    },
    {
      key: 'languages',
      label: 'Languages Spoken',
      type: 'multiselect',
      required: false,
      filterable: true,
      displayInCard: true,
      options: [
        { value: 'en', label: 'English' },
        { value: 'es', label: 'Spanish' },
        { value: 'fr', label: 'French' },
        { value: 'de', label: 'German' },
        { value: 'zh', label: 'Chinese' },
        { value: 'ar', label: 'Arabic' },
      ],
    },
    {
      key: 'service_areas',
      label: 'Service Areas',
      type: 'location_multi',
      required: false,
      filterable: true,
      helpText: 'Geographic areas you serve',
    },
    {
      key: 'pricing_type',
      label: 'Pricing Type',
      type: 'select',
      required: false,
      filterable: true,
      options: [
        { value: 'hourly', label: 'Hourly Rate' },
        { value: 'flat_fee', label: 'Flat Fee' },
        { value: 'consultation', label: 'Consultation Fee' },
        { value: 'free_consultation', label: 'Free Consultation' },
        { value: 'negotiable', label: 'Negotiable' },
      ],
    },
    {
      key: 'hourly_rate',
      label: 'Hourly Rate',
      type: 'number',
      required: false,
      filterable: true,
      displayInCard: true,
      placeholder: '0',
      helpText: 'Your hourly rate (if applicable)',
    },
    {
      key: 'phone',
      label: 'Phone Number',
      type: 'phone',
      required: false,
      placeholder: '+1 (555) 123-4567',
    },
    {
      key: 'email',
      label: 'Email',
      type: 'email',
      required: false,
      placeholder: 'contact@example.com',
    },
    {
      key: 'website',
      label: 'Website',
      type: 'url',
      required: false,
      placeholder: 'https://example.com',
    },
    {
      key: 'availability',
      label: 'Availability',
      type: 'select',
      required: false,
      filterable: true,
      options: [
        { value: 'immediate', label: 'Immediate' },
        { value: 'within_week', label: 'Within a Week' },
        { value: 'within_month', label: 'Within a Month' },
        { value: 'not_accepting', label: 'Not Accepting New Clients' },
      ],
    },
  ],
  
  enabledFeatures: {
    reviews: true,
    booking: false, // Most professional services don't need booking
    maps: true, // Show office location and service areas
    inquiry: true,
    comparison: true,
    virtualTour: false,
    messaging: true,
    savedListings: true,
    alerts: true,
  },
  
  seoTemplate: {
    titlePattern: '{business_name} - {profession} | {site_name}',
    descriptionPattern: 'Find {business_name}, a professional {profession} with {years_experience} years of experience. {tagline}',
    schemaType: 'ProfessionalService',
    additionalMeta: {
      'og:type': 'business.business',
    },
  },
  
  searchConfig: {
    defaultSort: 'relevance',
    allowedSorts: ['relevance', 'rating', 'experience', 'price'],
    resultsPerPage: 20,
    enableFuzzySearch: true,
  },
};

export default industryConfig;

