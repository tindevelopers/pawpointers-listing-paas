/**
 * Examples showing all 4 customization levels for Reviews SDK
 * This file demonstrates how to use the Reviews SDK at different levels of customization
 */

import React from 'react';

// ============================================
// LEVEL 1: Use As-Is (Quick Start)
// ============================================

import { ReviewsList, ReviewForm } from '@listing-platform/reviews';

export function Level1Example() {
  return (
    <div>
      <h2>Level 1: Use Components As-Is</h2>
      <ReviewsList listingId="123" />
      <ReviewForm listingId="123" />
    </div>
  );
}

// ============================================
// LEVEL 2: Customize with Props
// ============================================

export function Level2Example() {
  return (
    <div>
      <h2>Level 2: Customize with Props</h2>
      
      {/* Compact variant */}
      <ReviewsList 
        listingId="123"
        variant="compact"
        className="my-custom-class"
      />
      
      {/* With filters */}
      <ReviewsList 
        listingId="123"
        filters={{
          minRating: 4,
          sortBy: 'date',
          sortOrder: 'desc',
          limit: 10,
        }}
      />
      
      {/* Featured variant */}
      <ReviewsList 
        listingId="123"
        variant="featured"
      />
      
      {/* Custom form */}
      <ReviewForm 
        listingId="123"
        variant="compact"
        onSubmit={(reviewId) => {
          console.log('Review submitted:', reviewId);
        }}
        onCancel={() => {
          console.log('Form cancelled');
        }}
      />
    </div>
  );
}

// ============================================
// LEVEL 3: Use Headless + Custom Styling
// ============================================

import { ReviewsListHeadless } from '@listing-platform/reviews/headless';
import type { Review } from '@listing-platform/reviews/types';

export function Level3Example() {
  return (
    <div>
      <h2>Level 3: Headless Components + Custom Styling</h2>
      
      <ReviewsListHeadless
        listingId="123"
        renderReview={(review: Review) => (
          <div className="my-custom-card bg-gradient-to-r from-blue-500 to-purple-500 p-6 rounded-xl mb-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                {review.authorName[0]}
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">{review.authorName}</h3>
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span
                      key={i}
                      className={i < review.rating ? 'text-yellow-300' : 'text-gray-400'}
                    >
                      ★
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <p className="text-white">{review.comment}</p>
            {review.photos && review.photos.length > 0 && (
              <div className="mt-4 grid grid-cols-3 gap-2">
                {review.photos.map((photo) => (
                  <img
                    key={photo.id}
                    src={photo.url}
                    alt={photo.alt}
                    className="rounded-lg object-cover h-24 w-full"
                  />
                ))}
              </div>
            )}
          </div>
        )}
        renderEmpty={() => (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📝</div>
            <p className="text-xl font-medium mb-2">No reviews yet</p>
            <p className="text-gray-500">Be the first to share your experience!</p>
          </div>
        )}
        renderLoading={() => (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}
        renderError={(error) => (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 font-medium">Error loading reviews</p>
            <p className="text-red-600 text-sm mt-1">{error.message}</p>
          </div>
        )}
      />
    </div>
  );
}

// ============================================
// LEVEL 4: Use Hooks Only + Build Everything
// ============================================

import { useReviews, useReviewSubmit } from '@listing-platform/reviews/hooks';

export function Level4Example() {
  const { reviews, isLoading, error, refetch } = useReviews('123', {
    minRating: 4,
    sortBy: 'date',
  });
  
  const { submitReview, isSubmitting } = useReviewSubmit();
  
  const handleSubmit = async () => {
    const review = await submitReview({
      listingId: '123',
      rating: 5,
      comment: 'Amazing service!',
    });
    
    if (review) {
      refetch(); // Refresh the list
    }
  };
  
  if (isLoading) {
    return <div>Loading...</div>;
  }
  
  if (error) {
    return <div>Error: {error.message}</div>;
  }
  
  return (
    <div>
      <h2>Level 4: Hooks Only + Complete Custom UI</h2>
      
      <div className="space-y-4">
        {reviews.map((review) => (
          <div
            key={review.id}
            className="border border-gray-200 rounded-lg p-4 shadow-sm"
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-semibold">{review.authorName}</h3>
                <p className="text-sm text-gray-500">
                  {new Date(review.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span
                    key={i}
                    className={i < review.rating ? 'text-yellow-400' : 'text-gray-300'}
                  >
                    ⭐
                  </span>
                ))}
              </div>
            </div>
            <p className="text-gray-700">{review.comment}</p>
          </div>
        ))}
      </div>
      
      <button
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        {isSubmitting ? 'Submitting...' : 'Submit Review'}
      </button>
    </div>
  );
}

// ============================================
// Complete Example: All Levels Together
// ============================================

export function AllLevelsExample() {
  return (
    <div className="space-y-12 p-8">
      <section>
        <h1 className="text-3xl font-bold mb-8">Reviews SDK Customization Levels</h1>
        
        <div className="space-y-8">
          <div className="border-b pb-8">
            <h2 className="text-2xl font-semibold mb-4">Level 1: Use As-Is</h2>
            <Level1Example />
          </div>
          
          <div className="border-b pb-8">
            <h2 className="text-2xl font-semibold mb-4">Level 2: Customize Props</h2>
            <Level2Example />
          </div>
          
          <div className="border-b pb-8">
            <h2 className="text-2xl font-semibold mb-4">Level 3: Headless + Custom Styling</h2>
            <Level3Example />
          </div>
          
          <div>
            <h2 className="text-2xl font-semibold mb-4">Level 4: Hooks Only</h2>
            <Level4Example />
          </div>
        </div>
      </section>
    </div>
  );
}

