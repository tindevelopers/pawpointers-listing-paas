# Programs Selection Feature

## Overview

This repository now supports **program selection** - allowing you to choose which top-level programs to include when forking the repository. This makes it easy to create a customized version of the platform with only the features you need.

## How It Works

1. **Configuration File**: `config/programs.config.ts` defines which programs are enabled/disabled
2. **Filtered Navigation**: Navigation items are automatically filtered based on enabled programs
3. **Sidebar**: The sidebar only displays enabled programs

## Quick Start

1. Open `config/programs.config.ts`
2. Set `enabled: true` for programs you want
3. Set `enabled: false` for programs you don't need
4. Save - navigation updates automatically!

## Available Programs

All programs are listed in `config/programs.config.ts` with descriptions. Key programs include:

- ✅ **Dashboard** - Main analytics dashboard
- ✅ **Bookings** - Booking and reservation system
- ✅ **CRM** - Customer relationship management
- ✅ **AI Assistant** - AI-powered content generation
- ✅ **Knowledge Base** - Documentation system
- ✅ **Billing** - Payment and subscription management
- ✅ **Admin** - User and tenant management
- ✅ **System Admin** - Platform administration
- ✅ **SaaS** - SaaS features (metering, security, integrations)
- ✅ **Calendar** - Event management
- ✅ **User Profile** - Account settings
- ✅ **Support** - Chat, tickets, email

Optional programs (disabled by default):
- ❌ **E-commerce** - Product management
- ❌ **Task** - Task management
- ❌ **Forms** - Form builder
- ❌ **Tables** - Data tables
- ❌ **Pages** - Utility pages
- ❌ **Charts** - Chart components
- ❌ **UI Elements** - Component library
- ❌ **Authentication** - Auth pages

## Example Configuration

```typescript
// Enable only essential programs
dashboard: { enabled: true },
bookings: { enabled: true },
crm: { enabled: true },
billing: { enabled: true },
admin: { enabled: true },
// Disable everything else
ecommerce: { enabled: false },
task: { enabled: false },
// ... etc
```

## Files Modified

- `config/programs.config.ts` - Program configuration
- `apps/admin/config/navigation-filtered.tsx` - Filtered navigation
- `apps/admin/layout/AppSidebar.tsx` - Uses filtered navigation
- `config/PROGRAMS_SETUP.md` - Detailed setup guide

## Benefits

1. **Cleaner UI** - Only see what you need
2. **Smaller Bundle** - Exclude unused code (with additional tree-shaking)
3. **Easier Customization** - Simple config file changes
4. **Better UX** - Less clutter, focused experience

## Next Steps

1. Review `config/programs.config.ts`
2. Enable/disable programs as needed
3. Test navigation to ensure everything works
4. Consider adding route protection for disabled programs

For detailed instructions, see `config/PROGRAMS_SETUP.md`.


