/**
 * Schema.org Structured Data Utilities
 */

import type { 
  ListingSchemaData, 
  BreadcrumbItem, 
  StructuredDataItem 
} from '../types';

/**
 * Generate LocalBusiness schema
 */
export function generateLocalBusinessSchema(
  data: ListingSchemaData
): StructuredDataItem {
  const schema: StructuredDataItem = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': data.url,
    name: data.title,
    url: data.url,
  };
  
  if (data.description) {
    schema.description = data.description;
  }
  
  if (data.images && data.images.length > 0) {
    schema.image = data.images;
  }
  
  if (data.location) {
    schema.address = {
      '@type': 'PostalAddress',
      streetAddress: data.location.address,
      addressLocality: data.location.city,
      addressRegion: data.location.region,
      addressCountry: data.location.country,
      postalCode: data.location.postalCode,
    };
    
    if (data.location.lat && data.location.lng) {
      schema.geo = {
        '@type': 'GeoCoordinates',
        latitude: data.location.lat,
        longitude: data.location.lng,
      };
    }
  }
  
  if (data.contact) {
    if (data.contact.phone) schema.telephone = data.contact.phone;
    if (data.contact.email) schema.email = data.contact.email;
  }
  
  if (data.rating && data.rating.count > 0) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: data.rating.average,
      reviewCount: data.rating.count,
    };
  }
  
  if (data.openingHours) {
    schema.openingHours = data.openingHours;
  }
  
  return schema;
}

/**
 * Generate ProfessionalService schema
 */
export function generateProfessionalServiceSchema(
  data: ListingSchemaData
): StructuredDataItem {
  const schema = generateLocalBusinessSchema(data);
  schema['@type'] = 'ProfessionalService';
  
  // Add professional-specific fields
  if (data.customFields) {
    if (data.customFields.certifications) {
      schema.hasCredential = data.customFields.certifications;
    }
    if (data.customFields.languages) {
      schema.knowsLanguage = data.customFields.languages;
    }
  }
  
  return schema;
}

/**
 * Generate Product schema (for e-commerce listings)
 */
export function generateProductSchema(
  data: ListingSchemaData
): StructuredDataItem {
  const schema: StructuredDataItem = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': data.url,
    name: data.title,
    url: data.url,
  };
  
  if (data.description) {
    schema.description = data.description;
  }
  
  if (data.images && data.images.length > 0) {
    schema.image = data.images;
  }
  
  if (data.price !== undefined) {
    schema.offers = {
      '@type': 'Offer',
      price: data.price,
      priceCurrency: data.currency || 'USD',
      availability: data.availability 
        ? `https://schema.org/${data.availability}`
        : 'https://schema.org/InStock',
    };
  }
  
  if (data.rating && data.rating.count > 0) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: data.rating.average,
      reviewCount: data.rating.count,
    };
  }
  
  return schema;
}

/**
 * Generate RealEstateListing schema
 */
export function generateRealEstateListingSchema(
  data: ListingSchemaData
): StructuredDataItem {
  const schema: StructuredDataItem = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    '@id': data.url,
    name: data.title,
    url: data.url,
  };
  
  if (data.description) {
    schema.description = data.description;
  }
  
  if (data.images && data.images.length > 0) {
    schema.image = data.images;
  }
  
  if (data.location) {
    schema.address = {
      '@type': 'PostalAddress',
      streetAddress: data.location.address,
      addressLocality: data.location.city,
      addressRegion: data.location.region,
      addressCountry: data.location.country,
      postalCode: data.location.postalCode,
    };
    
    if (data.location.lat && data.location.lng) {
      schema.geo = {
        '@type': 'GeoCoordinates',
        latitude: data.location.lat,
        longitude: data.location.lng,
      };
    }
  }
  
  // Real estate specific fields
  if (data.customFields) {
    const cf = data.customFields;
    
    if (cf.bedrooms) schema.numberOfBedrooms = cf.bedrooms;
    if (cf.bathrooms) schema.numberOfBathroomsTotal = cf.bathrooms;
    if (cf.sqft || cf.squareFootage) {
      schema.floorSize = {
        '@type': 'QuantitativeValue',
        value: cf.sqft || cf.squareFootage,
        unitCode: 'FTK',
      };
    }
    if (cf.yearBuilt) schema.yearBuilt = cf.yearBuilt;
    if (cf.propertyType) schema.propertyType = cf.propertyType;
  }
  
  if (data.price !== undefined) {
    schema.offers = {
      '@type': 'Offer',
      price: data.price,
      priceCurrency: data.currency || 'USD',
    };
  }
  
  return schema;
}

