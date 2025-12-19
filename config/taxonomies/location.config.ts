import type { TaxonomyConfig } from '@listing-platform/config';

/**
 * Location-based Platform Configuration
 * For real estate, tourism, events organized by geography
 * Primary navigation: /[country]/[region]/[city]/[slug]
 */
export const locationConfig: TaxonomyConfig = {
  taxonomyType: 'location',
  name: 'Location-based Platform',
  description: 'Properties and places organized by geographic location',
  
  primaryTaxonomy: {
    name: 'geography',
    slug: 'geography',
    hierarchical: true, // Country > Region > City
    urlPattern: '/{country}/{region}/{city}/{slug}',
    levels: ['country', 'region', 'city'],
    importance: 'primary',
    labels: {
      singular: 'Location',
      plural: 'Locations',
      all: 'All Locations',
    },
    showInNavigation: true,
    showInFilters: true,
  },
  
  secondaryTaxonomies: [
    {
      name: 'property_type',
      slug: 'type',
      hierarchical: true, // Residential > House > Single Family
      urlPattern: '/type/{type}',
      importance: 'high',
      labels: {
        singular: 'Property Type',
        plural: 'Property Types',
        all: 'All Types',
      },
      showInNavigation: true,
      showInFilters: true,
    },
    {
      name: 'amenities',
      slug: 'amenities',
      hierarchical: false,
      urlPattern: '/amenities/{amenity}',
      importance: 'medium',
      labels: {
        singular: 'Amenity',
        plural: 'Amenities',
      },
      showInNavigation: false,
      showInFilters: true,
    },
  ],
  
  listingFields: [
    // Property Details
    {
      key: 'bedrooms',
      label: 'Bedrooms',
      type: 'number',
      required: false,
      filterable: true,
      displayInCard: true,
      placeholder: '0',
      validation: {
        min: 0,
        max: 50,
      },
    },
    {
      key: 'bathrooms',
      label: 'Bathrooms',
      type: 'number',
      required: false,
      filterable: true,
      displayInCard: true,
      placeholder: '0',
      validation: {
        min: 0,
        max: 50,
      },
    },
    {
      key: 'square_feet',
      label: 'Square Feet',
      type: 'number',
      required: false,
      filterable: true,
      displayInCard: true,
      placeholder: '0',
      helpText: 'Total living area in square feet',
    },
    {
      key: 'square_meters',
      label: 'Square Meters',
      type: 'number',
      required: false,
      filterable: true,
      displayInCard: false,
      placeholder: '0',
      helpText: 'Total living area in square meters',
    },
    {
      key: 'lot_size',
      label: 'Lot Size',
      type: 'number',
      required: false,
      filterable: true,
      placeholder: '0',
      helpText: 'Lot size in square feet',
    },
    {
      key: 'year_built',
      label: 'Year Built',
      type: 'number',
      required: false,
      filterable: true,
      displayInCard: true,
      placeholder: new Date().getFullYear().toString(),
      validation: {
        min: 1800,
        max: new Date().getFullYear() + 2,
      },
    },
    {
      key: 'parking',
      label: 'Parking',
      type: 'select',
      required: false,
      filterable: true,
      displayInCard: true,
      options: [
        { value: 'none', label: 'None' },
        { value: 'street', label: 'Street Parking' },
        { value: 'garage_1', label: '1 Car Garage' },
        { value: 'garage_2', label: '2 Car Garage' },
        { value: 'garage_3', label: '3+ Car Garage' },
        { value: 'covered', label: 'Covered Parking' },
      ],
    },
    {
      key: 'amenities',
      label: 'Amenities',
      type: 'multiselect',
      required: false,
      filterable: true,
      options: [
        { value: 'pool', label: 'Pool' },
        { value: 'gym', label: 'Gym/Fitness Center' },
        { value: 'spa', label: 'Spa' },
        { value: 'doorman', label: 'Doorman' },
        { value: 'concierge', label: 'Concierge' },
        { value: 'elevator', label: 'Elevator' },
        { value: 'balcony', label: 'Balcony/Terrace' },
        { value: 'fireplace', label: 'Fireplace' },
        { value: 'ac', label: 'Air Conditioning' },
        { value: 'heating', label: 'Central Heating' },
        { value: 'laundry', label: 'In-unit Laundry' },
        { value: 'dishwasher', label: 'Dishwasher' },
        { value: 'pets', label: 'Pet Friendly' },
      ],
    },
    {
      key: 'condition',
      label: 'Condition',
      type: 'select',
      required: false,
      filterable: true,
      options: [
        { value: 'new', label: 'New Construction' },
        { value: 'excellent', label: 'Excellent' },
        { value: 'good', label: 'Good' },
        { value: 'fair', label: 'Fair' },
        { value: 'needs_work', label: 'Needs Work' },
      ],
    },
    {
      key: 'furnished',
      label: 'Furnished',
      type: 'select',
      required: false,
      filterable: true,
      options: [
        { value: 'yes', label: 'Fully Furnished' },
        { value: 'partial', label: 'Partially Furnished' },
        { value: 'no', label: 'Unfurnished' },
      ],
    },
    // Financial
    {
      key: 'hoa_fee',
      label: 'HOA Fee (Monthly)',
      type: 'number',
      required: false,
      placeholder: '0',
      helpText: 'Monthly homeowners association fee',
    },
    {
      key: 'property_tax',
      label: 'Annual Property Tax',
      type: 'number',
      required: false,
      placeholder: '0',
    },
    // Tourism/Rental specific
    {
      key: 'check_in_time',
      label: 'Check-in Time',
      type: 'text',
      required: false,
      placeholder: '3:00 PM',
      helpText: 'For vacation rentals and hotels',
    },
    {
      key: 'check_out_time',
      label: 'Check-out Time',
      type: 'text',
      required: false,
      placeholder: '11:00 AM',
      helpText: 'For vacation rentals and hotels',
    },
    {
      key: 'minimum_stay',
      label: 'Minimum Stay (nights)',
      type: 'number',
      required: false,
      placeholder: '1',
      validation: {
        min: 1,
        max: 365,
      },
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
  ],
  
  enabledFeatures: {
    reviews: true,
    booking: true, // For tourism, vacation rentals
    maps: true, // Show property location + nearby amenities
    inquiry: true,
    comparison: true,
    virtualTour: true, // 3D tours for properties
    messaging: true,
    savedListings: true,
    alerts: true,
  },
  
  seoTemplate: {
    titlePattern: '{title} - {city}, {region} | {site_name}',
    descriptionPattern: '{bedrooms} bed, {bathrooms} bath property in {city}, {region}. {excerpt}',
    schemaType: 'Residence',
    additionalMeta: {
      'og:type': 'product',
    },
  },
  
  searchConfig: {
    defaultSort: 'relevance',
    allowedSorts: ['relevance', 'price_asc', 'price_desc', 'date', 'size'],
    resultsPerPage: 24, // Grid layout works better with multiples of 3/4
    enableFuzzySearch: true,
  },
};

export default locationConfig;

