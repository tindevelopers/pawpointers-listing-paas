/**
 * Types for Reviews SDK
 */

export interface Review {
  id: string;
  listingId: string;
  userId?: string;
  authorName: string;
  authorAvatar?: string;
  rating: number; // 1-5
  comment?: string;
  photos?: ReviewPhoto[];
  helpfulCount: number;
  ownerResponse?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

export interface ReviewPhoto {
  id: string;
  url: string;
  alt?: string;
  displayOrder: number;
}

export interface ReviewFilters {
  minRating?: number;
  maxRating?: number;
  hasPhotos?: boolean;
  hasComments?: boolean;
  sortBy?: 'date' | 'rating' | 'helpful';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface ReviewFormData {
  listingId: string;
  rating: number;
  comment?: string;
  photos?: File[];
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