/**
 * Generate Event schema
 */
export function generateEventSchema(
  data: ListingSchemaData & {
    startDate?: string;
    endDate?: string;
    venue?: string;
    organizer?: string;
  }
): StructuredDataItem {
  const schema: StructuredDataItem = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    '@id': data.url,
    name: data.title,
    url: data.url,
  };
  
  if (data.description) {
    schema.description = data.description;
  }
  
  if (data.images && data.images.length > 0) {
    schema.image = data.images;
  }
  
  if (data.startDate) {
    schema.startDate = data.startDate;
  }
  
  if (data.endDate) {
    schema.endDate = data.endDate;
  }
  
  if (data.location) {
    schema.location = {
      '@type': 'Place',
      name: data.venue || data.location.address,
      address: {
        '@type': 'PostalAddress',
        streetAddress: data.location.address,
        addressLocality: data.location.city,
        addressRegion: data.location.region,
        addressCountry: data.location.country,
      },
    };
    
    if (data.location.lat && data.location.lng) {
      schema.location.geo = {
        '@type': 'GeoCoordinates',
        latitude: data.location.lat,
        longitude: data.location.lng,
      };
    }
  }
  
  if (data.price !== undefined) {
    schema.offers = {
      '@type': 'Offer',
      price: data.price,
      priceCurrency: data.currency || 'USD',
      availability: data.availability 
        ? `https://schema.org/${data.availability}`
        : 'https://schema.org/InStock',
    };
  }
  
  return schema;
}

/**
 * Generate BreadcrumbList schema
 */
export function generateBreadcrumbSchema(
  items: BreadcrumbItem[]
): StructuredDataItem {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/**
 * Generate Organization schema
 */
export function generateOrganizationSchema(data: {
  name: string;
  url: string;
  logo?: string;
  description?: string;
  contactEmail?: string;
  contactPhone?: string;
  socialProfiles?: string[];
  address?: {
    street?: string;
    city?: string;
    region?: string;
    country?: string;
    postalCode?: string;
  };
}): StructuredDataItem {
  const schema: StructuredDataItem = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: data.name,
    url: data.url,
  };
  
  if (data.logo) {
    schema.logo = data.logo;
  }
  
  if (data.description) {
    schema.description = data.description;
  }
  
  if (data.contactEmail || data.contactPhone) {
    schema.contactPoint = {
      '@type': 'ContactPoint',
      email: data.contactEmail,
      telephone: data.contactPhone,
      contactType: 'customer service',
    };
  }
  
  if (data.socialProfiles && data.socialProfiles.length > 0) {
    schema.sameAs = data.socialProfiles;
  }
  
  if (data.address) {
    schema.address = {
      '@type': 'PostalAddress',
      streetAddress: data.address.street,
      addressLocality: data.address.city,
      addressRegion: data.address.region,
      addressCountry: data.address.country,
      postalCode: data.address.postalCode,
    };
  }
  
  return schema;
}

/**
 * Generate WebSite schema with search action
 */
export function generateWebSiteSchema(data: {
  name: string;
  url: string;
  description?: string;
  searchUrl?: string;
}): StructuredDataItem {
  const schema: StructuredDataItem = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: data.name,
    url: data.url,
  };
  
  if (data.description) {
    schema.description = data.description;
  }
  
  if (data.searchUrl) {
    schema.potentialAction = {
      '@type': 'SearchAction',
      target: `${data.searchUrl}?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    };
  }
  
  return schema;
}

/**
 * Generate schema based on listing type
 */
export function generateListingSchema(
  data: ListingSchemaData,
  schemaType: string
): StructuredDataItem {
  switch (schemaType) {
    case 'ProfessionalService':
    case 'LocalBusiness':
      return generateProfessionalServiceSchema(data);
    case 'Product':
      return generateProductSchema(data);
    case 'RealEstateListing':
    case 'Accommodation':
      return generateRealEstateListingSchema(data);
    case 'Event':
      return generateEventSchema(data);
    default:
      return generateLocalBusinessSchema(data);
  }
}

