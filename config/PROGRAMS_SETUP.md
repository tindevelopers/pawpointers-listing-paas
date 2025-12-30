# Programs Configuration Guide

This guide explains how to customize which top-level programs are included when you fork this repository.

## Overview

Each top-level program (like Bookings, CRM, AI Assistant, etc.) can be enabled or disabled via the `config/programs.config.ts` file. This allows you to create a customized version of the platform with only the programs you need.

## Quick Start

1. **Open** `config/programs.config.ts`
2. **Set** `enabled: true` for programs you want to include
3. **Set** `enabled: false` for programs you want to exclude
4. **Save** the file - navigation will automatically update

## Available Programs

| Program ID | Default | Description |
|-----------|---------|-------------|
| `dashboard` | ✅ Enabled | Main dashboard with analytics and overview |
| `bookings` | ✅ Enabled | Booking and reservation management system |
| `crm` | ✅ Enabled | Customer Relationship Management (contacts, companies, deals) |
| `ai-assistant` | ✅ Enabled | AI-powered assistant with text, image, code, and video generation |
| `knowledge-base` | ✅ Enabled | Knowledge base and documentation system |
| `ecommerce` | ❌ Disabled | E-commerce product and order management |
| `billing` | ✅ Enabled | Billing, subscriptions, and payment management |
| `admin` | ✅ Enabled | User, tenant, and role management |
| `system-admin` | ✅ Enabled | Platform administration and system settings |
| `saas` | ✅ Enabled | SaaS features (usage metering, security, integrations, etc.) |
| `calendar` | ✅ Enabled | Calendar and event management |
| `user-profile` | ✅ Enabled | User profile and account settings |
| `task` | ❌ Disabled | Task management with list and kanban views |
| `forms` | ❌ Disabled | Form builder and form elements |
| `tables` | ❌ Disabled | Data tables and table components |
| `pages` | ❌ Disabled | Utility pages (file manager, pricing, FAQ, errors, etc.) |
| `support` | ✅ Enabled | Support features (chat, tickets, email) |
| `charts` | ❌ Disabled | Chart components (line, bar, pie charts) |
| `ui-elements` | ❌ Disabled | UI component library and examples |
| `authentication` | ❌ Disabled | Authentication pages (sign in, sign up, password reset) |

## Example: Disabling a Program

To disable the "E-commerce" program:

```typescript
ecommerce: {
  id: 'ecommerce',
  enabled: false, // Change to false to disable
  description: 'E-commerce product and order management',
},
```

## Example: Enabling a Disabled Program

To enable the "Task" program:

```typescript
task: {
  id: 'task',
  enabled: true, // Change to true to enable
  description: 'Task management with list and kanban views',
},
```

## How It Works

1. **Configuration File**: `config/programs.config.ts` defines which programs are enabled
2. **Filtered Navigation**: `apps/admin/config/navigation-filtered.tsx` filters navigation items based on enabled programs
3. **Sidebar**: `apps/admin/layout/AppSidebar.tsx` uses the filtered navigation to display only enabled programs

## Program Mapping

The following navigation items map to programs:

- **Dashboard** → `dashboard`
- **Bookings** → `bookings`
- **CRM** → `crm`
- **AI Assistant** → `ai-assistant`
- **Knowledge Base** → `knowledge-base`
- **E-commerce** → `ecommerce`
- **Billing & Plans** → `billing`
- **Admin** → `admin`
- **System Admin** → `system-admin`
- **SaaS** → `saas`
- **Calendar** → `calendar`
- **User Profile** → `user-profile`
- **Task** → `task`
- **Forms** → `forms`
- **Tables** → `tables`
- **Pages** → `pages`
- **Chat/Support/Email** → `support`
- **Charts** → `charts`
- **UI Elements** → `ui-elements`
- **Authentication** → `authentication`

## Customization Tips

1. **Start with defaults**: Most programs are enabled by default. Disable what you don't need.
2. **Test after changes**: After modifying programs, test the navigation to ensure everything works.
3. **Check dependencies**: Some programs may depend on others. For example, "Billing" may require "Admin" for user management.
4. **Document your choices**: Add comments in `programs.config.ts` explaining why certain programs are enabled/disabled.

## Advanced: Custom Program Names

You can override the default name of a program:

```typescript
bookings: {
  id: 'bookings',
  enabled: true,
  name: 'Reservations', // Custom name
  description: 'Booking and reservation management system',
},
```

Note: Custom names require additional configuration in `navigation-filtered.tsx` to map correctly.

## Troubleshooting

**Q: A program is enabled but doesn't appear in navigation**
- Check that the program name in `navigation.tsx` matches the mapping in `navigation-filtered.tsx`
- Verify the program ID is correct in `programs.config.ts`

**Q: Navigation items still appear after disabling a program**
- Clear your browser cache
- Restart the development server
- Check that you're importing from `navigation-filtered.tsx` not `navigation.tsx`

**Q: Routes are still accessible after disabling a program**
- Program filtering only affects navigation visibility
- To protect routes, add middleware or route guards based on `isProgramEnabled()`

## Next Steps

After configuring programs:

1. **Review routes**: Consider adding route protection for disabled programs
2. **Update documentation**: Document which programs are included in your fork
3. **Test thoroughly**: Ensure all enabled programs work correctly
4. **Share your config**: Consider sharing your `programs.config.ts` as an example for others


