import { ListingPromptInput } from './types';

function truncate(text: string, max = 280): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 3)}...`;
}

function clean(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export function buildPromptFromListing(listing: ListingPromptInput, basePrompt?: string): string {
  const parts: string[] = [];

  if (basePrompt) {
    parts.push(basePrompt.trim());
  }

  const title = clean(listing.title);
  if (title) {
    parts.push(`Title: ${title}`);
  }

  const seoTitle = clean(listing.seoTitle);
  if (!title && seoTitle) {
    parts.push(`Title: ${seoTitle}`);
  }

  const description =
    clean(listing.description) ||
    clean(listing.seoDescription) ||
    clean(listing.excerpt);
  if (description) {
    parts.push(`Description: ${truncate(description, 400)}`);
  }

  if (listing.taxonomy?.length) {
    parts.push(`Categories: ${listing.taxonomy.join(', ')}`);
  }

  const locationSegments: string[] = [];
  if (listing.location?.city) locationSegments.push(listing.location.city);
  if (listing.location?.region) locationSegments.push(listing.location.region);
  if (listing.location?.country) locationSegments.push(listing.location.country);
  if (locationSegments.length) {
    parts.push(`Location: ${locationSegments.join(', ')}`);
  }

  parts.push('Style: realistic, high quality, well-lit, professional photo');

  return parts.join('. ');
}

