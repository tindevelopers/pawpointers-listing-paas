import type { TaxonomyConfig } from '@listing-platform/config';

/**
 * Hybrid Platform Configuration
 * Combines both profession and location taxonomies
 * Useful for: Tourism activities, Events, Services by location
 * Primary navigation: /[country]/[region]/[city]/[category]/[slug]
 * Alternative: /[category]/[location]/[slug]
 */
export const hybridConfig: TaxonomyConfig = {
  taxonomyType: 'hybrid',
  name: 'Hybrid Platform',
  description: 'Services and activities organized by both category and location',
  
  primaryTaxonomy: {
    name: 'category',
    slug: 'category',
    hierarchical: true, // Tourism > Activities > Water Sports
    urlPattern: '/{category}/{city}/{slug}',
    importance: 'primary',
    labels: {
      singular: 'Category',
      plural: 'Categories',
      all: 'All Categories',
    },
    showInNavigation: true,
    showInFilters: true,
  },
  
  secondaryTaxonomies: [
    {
      name: 'location',
      slug: 'location',
      hierarchical: true, // Country > Region > City
      urlPattern: '/in/{location}',
      importance: 'high', // Equally important as primary
      labels: {
        singular: 'Location',
        plural: 'Locations',
        all: 'All Locations',
      },
      showInNavigation: true,
      showInFilters: true,
    },
    {
      name: 'tags',
      slug: 'tags',
      hierarchical: false,
      urlPattern: '/tagged/{tag}',
      importance: 'medium',
      labels: {
        singular: 'Tag',
        plural: 'Tags',
      },
      showInNavigation: false,
      showInFilters: true,
    },
  ],
  
  listingFields: [
    // Activity/Event Details
    {
      key: 'activity_name',
      label: 'Activity Name',
      type: 'text',
      required: true,
      searchable: true,
      displayInCard: true,
      placeholder: 'Enter activity or service name',
    },
    {
      key: 'duration',
      label: 'Duration',
      type: 'text',
      required: false,
      filterable: true,
      displayInCard: true,
      placeholder: '2 hours',
      helpText: 'How long does this activity take?',
    },
    {
      key: 'duration_minutes',
      label: 'Duration (minutes)',
      type: 'number',
      required: false,
      filterable: true,
      placeholder: '120',
      helpText: 'For programmatic filtering',
    },
    {
      key: 'difficulty_level',
      label: 'Difficulty Level',
      type: 'select',
      required: false,
      filterable: true,
      displayInCard: true,
      options: [
        { value: 'easy', label: 'Easy' },
        { value: 'moderate', label: 'Moderate' },
        { value: 'challenging', label: 'Challenging' },
        { value: 'expert', label: 'Expert' },
      ],
    },
    {
      key: 'group_size',
      label: 'Maximum Group Size',
      type: 'number',
      required: false,
      filterable: true,
      placeholder: '10',
      validation: {
        min: 1,
        max: 1000,
      },
    },
    {
      key: 'min_age',
      label: 'Minimum Age',
      type: 'number',
      required: false,
      filterable: true,
      placeholder: '0',
      helpText: 'Minimum age requirement',
      validation: {
        min: 0,
        max: 100,
      },
    },
    {
      key: 'age_range',
      label: 'Suitable Age Range',
      type: 'select',
      required: false,
      filterable: true,
      options: [
        { value: 'children', label: 'Children (0-12)' },
        { value: 'teens', label: 'Teens (13-17)' },
        { value: 'adults', label: 'Adults (18+)' },
        { value: 'seniors', label: 'Seniors (65+)' },
        { value: 'all_ages', label: 'All Ages' },
      ],
    },
    {
      key: 'accessibility',
      label: 'Accessibility',
      type: 'multiselect',
      required: false,
      filterable: true,
      options: [
        { value: 'wheelchair', label: 'Wheelchair Accessible' },
        { value: 'hearing_impaired', label: 'Hearing Impaired Friendly' },
        { value: 'vision_impaired', label: 'Vision Impaired Friendly' },
        { value: 'family_friendly', label: 'Family Friendly' },
        { value: 'pet_friendly', label: 'Pet Friendly' },
      ],
    },
    // Inclusions
    {
      key: 'includes',
      label: 'What\'s Included',
      type: 'multiselect',
      required: false,
      displayInCard: false,
      options: [
        { value: 'equipment', label: 'Equipment' },
        { value: 'instructor', label: 'Instructor/Guide' },
        { value: 'meals', label: 'Meals' },
        { value: 'drinks', label: 'Drinks' },
        { value: 'transportation', label: 'Transportation' },
        { value: 'insurance', label: 'Insurance' },
        { value: 'photos', label: 'Photos/Videos' },
      ],
    },
    {
      key: 'bring_items',
      label: 'What to Bring',
      type: 'rich_text',
      required: false,
      helpText: 'List items participants should bring',
    },
    // Timing & Availability
    {
      key: 'available_days',
      label: 'Available Days',
      type: 'multiselect',
      required: false,
      filterable: true,
      options: [
        { value: 'monday', label: 'Monday' },
        { value: 'tuesday', label: 'Tuesday' },
        { value: 'wednesday', label: 'Wednesday' },
        { value: 'thursday', label: 'Thursday' },
        { value: 'friday', label: 'Friday' },
        { value: 'saturday', label: 'Saturday' },
        { value: 'sunday', label: 'Sunday' },
      ],
    },
    {
      key: 'seasonal_availability',
      label: 'Seasonal Availability',
      type: 'select',
      required: false,
      filterable: true,
      options: [
        { value: 'year_round', label: 'Year Round' },
        { value: 'spring', label: 'Spring Only' },
        { value: 'summer', label: 'Summer Only' },
        { value: 'fall', label: 'Fall Only' },
        { value: 'winter', label: 'Winter Only' },
      ],
    },
    {
      key: 'cancellation_policy',
      label: 'Cancellation Policy',
      type: 'select',
      required: false,
      options: [
        { value: 'flexible', label: 'Flexible (24h notice)' },
        { value: 'moderate', label: 'Moderate (48h notice)' },
        { value: 'strict', label: 'Strict (7 days notice)' },
        { value: 'non_refundable', label: 'Non-refundable' },
      ],
    },
    // Provider Information
    {
      key: 'provider_name',
      label: 'Provider/Operator Name',
      type: 'text',
      required: false,
      searchable: true,
      placeholder: 'Company or individual name',
    },
    {
      key: 'provider_license',
      label: 'License/Certification Number',
      type: 'text',
      required: false,
      helpText: 'Official license or certification',
    },
    {
      key: 'languages_offered',
      label: 'Languages Offered',
      type: 'multiselect',
      required: false,
      filterable: true,
      options: [
        { value: 'en', label: 'English' },
        { value: 'es', label: 'Spanish' },
        { value: 'fr', label: 'French' },
        { value: 'de', label: 'German' },
        { value: 'it', label: 'Italian' },
        { value: 'zh', label: 'Chinese' },
        { value: 'ja', label: 'Japanese' },
        { value: 'ar', label: 'Arabic' },
      ],
    },
    // Contact
    {
      key: 'contact_phone',
      label: 'Contact Phone',
      type: 'phone',
      required: false,
      placeholder: '+1 (555) 123-4567',
    },
    {
      key: 'contact_email',
      label: 'Contact Email',
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
      key: 'meeting_point',
      label: 'Meeting Point',
      type: 'text',
      required: false,
      helpText: 'Where participants should meet',
    },
  ],
  
  enabledFeatures: {
    reviews: true,
    booking: true, // Essential for activities/events
    maps: true, // Show activity location and meeting points
    inquiry: true,
    comparison: true,
    virtualTour: false, // Not typically needed for activities
    messaging: true,
    savedListings: true,
    alerts: true,
  },
  
  seoTemplate: {
    titlePattern: '{activity_name} in {city} - {category} | {site_name}',
    descriptionPattern: '{activity_name} in {city}. {duration} {category} activity. {excerpt}',
    schemaType: 'TouristAttraction', // or 'Event' depending on use case
    additionalMeta: {
      'og:type': 'activity',
    },
  },
  
  searchConfig: {
    defaultSort: 'relevance',
    allowedSorts: ['relevance', 'rating', 'price', 'duration', 'date'],
    resultsPerPage: 20,
    enableFuzzySearch: true,
  },
};

export default hybridConfig;

