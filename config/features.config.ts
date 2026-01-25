/**
 * Features Configuration
 * Global feature flags and SDK configurations
 * Each cloned project can enable/disable features as needed
 */

export const featuresConfig = {
  // SDKs to include
  sdks: {
    reviews: {
      enabled: true,
      config: {
        requireVerification: false, // Require purchase/booking to review
        allowPhotos: true,
        allowVideos: false,
        maxPhotosPerReview: 5,
        moderationMode: 'auto', // 'auto', 'manual', 'none'
        autoApproveThreshold: 3, // Star rating above which auto-approve
        allowOwnerResponse: true,
        showHelpfulVotes: true,
      },
    },
    maps: {
      enabled: true,
      provider: 'mapbox', // 'mapbox', 'google', 'openstreetmap'
      config: {
        apiKey: process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
        defaultZoom: 12,
        defaultCenter: { lat: 37.7749, lng: -122.4194 }, // San Francisco
        clustering: true,
        clusterRadius: 50,
        maxZoom: 18,
        showUserLocation: true,
        enableDirections: true,
        style: 'mapbox://styles/mapbox/streets-v12',
      },
    },
    booking: {
      enabled: false, // Enable in cloned repos as needed
      config: {
        allowInstantBooking: true,
        requireApproval: false,
        enableWaitlist: true,
        paymentProcessor: 'stripe', // 'stripe', 'paypal', 'square'
        depositRequired: false,
        depositPercentage: 20,
        cancellationWindow: 24, // hours
        reminderEmails: true,
        reminderHoursBefore: [24, 2],
      },
    },
    crm: {
      enabled: true,
      config: {
        leadCapture: true,
        emailNotifications: true,
        smsNotifications: false,
        autoResponder: true,
        leadScoring: false,
        pipelineStages: ['new', 'contacted', 'qualified', 'converted'],
      },
    },
    marketing: {
      enabled: false, // Advanced feature
      config: {
        emailCampaigns: false,
        pushNotifications: false,
        smsMarketing: false,
        segmentation: true,
        abTesting: false,
      },
    },
    favorites: {
      enabled: true,
      config: {
        maxFavoritesPerUser: 100,
        enableCollections: true,
        enableNotes: true,
        syncAcrossDevices: true,
      },
    },
    messaging: {
      enabled: true,
      config: {
        enableRealtime: true,
        enableAttachments: true,
        maxAttachmentSize: 10, // MB
        enableReadReceipts: true,
        retentionDays: 365,
      },
    },
    search: {
      enabled: true,
      config: {
        enableFullTextSearch: true,
        enableFuzzySearch: true,
        enableAutocomplete: true,
        enableFacets: true,
        enableSavedSearches: true,
        maxSavedSearches: 10,
        resultsPerPage: 20,
      },
    },
    analytics: {
      enabled: true, // Listing owner analytics
      config: {
        trackViews: true,
        trackLeads: true,
        trackConversions: true,
        retentionDays: 365,
        enableExport: true,
      },
    },
    // Optional SDKs - enable as needed for your platform
    payments: {
      enabled: false, // Stripe/PayPal payment processing
      provider: 'stripe', // 'stripe', 'paypal', 'square'
      config: {
        publicKey: process.env.NEXT_PUBLIC_STRIPE_KEY,
        enableSubscriptions: true,
        enableInvoices: true,
        enableRefunds: true,
      },
    },
    notifications: {
      enabled: false, // Push, email, in-app notifications
      config: {
        enablePush: true,
        enableEmailDigest: true,
        enableInApp: true,
        enableSMS: false,
      },
    },
    media: {
      enabled: false, // Image gallery, video player, virtual tours
      config: {
        enableGallery: true,
        enableLightbox: true,
        enableVideoPlayer: true,
        enableVirtualTour: false,
        maxImagesPerListing: 20,
      },
    },
    calendar: {
      enabled: false, // Event scheduling, availability
      config: {
        defaultView: 'month',
        enableRecurringEvents: true,
        enableTimeSlots: true,
        timezone: 'auto',
      },
    },
    forms: {
      enabled: false, // Dynamic form builder
      config: {
        enableConditionalLogic: true,
        enableValidation: true,
        enableFileUploads: true,
        maxFieldsPerForm: 50,
      },
    },
    auth: {
      enabled: false, // Pre-built auth components (if not using app's auth)
      config: {
        enableOAuth: true,
        oauthProviders: ['google', 'github'],
        enableMagicLink: true,
        enablePasswordReset: true,
      },
    },
    chat: {
      enabled: false, // Real-time chat widget
      config: {
        enableWebSocket: true,
        enableTypingIndicators: true,
        enableReadReceipts: true,
        enableFileSharing: true,
        maxMessageLength: 2000,
      },
    },
    ai: {
      enabled: false, // AI recommendations, content generation
      config: {
        enableRecommendations: true,
        enableContentGeneration: true,
        enableImageAnalysis: false,
        enableSimilarListings: true,
        provider: 'openai', // 'openai', 'anthropic', 'local'
      },
    },
    export: {
      enabled: false, // PDF/CSV/Excel export
      config: {
        enablePDF: true,
        enableCSV: true,
        enableExcel: true,
        enableBulkExport: true,
        maxItemsPerExport: 1000,
      },
    },
    verification: {
      enabled: false, // ID/business verification
      config: {
        enabledTypes: ['identity', 'email', 'phone'],
        requiredForListing: false,
        provider: 'stripe', // 'stripe', 'jumio', 'onfido'
      },
    },
  },
  
  // Platform features
  platform: {
    multiTenant: true,
    allowUserListings: true, // Users can create their own listings
    requireVerification: false, // Require ID/business verification
    enableMessaging: true, // User-to-user messaging
    enableSavedListings: true, // Favorites/bookmarks
    enableAlerts: true, // Search alerts
    enableComparison: true, // Compare listings side-by-side
    maxComparisons: 3,
    enableSharing: true, // Social sharing
    enableReporting: true, // Report inappropriate content
    enableClaiming: false, // Business owners can claim listings
  },
  
  // Search & Discovery
  search: {
    enableFullTextSearch: true,
    enableFuzzySearch: true,
    enableVoiceSearch: false,
    enableImageSearch: false,
    enableAIRecommendations: false,
    cacheResults: true,
    cacheDuration: 300, // seconds
  },
  
  // Image handling
  media: {
    storage: 'wasabi', // 'wasabi', 's3', 'cloudinary', 'local'
    bucket: process.env.WASABI_BUCKET || 'listing-platform-images',
    cdnUrl: process.env.NEXT_PUBLIC_CDN_URL,
    maxImagesPerListing: 20,
    maxImageSize: 10, // MB
    maxVideoSize: 100, // MB
    allowVirtualTours: true,
    allowVideos: true,
    imageFormats: ['jpg', 'jpeg', 'png', 'webp'],
    videoFormats: ['mp4', 'mov'],
    thumbnailSizes: [
      { name: 'small', width: 320, height: 240 },
      { name: 'medium', width: 640, height: 480 },
      { name: 'large', width: 1280, height: 960 },
    ],
    generateThumbnails: true,
    compressImages: true,
    watermark: false,
  },

  // AI Image Generation
  imageGeneration: {
    enabled: true,
    providers: {
      stabilityAi: {
        enabled: true,
        apiKey: process.env.STABILITY_AI_API_KEY,
        defaultModel: 'sd3.5-large',
      },
      openai: {
        enabled: true,
        apiKey: process.env.OPENAI_API_KEY,
        defaultModel: 'dall-e-3',
      },
    },
    defaults: {
      aspectRatio: '16:9',
      style: 'photographic',
      quality: 'standard',
      size: '1024x1024',
    },
    limits: {
      maxImagesPerRequest: 5,
      maxImagesPerListing: 20,
    },
  },
  
  // SEO
  seo: {
    generateSitemaps: true,
    sitemapUpdateFrequency: 'daily',
    enableISR: true, // Incremental Static Regeneration
    revalidateSeconds: 60,
    staticPagesLimit: 1000, // How many pages to pre-generate at build
    enableStructuredData: true,
    enableOpenGraph: true,
    enableTwitterCards: true,
    robotsTxtRules: {
      allowAll: true,
      disallowPaths: ['/admin', '/api', '/dashboard'],
    },
  },
  
  // Analytics & Tracking
  analytics: {
    provider: 'vercel', // 'vercel', 'google', 'plausible', 'none'
    trackPageViews: true,
    trackEvents: true,
    trackConversions: true,
    enableHeatmaps: false,
    enableSessionRecording: false,
  },
  
  // Security & Privacy
  security: {
    enableRateLimit: true,
    rateLimitRequests: 100, // per minute
    enableCaptcha: true,
    captchaProvider: 'recaptcha', // 'recaptcha', 'hcaptcha', 'turnstile'
    enableCSRF: true,
    enableContentSecurityPolicy: true,
    cookieConsent: true,
    gdprCompliant: true,
  },
  
  // Notifications
  notifications: {
    email: {
      enabled: true,
      provider: 'resend', // 'resend', 'sendgrid', 'ses'
      fromEmail: process.env.EMAIL_FROM || 'noreply@example.com',
      fromName: 'Listing Platform',
    },
    sms: {
      enabled: false,
      provider: 'twilio', // 'twilio', 'sns'
    },
    push: {
      enabled: false,
      provider: 'onesignal', // 'onesignal', 'pusher'
    },
    inApp: {
      enabled: true,
    },
  },
  
  // Internationalization
  i18n: {
    enabled: false, // Enable for multi-language support
    defaultLocale: 'en',
    locales: ['en', 'es', 'fr', 'de'],
    autoDetectLocale: true,
  },
  
  // Performance
  performance: {
    enableCaching: true,
    cacheProvider: 'vercel', // 'vercel', 'redis', 'memory'
    enableCompression: true,
    enableLazyLoading: true,
    enablePrefetching: true,
    imageOptimization: true,
    bundleAnalysis: false,
  },
};

export default featuresConfig;

// Helper functions
export function isFeatureEnabled(feature: string): boolean {
  const parts = feature.split('.');
  let current: any = featuresConfig;
  
  for (const part of parts) {
    current = current[part];
    if (current === undefined) return false;
  }
  
  return current === true || (typeof current === 'object' && current.enabled === true);
}

export function getFeatureConfig(feature: string): any {
  const parts = feature.split('.');
  let current: any = featuresConfig;
  
  for (const part of parts) {
    current = current[part];
    if (current === undefined) return null;
  }
  
  return current;
}



