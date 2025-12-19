#!/usr/bin/env node

/**
 * SaaS Template Extraction Script
 * 
 * This script extracts ONLY the SaaS template from the TinAdmin repository
 * and creates a standalone Next.js project with all necessary files and dependencies.
 * All other templates are excluded to create a focused SaaS administration platform.
 * 
 * Usage: 
 *   node scripts/extract-saas.js [output-directory] [options]
 * 
 * Examples:
 *   node scripts/extract-saas.js ./saas-standalone
 *   node scripts/extract-saas.js ./saas-standalone --deploy-github
 *   node scripts/extract-saas.js ./saas-standalone --deploy-github --publish-npm
 * 
 * Options:
 *   --deploy-github, --deploy    Deploy the template to GitHub (develop branch ONLY)
 *   --publish-npm, --npm         Also publish to NPM (requires --deploy-github)
 * 
 * INCLUDES:
 *   ✅ SaaS template ONLY
 *   ✅ Essential UI components (ui, common, charts, form, tables)
 *   ✅ All missing dependencies fixed (react-apexcharts, @popperjs/core, flatpickr, etc.)
 *   ✅ Simplified Vercel config for successful deployment
 *   ❌ All other templates excluded (AI Customer Care, Blog Writer, Analytics, CRM, E-commerce, etc.)
 * 
 * SAFETY: This script ONLY operates on the 'develop' branch and will NEVER
 * modify the 'main' branch. The main branch is protected and can only be
 * updated via Pull Requests.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const TEMPLATE_NAME = 'saas';
const TEMPLATE_DISPLAY_NAME = 'SaaS';

// Parse command line arguments
const args = process.argv.slice(2);
const OUTPUT_DIR = args[0] || `./${TEMPLATE_NAME}-standalone`;
const SHOULD_DEPLOY_GITHUB = args.includes('--deploy-github') || args.includes('--deploy');
const SHOULD_PUBLISH_NPM = args.includes('--publish-npm') || args.includes('--npm');
const SHOW_HELP = args.includes('--help') || args.includes('-h');

// Help function
function showHelp() {
  console.log(`
${TEMPLATE_DISPLAY_NAME} Template Extraction Script

This script extracts the SaaS template from the TinAdmin repository
and creates a standalone Next.js project with all necessary files and dependencies.

USAGE:
  node scripts/extract-saas.js [output-directory] [options]

ARGUMENTS:
  output-directory    Directory to create the standalone template (default: ./saas-standalone)

OPTIONS:
  --deploy-github, --deploy    Deploy the template to GitHub (develop branch)
  --publish-npm, --npm         Also publish to NPM (requires --deploy-github)
  --help, -h                   Show this help message

EXAMPLES:
  # Basic extraction
  node scripts/extract-saas.js ./my-saas-template
  
  # Extract and deploy to GitHub
  node scripts/extract-saas.js ./my-saas-template --deploy-github
  
  # Extract, deploy to GitHub, and publish to NPM
  node scripts/extract-saas.js ./my-saas-template --deploy-github --publish-npm

GITHUB REPOSITORY:
  https://github.com/tindevelopers/adminpanel-template-saas-next-js
  
FEATURES:
  ✅ Complete Next.js project structure
  ✅ SaaS template ONLY (focused application)
  ✅ Essential UI components for SaaS administration functionality
  ✅ Fixed missing dependencies from deployment testing
  ✅ Simplified Vercel config for successful deployment
  ✅ GitHub deployment to develop branch
  ✅ NPM package publishing
  ✅ Executable template creation script

TEMPLATES INCLUDED:
  🚀 SaaS ONLY
  ❌ All other templates excluded (AI Customer Care, Blog Writer, Analytics, CRM, etc.)
`);
}

if (SHOW_HELP) {
  showHelp();
  process.exit(0);
}

// Files and directories to copy
const FILES_TO_COPY = [
  // Core Next.js files
  'next.config.ts',
  'tsconfig.json',
  'postcss.config.mjs',
  'tailwind.config.ts',
  'eslint.config.mjs',
  
  // Package files
  'package.json',
  'package-lock.json',
  
  // Public assets
  'public/favicon.ico',
  'public/images',
  
  // Source structure
  'src/app/layout.tsx',
  'src/app/globals.css',
  'src/app/not-found.tsx',
  'src/app/loading.tsx',
  'src/context',
  'src/hooks',
  'src/utils',
  'src/svg.d.ts',
  
  // Admin layout only (no other admin pages)
  'src/app/(admin)/layout.tsx',
  
  // Template-specific files (ONLY saas)
  `src/app/templates/${TEMPLATE_NAME}`,
  // Note: SaaS uses shared components, not template-specific components directory
  
  // Essential UI components for AI customer care only
  'src/components/ui',
  'src/components/common',
  'src/components/charts',
  'src/components/form',
  'src/components/tables',
  
  // Layout components
  'src/layout/AppSidebar.tsx',
  'src/layout/AppHeader.tsx',
  'src/layout/Backdrop.tsx',
  'src/layout/SidebarWidget.tsx',
  
  // Header components (required by AppHeader)
  'src/components/header/NotificationDropdown.tsx',
  'src/components/header/UserDropdown.tsx',
  
  // Documentation (if exists)
  // Note: SaaS may not have template.config.json, skip if not found
  
  // GitHub Actions workflows (if they exist)
  '.github/workflows',
];

// Icons to copy (comprehensive list based on actual usage)
const ICONS_TO_COPY = [
  // Core navigation icons
  'src/icons/shooting-star.svg',
  'src/icons/user-circle.svg',
  'src/icons/user-circle.svg',
  'src/icons/user-line.svg',
  'src/icons/calendar.svg',
  'src/icons/calender-line.svg',
  'src/icons/time.svg',
  'src/icons/eye.svg',
  'src/icons/eye-close.svg',
  'src/icons/check-circle.svg',
  'src/icons/check-line.svg',
  'src/icons/close.svg',
  'src/icons/close-line.svg',
  'src/icons/plus.svg',
  'src/icons/pencil.svg',
  'src/icons/trash.svg',
  'src/icons/download.svg',
  'src/icons/copy.svg',
  'src/icons/arrow-up.svg',
  'src/icons/arrow-down.svg',
  'src/icons/arrow-right.svg',
  'src/icons/angle-down.svg',
  'src/icons/angle-up.svg',
  'src/icons/angle-left.svg',
  'src/icons/angle-right.svg',
  'src/icons/chevron-down.svg',
  'src/icons/chevron-left.svg',
  'src/icons/chevron-up.svg',
  'src/icons/horizontal-dots.svg',
  'src/icons/grid.svg',
  'src/icons/list.svg',
  'src/icons/table.svg',
  'src/icons/pie-chart.svg',
  'src/icons/bolt.svg',
  'src/icons/shooting-star.svg',
  'src/icons/info.svg',
  'src/icons/info-hexa.svg',
  'src/icons/alert.svg',
  'src/icons/lock.svg',
  'src/icons/envelope.svg',
  'src/icons/mail-line.svg',
  'src/icons/mail-icon.svg',
  'src/icons/docs.svg',
  'src/icons/folder.svg',
  'src/icons/file.svg',
  'src/icons/page.svg',
  'src/icons/group.svg',
  'src/icons/box.svg',
  'src/icons/box-cube.svg',
  'src/icons/box-icon.svg',
  'src/icons/box-line.svg',
  'src/icons/box-tapped.svg',
  'src/icons/truck-delivery.svg',
  'src/icons/task.svg',
  'src/icons/task-icon.svg',
  'src/icons/audio.svg',
  'src/icons/videos.svg',
  'src/icons/MoreDotIcon.svg',
  'src/icons/cart-icon.svg',
  'src/icons/plug-in.svg',
  'src/icons/paper-plane.svg',
  'src/icons/dollar-line.svg',
  
  // Icon index file
  'src/icons/index.tsx',
];

// Files to create/modify
const FILES_TO_CREATE = [
  'src/app/page.tsx',
  'src/app/(admin)/layout.tsx',
  'src/app/(admin)/page.tsx',
  'README.md',
  'DEPLOYMENT.md',
];

// Dependencies to include (filtered from main package.json + deployment fixes)
const REQUIRED_DEPENDENCIES = [
  'next@^15.5.4',
  'react@^19.0.0',
  'react-dom@^19.0.0',
  '@types/node@^22.0.0',
  '@types/react@^19.0.0',
  '@types/react-dom@^19.0.0',
  '@types/prismjs@^1.26.5',
  'typescript@^5.0.0',
  'tailwindcss@^4.0.0',
  'autoprefixer@^10.4.0',
  'postcss@^8.4.0',
  'eslint@^9.0.0',
  'eslint-config-next@^15.5.4',
  '@heroicons/react@^2.1.0',
  '@svgr/webpack@^8.1.0',
  '@tailwindcss/forms@^0.5.9',
  '@tailwindcss/postcss@^4.0.9',
  'clsx@^2.1.0',
  'tailwind-merge@^2.5.0',
  'lucide-react@^0.460.0',
  'recharts@^2.13.0',
  'apexcharts@^4.3.0',
  'react-apexcharts@^1.4.1',
  '@popperjs/core@^2.11.8',
  'flatpickr@^4.6.13',
  'react-dropzone@^14.2.3',
  'swiper@^11.0.5',
  'simplebar-react@^3.2.4',
];

const REQUIRED_DEV_DEPENDENCIES = [
  '@types/node@^22.0.0',
  '@types/react@^19.0.0',
  '@types/react-dom@^19.0.0',
  'typescript@^5.0.0',
  'eslint@^9.0.0',
  'eslint-config-next@^15.5.4',
];

// Scripts to include
const REQUIRED_SCRIPTS = {
  'dev': 'next dev',
  'build': 'next build',
  'start': 'next start',
  'lint': 'next lint',
  'type-check': 'tsc --noEmit'
};

// Utility functions
function log(message, type = 'info') {
  const icons = {
    info: '📝',
    success: '✅',
    warning: '⚠️',
    error: '❌',
    progress: '🔄'
  };
  console.log(`${icons[type]} ${message}`);
}

function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function copyFileOrDirectory(src, dest) {
  const srcPath = path.resolve(src);
  const destPath = path.resolve(dest);
  
  if (!fs.existsSync(srcPath)) {
    log(`Warning: Source path does not exist: ${srcPath}`, 'warning');
    return;
  }
  
  ensureDirectoryExists(path.dirname(destPath));
  
  if (fs.statSync(srcPath).isDirectory()) {
    if (fs.existsSync(destPath)) {
      fs.rmSync(destPath, { recursive: true });
    }
    fs.cpSync(srcPath, destPath, { recursive: true });
  } else {
    fs.copyFileSync(srcPath, destPath);
  }
}

function createPackageJson() {
  const packageJson = {
    name: `tinadmin-saas-template`,
    version: '1.0.0',
    description: `${TEMPLATE_DISPLAY_NAME} Template - Comprehensive SaaS administration platform with multi-tenant support, billing, integrations, and analytics`,
    private: false,
    main: "bin/create-saas.js",
    bin: {
      "tinadmin-saas-template": "./bin/create-saas.js"
    },
    files: [
      "bin/",
      "src/",
      "public/",
      "templates/",
      "package.json",
      "README.md",
      "DEPLOYMENT.md",
      "LICENSE",
      "next.config.ts",
      "tsconfig.json",
      "tailwind.config.ts",
      "postcss.config.mjs",
      "eslint.config.mjs"
    ],
    keywords: [
      "nextjs",
      "react",
      "typescript",
      "tailwindcss",
      "saas",
      "multi-tenant",
      "billing",
      "subscriptions",
      "integrations",
      "admin-panel",
      "template"
    ],
    author: "TinAdmin",
    license: "MIT",
    homepage: "https://github.com/tindevelopers/adminpanel-template-saas-next-js",
    repository: {
      type: "git",
      url: "git+https://github.com/tindevelopers/adminpanel-template-saas-next-js.git"
    },
    bugs: {
      url: "https://github.com/tindevelopers/adminpanel-template-saas-next-js/issues"
    },
    publishConfig: {
      access: "public"
    },
    scripts: REQUIRED_SCRIPTS,
    dependencies: {},
    devDependencies: {},
    optionalDependencies: {
      '@tailwindcss/oxide-linux-x64-gnu': '^4.0.0',
      'lightningcss-linux-x64-gnu': '^1.29.0'
    },
    engines: {
      node: '>=18.0.0',
      npm: '>=8.0.0'
    }
  };
  
  // Add dependencies with proper parsing
  REQUIRED_DEPENDENCIES.forEach(dep => {
    // Handle scoped packages like @types/node@^20.0.0
    const match = dep.match(/^(@[^@]+)@(.+)$/);
    if (match) {
      const [, name, version] = match;
      packageJson.dependencies[name] = version;
    } else {
      // Handle non-scoped packages like react@^18.0.0
      const parts = dep.split('@');
      if (parts.length === 2) {
        const [name, version] = parts;
        packageJson.dependencies[name] = version;
      }
    }
  });
  
  REQUIRED_DEV_DEPENDENCIES.forEach(dep => {
    // Handle scoped packages like @types/node@^20.0.0
    const match = dep.match(/^(@[^@]+)@(.+)$/);
    if (match) {
      const [, name, version] = match;
      packageJson.devDependencies[name] = version;
    } else {
      // Handle non-scoped packages like typescript@^5.0.0
      const parts = dep.split('@');
      if (parts.length === 2) {
        const [name, version] = parts;
        packageJson.devDependencies[name] = version;
      }
    }
  });
  
  return packageJson;
}

function createMainPage() {
  return `import { redirect } from 'next/navigation';

export default function HomePage() {
  // Redirect to the SaaS template dashboard
  redirect('/templates/${TEMPLATE_NAME}/dashboard');
}`;
}

function createReadme() {
  return `# ${TEMPLATE_DISPLAY_NAME} Template

A comprehensive SaaS administration platform built with Next.js, TypeScript, and Tailwind CSS. Perfect for building multi-tenant SaaS applications with complete billing, subscription, and integration management.

## 🚀 Features

### 👥 User & Entity Management
- **User Management** - Complete user administration with roles and permissions
- **Tenant Management** - Multi-tenant architecture support
- **Organization Management** - Manage organizations and hierarchies
- **Role Management** - Granular role-based access control (RBAC)
- **User Profiles** - Comprehensive user profile management

### 💳 Billing & Subscriptions
- **Subscription Plans** - Create and manage subscription tiers
- **Feature Management** - Define features per plan
- **Usage Limits** - Set and enforce usage limits
- **Billing Dashboard** - Complete billing overview
- **Payment History** - Track all payments and transactions
- **Invoicing** - Generate and manage invoices
- **Tax Settings** - Configure tax rates and rules
- **Failed Payments** - Handle payment failures
- **Refunds** - Process refunds efficiently

### 📊 Usage & Metering
- **Usage Dashboard** - Real-time usage monitoring
- **Metered Billing** - Usage-based billing support
- **Reports** - Comprehensive usage reports
- **Alerts** - Usage limit alerts and notifications
- **Rate Limits** - API rate limiting configuration

### 🔒 Security & Compliance
- **Security Settings** - Configure security policies
- **SSO Configuration** - Single Sign-On setup
- **Session Management** - Active session monitoring and control
- **IP Restrictions** - IP whitelisting and blacklisting
- **Audit Logs** - Complete audit trail
- **Compliance** - GDPR, SOC2, and other compliance tools

### 🔗 Integrations
- **CRM Integrations** - Salesforce, HubSpot, Pipedrive, GoHighLevel
- **Email Marketing** - Mailchimp, SendGrid, ConvertKit, ActiveCampaign
- **Telephony** - Twilio, Telnyx, Vonage
- **Payment Processing** - Stripe, PayPal, Square, Braintree
- **Analytics** - Google Analytics, Mixpanel, Amplitude
- **Accounting** - QuickBooks, Xero, FreshBooks
- **E-commerce** - Shopify, WooCommerce, BigCommerce
- **Social Media** - Facebook, Twitter/X, LinkedIn, Instagram
- **Customer Support** - Zendesk, Intercom, Freshdesk
- **API Connections** - Manage API connections
- **OAuth Apps** - OAuth application management

### 📧 Email & Notifications
- **Email Templates** - Create and manage email templates
- **Notification Settings** - Configure notification preferences
- **Email Logs** - Track all sent emails
- **Campaigns** - Email campaign management

### 🎫 Support System
- **Ticket Management** - Complete support ticket system
- **Categories** - Organize tickets by category
- **Knowledge Base** - Self-service knowledge base
- **Support Settings** - Configure support workflows

### 🚩 Feature Flags
- **Flag Management** - Create and manage feature flags
- **Environments** - Multi-environment support
- **Targeting** - User targeting for feature flags
- **History** - Feature flag change history

### 📈 Analytics & Reporting
- **Analytics Dashboard** - Comprehensive analytics
- **Custom Reports** - Build custom reports
- **Event Tracking** - Track user events
- **Data Exports** - Export data in various formats
- **Custom Report Builder** - Visual report builder
- **Saved Reports** - Save and share reports

### 📦 Data Management
- **Export Jobs** - Schedule and manage data exports
- **Import Templates** - Create import templates
- **Data Mapping** - Map data fields for imports
- **Import/Export History** - Track all data operations

### 🎨 White-Label Configuration
- **Branding** - Customize branding and logos
- **Domain Settings** - Configure custom domains
- **Email Customization** - Customize email templates
- **Theme Settings** - Customize color schemes
- **Custom CSS** - Add custom styling

### 🔌 Webhooks & API
- **Webhook Management** - Create and manage webhooks
- **Webhook Events** - Monitor webhook events
- **Webhook Logs** - View webhook delivery logs
- **Webhook Testing** - Test webhook endpoints
- **API Keys** - Manage API keys and authentication

## 🛠️ Tech Stack

- **Framework**: Next.js 15.5.4
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4.0
- **Icons**: Heroicons
- **Charts**: Recharts & ApexCharts
- **State Management**: React Context API

## 📦 Installation

1. **Clone or download** this template
2. **Install dependencies**:
   \`\`\`bash
   npm install
   \`\`\`

3. **Start development server**:
   \`\`\`bash
   npm run dev
   \`\`\`

4. **Open your browser** and navigate to \`http://localhost:3000\`

## 🏗️ Project Structure

\`\`\`
src/
├── app/
│   ├── templates/saas/              # SaaS pages
│   │   ├── dashboard/               # Dashboard
│   │   ├── admin/                   # Admin management
│   │   ├── subscriptions/           # Subscription management
│   │   ├── invoicing/               # Invoicing
│   │   ├── integrations/            # Third-party integrations
│   │   ├── analytics/               # Analytics dashboard
│   │   └── ...                      # Other features
│   └── layout.tsx                   # Root layout
├── components/
│   └── (shared components)         # Shared UI components
├── layout/                          # Layout components
└── hooks/                           # Custom React hooks
\`\`\`

## 🚀 Deployment

### Vercel (Recommended)
\`\`\`bash
npm run build
npx vercel --prod
\`\`\`

### Netlify
\`\`\`bash
npm run build
npm run export
# Upload the 'out' directory to Netlify
\`\`\`

### Docker
\`\`\`bash
# Build the image
docker build -t saas-app .

# Run the container
docker run -p 3000:3000 saas-app
\`\`\`

## 🔧 Customization

### Adding New Pages
1. Create a new directory in \`src/app/templates/saas/\`
2. Add a \`page.tsx\` file with your component
3. Update the sidebar navigation in \`src/layout/AppSidebar.tsx\`

### Styling
- Modify \`src/app/globals.css\` for global styles
- Use Tailwind CSS classes for component styling
- Customize the theme in \`tailwind.config.ts\`

### Adding Integrations
1. Add integration configuration in \`src/app/templates/saas/integrations/\`
2. Add API endpoints and configuration
3. Update the integrations page

## 📚 API Integration

The template includes comprehensive API integration support:

- **User Management APIs** - CRUD operations for users and roles
- **Billing APIs** - Subscription and payment management
- **Analytics APIs** - Performance tracking and reporting
- **Integration APIs** - Third-party service connections
- **Webhook APIs** - Event notifications

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This template is licensed under the MIT License.

## 🆘 Support

- 📧 Email: support@tinadmin.com
- 📚 Documentation: [docs.tinadmin.com](https://docs.tinadmin.com)
- 🐛 Issues: [GitHub Issues](https://github.com/tinadmin/tinadmin/issues)

---

**Ready to build your SaaS platform? Start with this template! 🚀**`;
}

function createDeploymentGuide() {
  return `# Deployment Guide - ${TEMPLATE_DISPLAY_NAME} Template

This guide covers various deployment options for your ${TEMPLATE_DISPLAY_NAME} application.

## 🚀 Quick Deploy (Vercel - Recommended)

### 1. Deploy to Vercel
\`\`\`bash
# Install Vercel CLI
npm i -g vercel

# Deploy to production
vercel --prod
\`\`\`

### 2. Environment Variables
Set these in your Vercel dashboard:
\`\`\`env
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
NEXT_PUBLIC_API_URL=https://your-api-domain.com
\`\`\`

## 🐳 Docker Deployment

### 1. Create Dockerfile
\`\`\`dockerfile
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS builder
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
\`\`\`

### 2. Build and Run
\`\`\`bash
# Build the image
docker build -t saas-app .

# Run the container
docker run -p 3000:3000 saas-app
\`\`\`

## ☁️ AWS Deployment

### 1. Using AWS Amplify
\`\`\`bash
# Install Amplify CLI
npm install -g @aws-amplify/cli

# Initialize Amplify
amplify init

# Add hosting
amplify add hosting

# Deploy
amplify publish
\`\`\`

## 🌐 Netlify Deployment

### 1. Build Settings
\`\`\`yaml
# netlify.toml
[build]
  command = "npm run build"
  publish = "out"

[[plugins]]
  package = "@netlify/plugin-nextjs"
\`\`\`

## 🔧 Environment Configuration

### Development
\`\`\`env
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:8000
\`\`\`

### Production
\`\`\`env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_API_URL=https://your-api-domain.com
\`\`\`

## 📊 Performance Optimization

### 1. Enable Caching
\`\`\`typescript
// next.config.ts
const nextConfig = {
  experimental: {
    outputFileTracingRoot: path.join(__dirname, '../../'),
  },
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
};
\`\`\`

### 2. Image Optimization
\`\`\`typescript
// Use Next.js Image component
import Image from 'next/image';

<Image
  src="/images/hero.jpg"
  alt="Hero image"
  width={800}
  height={600}
  priority
/>
\`\`\`

## 🔒 Security Considerations

### 1. Environment Variables
- Never commit \`.env.local\` files
- Use secure random secrets for production
- Rotate API keys regularly

### 2. HTTPS
- Always use HTTPS in production
- Configure proper SSL certificates
- Enable HSTS headers

## 📈 Monitoring & Analytics

### 1. Error Tracking
\`\`\`bash
# Install Sentry
npm install @sentry/nextjs
\`\`\`

### 2. Performance Monitoring
\`\`\`bash
# Install Vercel Analytics
npm install @vercel/analytics
\`\`\`

## 🆘 Troubleshooting

### Common Issues

1. **Build Failures**
   - Check Node.js version (requires 18+)
   - Clear \`node_modules\` and reinstall
   - Verify all dependencies are compatible

2. **Deployment Issues**
   - Check environment variables
   - Verify build output directory
   - Check deployment logs

3. **Performance Issues**
   - Enable caching
   - Optimize images
   - Use CDN for static assets

### Getting Help
- 📧 Email: support@tinadmin.com
- 📚 Documentation: [docs.tinadmin.com](https://docs.tinadmin.com)
- 🐛 Issues: [GitHub Issues](https://github.com/tinadmin/tinadmin/issues)

---

**Happy deploying! 🚀**`;
}

function modifyAppSidebar() {
  const sidebarPath = path.join(OUTPUT_DIR, 'src/layout/AppSidebar.tsx');
  if (fs.existsSync(sidebarPath)) {
    let sidebarContent = fs.readFileSync(sidebarPath, 'utf8');
    
    // Replace the navigation items to ONLY include SaaS
    const saasOnlyNavItems = `
const navItems = [
  {
    name: "SaaS",
    icon: <ShootingStarIcon />,
    new: true,
    subItems: [
      { name: "Dashboard", path: "/templates/saas/dashboard" },
      { name: "User Profile", path: "/templates/saas/userprofile" },
      {
        name: "Admin",
        subItems: [
          { name: "User Management", path: "/templates/saas/admin/entity/user-management" },
          { name: "Tenant Management", path: "/templates/saas/admin/entity/tenant-management" },
          { name: "Organization Management", path: "/templates/saas/admin/entity/organization-management" },
          { name: "Role Management", path: "/templates/saas/admin/entity/role-management" },
          { name: "System", path: "/templates/saas/admin/system" },
        ],
      },
      {
        name: "System Admin",
        subItems: [
          { name: "API Keys", path: "/templates/saas/admin/system-admin/api-keys" },
        ],
      },
      { name: "API Keys", path: "/api-keys" },
      {
        name: "Subscriptions",
        subItems: [
          { name: "Plans", path: "/templates/saas/subscriptions/plans" },
          { name: "Features", path: "/templates/saas/subscriptions/features" },
          { name: "Usage Limits", path: "/templates/saas/subscriptions/usage-limits" },
          { name: "History", path: "/templates/saas/subscriptions/history" },
          { name: "Migration", path: "/templates/saas/subscriptions/migration" },
        ],
      },
      {
        name: "Invoicing",
        subItems: [
          { name: "Invoices", path: "/templates/saas/invoicing/invoices" },
          { name: "Payment History", path: "/templates/saas/invoicing/payment-history" },
          { name: "Failed Payments", path: "/templates/saas/invoicing/failed-payments" },
          { name: "Refunds", path: "/templates/saas/invoicing/refunds" },
          { name: "Tax Settings", path: "/templates/saas/invoicing/tax-settings" },
        ],
      },
      {
        name: "Usage & Metering",
        subItems: [
          { name: "Dashboard", path: "/templates/saas/usage-metering/dashboard" },
          { name: "Metered Billing", path: "/templates/saas/usage-metering/metered-billing" },
          { name: "Reports", path: "/templates/saas/usage-metering/reports" },
          { name: "Alerts", path: "/templates/saas/usage-metering/alerts" },
          { name: "Rate Limits", path: "/templates/saas/usage-metering/rate-limits" },
        ],
      },
      {
        name: "Security",
        subItems: [
          { name: "Settings", path: "/templates/saas/security/settings" },
          { name: "SSO Configuration", path: "/templates/saas/security/sso-configuration" },
          { name: "Session Management", path: "/templates/saas/security/session-management" },
          { name: "IP Restrictions", path: "/templates/saas/security/ip-restrictions" },
          { name: "Audit Logs", path: "/templates/saas/security/audit-logs" },
          { name: "Compliance", path: "/templates/saas/security/compliance" },
        ],
      },
      {
        name: "Webhooks",
        subItems: [
          { name: "Management", path: "/templates/saas/webhooks/management" },
          { name: "Events", path: "/templates/saas/webhooks/events" },
          { name: "Logs", path: "/templates/saas/webhooks/logs" },
          { name: "Testing", path: "/templates/saas/webhooks/testing" },
        ],
      },
      {
        name: "Email & Notifications",
        subItems: [
          { name: "Templates", path: "/templates/saas/email-notifications/templates" },
          { name: "Settings", path: "/templates/saas/email-notifications/settings" },
          { name: "Logs", path: "/templates/saas/email-notifications/logs" },
          { name: "Campaigns", path: "/templates/saas/email-notifications/campaigns" },
        ],
      },
      {
        name: "Support",
        subItems: [
          { name: "Tickets", path: "/templates/saas/support/tickets" },
          { name: "Categories", path: "/templates/saas/support/categories" },
          { name: "Knowledge Base", path: "/templates/saas/support/knowledge-base" },
          { name: "Settings", path: "/templates/saas/support/settings" },
        ],
      },
      {
        name: "Feature Flags",
        subItems: [
          { name: "Flags", path: "/templates/saas/feature-flags/flags" },
          { name: "Environments", path: "/templates/saas/feature-flags/environments" },
          { name: "Targeting", path: "/templates/saas/feature-flags/targeting" },
          { name: "History", path: "/templates/saas/feature-flags/history" },
        ],
      },
      {
        name: "Analytics",
        subItems: [
          { name: "Dashboard", path: "/templates/saas/analytics/dashboard" },
          { name: "Custom Reports", path: "/templates/saas/analytics/custom-reports" },
          { name: "Events", path: "/templates/saas/analytics/events" },
          { name: "Exports", path: "/templates/saas/analytics/exports" },
        ],
      },
      {
        name: "Integrations",
        subItems: [
          { name: "All Integrations", path: "/templates/saas/integrations/list" },
          { name: "CRM", path: "/templates/saas/integrations/crm" },
          { name: "Email Marketing", path: "/templates/saas/integrations/email-marketing" },
          { name: "Telephony", path: "/templates/saas/integrations/telephony" },
          { name: "Payments", path: "/templates/saas/integrations/payments" },
          { name: "Analytics", path: "/templates/saas/integrations/analytics" },
          { name: "Accounting", path: "/templates/saas/integrations/accounting" },
          { name: "E-commerce", path: "/templates/saas/integrations/ecommerce" },
          { name: "Social Media", path: "/templates/saas/integrations/social-media" },
          { name: "Customer Support", path: "/templates/saas/integrations/customer-support" },
          { name: "API Connections", path: "/templates/saas/integrations/api-connections" },
          { name: "OAuth Apps", path: "/templates/saas/integrations/oauth-apps" },
          { name: "Settings", path: "/templates/saas/integrations/settings" },
        ],
      },
      {
        name: "Data Management",
        subItems: [
          { name: "Export Jobs", path: "/templates/saas/data-management/export-jobs" },
          { name: "Import Templates", path: "/templates/saas/data-management/import-templates" },
          { name: "Data Mapping", path: "/templates/saas/data-management/data-mapping" },
          { name: "History", path: "/templates/saas/data-management/history" },
        ],
      },
      {
        name: "Custom Report Builder",
        subItems: [
          { name: "Builder", path: "/templates/saas/custom-report-builder/builder" },
          { name: "Saved Reports", path: "/templates/saas/custom-report-builder/saved-reports" },
          { name: "Templates", path: "/templates/saas/custom-report-builder/templates" },
          { name: "Data Sources", path: "/templates/saas/custom-report-builder/data-sources" },
          { name: "Sharing", path: "/templates/saas/custom-report-builder/sharing" },
        ],
      },
      {
        name: "White-Label",
        subItems: [
          { name: "Branding", path: "/templates/saas/white-label/branding" },
          { name: "Domain Settings", path: "/templates/saas/white-label/domain-settings" },
          { name: "Email Customization", path: "/templates/saas/white-label/email-customization" },
          { name: "Theme Settings", path: "/templates/saas/white-label/theme-settings" },
          { name: "Custom CSS", path: "/templates/saas/white-label/custom-css" },
        ],
      },
      {
        name: "Billing & Plans",
        subItems: [
          { name: "Billing Dashboard", path: "/billing" },
          { name: "Cancel Subscription", path: "/templates/saas/billing/cancel-subscription" },
          { name: "Upgrade to Pro", path: "/templates/saas/billing/upgrade-to-pro" },
          { name: "Update Billing Address", path: "/templates/saas/billing/update-billing-address" },
          { name: "Add New Card", path: "/templates/saas/billing/add-new-card" },
        ],
      },
      { name: "Analytics", path: "/analytics" },
    ],
  },
];`;

    // Replace the navItems array (handle both with and without type annotation)
    sidebarContent = sidebarContent.replace(
      /const navItems:? ?NavItem\[\]? = \[[\s\S]*?\];/,
      saasOnlyNavItems.replace('const navItems = [', 'const navItems: NavItem[] = [')
    );
    
    // Remove othersItems and supportItems sections
    sidebarContent = sidebarContent.replace(
      /const othersItems: NavItem\[\] = \[[\s\S]*?\];/,
      '// Removed othersItems and supportItems - only SaaS template needed'
    );
    
    sidebarContent = sidebarContent.replace(
      /const supportItems: NavItem\[\] = \[[\s\S]*?\];/,
      ''
    );
    
    // Update icon imports to include ShootingStarIcon
    if (!sidebarContent.includes('ShootingStarIcon')) {
      sidebarContent = sidebarContent.replace(
        /import \{[\s\S]*?\} from "\.\.\/icons";/,
        (match) => {
          if (!match.includes('ShootingStarIcon')) {
            return match.replace('}', '  ShootingStarIcon,\n}');
          }
          return match;
        }
      );
    }
    
    // Simplify the navigation rendering to only show main menu
    const simplifiedNavRendering = `
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className={\`mb-4 text-xs uppercase flex leading-5 text-gray-400 \${
                  !isExpanded && !isHovered
                    ? "xl:justify-center"
                    : "justify-start"
                }\`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  "Menu"
                ) : (
                  <HorizontaLDots />
                )}
              </h2>
              {renderMenuItems(navItems, "main")}
            </div>
          </div>
        </nav>`;
    
    sidebarContent = sidebarContent.replace(
      /<nav className="mb-6">[\s\S]*?<\/nav>/,
      simplifiedNavRendering
    );
    
    // Simplify the useEffect for submenu matching
    const simplifiedUseEffect = `
  useEffect(() => {
    // Check if the current path matches any submenu item
    let submenuMatched = false;
    navItems.forEach((nav, index) => {
      if (nav.subItems) {
        nav.subItems.forEach((subItem) => {
          if (isActive(subItem.path)) {
            setOpenSubmenu({
              type: "main",
              index,
            });
            submenuMatched = true;
          }
        });
      }
    });

    // If no submenu item matches, close the open submenu
    if (!submenuMatched) {
      setOpenSubmenu(null);
    }
  }, [pathname, isActive]);`;
    
    sidebarContent = sidebarContent.replace(
      /useEffect\(\(\) => \{[\s\S]*?\}, \[pathname, isActive\]\);/,
      simplifiedUseEffect
    );
    
    fs.writeFileSync(sidebarPath, sidebarContent);
  }
}

function addBuildCaching() {
  const nextConfigPath = path.join(OUTPUT_DIR, 'next.config.ts');
  if (fs.existsSync(nextConfigPath)) {
    let configContent = fs.readFileSync(nextConfigPath, 'utf8');
    
    // Add caching configuration for standalone deployment
    const cachingConfig = `
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Set correct workspace root for standalone repository
  outputFileTracingRoot: path.join(__dirname),
  
  // Enable caching for better performance
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  // Enable image optimization
  images: {
    domains: ['localhost'],
    formats: ['image/webp', 'image/avif'],
  },
  // Enable compression
  compress: true,
  // Enable static optimization
  trailingSlash: false,
  // SWC minification is enabled by default in Next.js 15
};`;
    
    // Replace the existing config
    configContent = configContent.replace(
      /\/\*\* @type \{import\('next'\)\.NextConfig\} \*\/[\s\S]*?const nextConfig = \{[\s\S]*?\};/,
      cachingConfig
    );
    
    // Add path import if not present
    if (!configContent.includes("import path from 'path';")) {
      configContent = configContent.replace(
        "import type { NextConfig } from 'next';",
        "import type { NextConfig } from 'next';\nimport path from 'path';"
      );
    }
    
    fs.writeFileSync(nextConfigPath, configContent);
  }
}

function integrateAdminLayoutIntoMain() {
  const layoutPath = path.join(OUTPUT_DIR, 'src/app/layout.tsx');
  if (fs.existsSync(layoutPath)) {
    let layoutContent = fs.readFileSync(layoutPath, 'utf8');
    
    // Add imports for AppHeader and AppSidebar
    if (!layoutContent.includes("import AppHeader")) {
      layoutContent = layoutContent.replace(
        "import { ThemeProvider } from \"@/context/ThemeContext\";",
        "import { ThemeProvider } from \"@/context/ThemeContext\";\nimport AppHeader from \"@/layout/AppHeader\";\nimport AppSidebar from \"@/layout/AppSidebar\";"
      );
    }
    
    // Replace the body content to include admin layout
    const newBodyContent = `      <body className={\`\${outfit.className} dark:bg-gray-900\`}>
        <ThemeProvider>
          <SidebarProvider>
            <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
              <AppSidebar />
              <div className="flex-1 flex flex-col overflow-hidden">
                <AppHeader />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-gray-900">
                  {children}
                </main>
              </div>
            </div>
          </SidebarProvider>
        </ThemeProvider>
      </body>`;
    
    // Replace the existing body content
    layoutContent = layoutContent.replace(
      /<body className=\{`\${outfit\.className} dark:bg-gray-900`\}>[\s\S]*?<\/body>/,
      newBodyContent
    );
    
    fs.writeFileSync(layoutPath, layoutContent);
  }
}

function createVercelConfig() {
  // Simplified Vercel config that works with Next.js App Router
  const vercelConfig = {
    version: 2,
    env: {
      NODE_ENV: "production"
    }
  };
  
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'vercel.json'),
    JSON.stringify(vercelConfig, null, 2)
  );
}

function createLicense() {
  const licenseContent = `MIT License

Copyright (c) 2025 TinAdmin

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;
  
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'LICENSE'),
    licenseContent
  );
}

function createGitignore() {
  const gitignoreContent = `# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Next.js
.next/
out/
build/
dist/

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Vercel
.vercel

# TypeScript
*.tsbuildinfo
next-env.d.ts

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
logs
*.log

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/

# nyc test coverage
.nyc_output

# Dependency directories
jspm_packages/

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Microbundle cache
.rpt2_cache/
.rts2_cache_cjs/
.rts2_cache_es/
.rts2_cache_umd/

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# parcel-bundler cache (https://parceljs.org/)
.cache
.parcel-cache

# next.js build output
.next

# nuxt.js build output
.nuxt

# vuepress build output
.vuepress/dist

# Serverless directories
.serverless

# FuseBox cache
.fusebox/

# DynamoDB Local files
.dynamodb/

# TernJS port file
.tern-port

# Stores VSCode versions used for testing VSCode extensions
.vscode-test

# Temporary folders
tmp/
temp/`;
  
  fs.writeFileSync(
    path.join(OUTPUT_DIR, '.gitignore'),
    gitignoreContent
  );
}

function createGitHubWorkflow() {
  const workflowDir = path.join(OUTPUT_DIR, '.github/workflows');
  ensureDirectoryExists(workflowDir);
  
  const workflowContent = `name: Deploy to Vercel

on:
  push:
    branches:
      - develop
  pull_request:
    branches:
      - develop

env:
  VERCEL_ORG_ID: \${{ secrets.VERCEL_ORG_ID }}
  VERCEL_PROJECT_ID: \${{ secrets.VERCEL_PROJECT_ID }}

jobs:
  deploy-preview:
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Vercel CLI
        run: npm install --global vercel@latest

      - name: Pull Vercel Environment Information
        run: vercel pull --yes --environment=preview --token=\${{ secrets.VERCEL_TOKEN }}

      - name: Build Project Artifacts
        run: vercel build --token=\${{ secrets.VERCEL_TOKEN }}

      - name: Deploy Preview to Vercel
        run: vercel deploy --prebuilt --token=\${{ secrets.VERCEL_TOKEN }}

  deploy-production:
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/develop'
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run build
        run: npm run build

      - name: Install Vercel CLI
        run: npm install --global vercel@latest

      - name: Pull Vercel Environment Information
        run: vercel pull --yes --environment=production --token=\${{ secrets.VERCEL_TOKEN }}

      - name: Build Project Artifacts
        run: vercel build --prod --token=\${{ secrets.VERCEL_TOKEN }}

      - name: Deploy Production to Vercel
        id: deploy
        run: |
          url=$(vercel deploy --prebuilt --prod --token=\${{ secrets.VERCEL_TOKEN }})
          echo "deployment_url=$url" >> $GITHUB_OUTPUT

      - name: Comment deployment URL
        uses: actions/github-script@v7
        if: github.event_name == 'push'
        with:
          script: |
            const deploymentUrl = '\${{ steps.deploy.outputs.deployment_url }}';
            const message = \\\`✅ Successfully deployed to Vercel!

🔗 **Deployment URL**: \\\${deploymentUrl}\\\`;
            
            // Create a commit status
            github.rest.repos.createCommitStatus({
              owner: context.repo.owner,
              repo: context.repo.repo,
              sha: context.sha,
              state: 'success',
              target_url: deploymentUrl,
              description: 'Deployed to Vercel',
              context: 'vercel/deployment'
            });
`;
  
  fs.writeFileSync(
    path.join(workflowDir, 'deploy-vercel.yml'),
    workflowContent
  );
  
  // Create setup guide
  const setupGuideContent = `# Vercel CI/CD Setup Guide

This guide will help you set up automatic deployments to Vercel when pushing to the \`develop\` branch.

## Required GitHub Secrets

Add these secrets to your GitHub repository (Settings → Secrets and variables → Actions):

1. **VERCEL_TOKEN** - Get from https://vercel.com/account/tokens
2. **VERCEL_ORG_ID** - Found in .vercel/project.json after running \`vercel link\`
3. **VERCEL_PROJECT_ID** - Found in .vercel/project.json after running \`vercel link\`

## Quick Setup

\`\`\`bash
# Login to Vercel
vercel login

# Link your project
vercel link

# View project details
cat .vercel/project.json
\`\`\`

## Workflow Behavior

- **Push to develop**: Automatically deploys to production
- **Pull request to develop**: Creates preview deployment

For detailed instructions, see .github/VERCEL_SETUP.md
`;
  
  fs.writeFileSync(
    path.join(OUTPUT_DIR, '.github/VERCEL_SETUP.md'),
    setupGuideContent
  );
}

function createBinDirectory() {
  const binDir = path.join(OUTPUT_DIR, 'bin');
  ensureDirectoryExists(binDir);
  
  const createScriptContent = `#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function log(message, type = 'info') {
  const icons = {
    info: '📝',
    success: '✅',
    warning: '⚠️',
    error: '❌',
    progress: '🔄'
  };
  console.log(\`\${icons[type]} \${message}\`);
}

function createSaaSProject() {
  const projectName = process.argv[2];

  if (!projectName) {
    log('Please specify the project directory: npx tinadmin-saas-template <project-name>', 'error');
    process.exit(1);
  }

  const projectPath = path.resolve(process.cwd(), projectName);
  const templateDir = path.dirname(__dirname); // This points to the template directory

  log(\`🚀 Creating new SaaS project: \${projectName}\`, 'progress');

  try {
    // Create project directory
    fs.mkdirSync(projectPath, { recursive: true });

    log('📁 Copying template files...', 'progress');

    // Copy all template files except node_modules, .git, and this bin directory
    const itemsToCopy = fs.readdirSync(templateDir);

    for (const item of itemsToCopy) {
      const srcPath = path.join(templateDir, item);
      const destPath = path.join(projectPath, item);

      // Skip certain directories and files
      if (['node_modules', '.git', 'bin', '.next', 'dist', projectName].includes(item)) {
        continue;
      }

      // Skip if source and destination are the same (avoid circular copying)
      if (path.resolve(srcPath) === path.resolve(destPath)) {
        continue;
      }

      if (fs.statSync(srcPath).isDirectory()) {
        fs.cpSync(srcPath, destPath, { recursive: true });
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }

    // Update package.json with the new project name
    const packageJsonPath = path.join(projectPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      packageJson.name = projectName;
      packageJson.description = \`\${projectName} - SaaS administration platform with multi-tenant support, billing, and integrations\`;
      packageJson.private = true;

      // Remove template-specific fields
      delete packageJson.bin;
      delete packageJson.files;
      delete packageJson.homepage;
      delete packageJson.repository;
      delete packageJson.bugs;
      delete packageJson.publishConfig;
      delete packageJson.keywords;
      delete packageJson.author;
      delete packageJson.license;

      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    }

    console.log('✅ Project created successfully!');
    console.log('');
    console.log('📋 Next steps:');
    console.log(\`   cd \${projectName}\`);
    console.log('   npm install');
    console.log('   npm run dev');
    console.log('');
    console.log('🌐 Open http://localhost:3000 to view your SaaS application');
    console.log('');
    console.log('📚 Documentation:');
    console.log('   - README.md - Getting started guide');
    console.log('   - DEPLOYMENT.md - Deployment instructions');

  } catch (error) {
    log(\`❌ Failed to create project: \${error.message}\`, 'error');
    process.exit(1);
  }
}

if (require.main === module) {
  createSaaSProject();
}`;
  
  fs.writeFileSync(
    path.join(binDir, 'create-saas.js'),
    createScriptContent
  );
  
  // Make the script executable
  try {
    execSync(`chmod +x ${path.join(binDir, 'create-saas.js')}`);
  } catch (error) {
    log(`Warning: Could not make script executable: ${error.message}`, 'warning');
  }
}

// GitHub deployment configuration
const GITHUB_CONFIG = {
  repository: 'tindevelopers/adminpanel-template-saas-next-js',
  branch: 'develop', // ALWAYS use develop branch - never main
  remoteUrl: 'git@github.com:tindevelopers/adminpanel-template-saas-next-js.git',
  protectedBranches: ['main', 'master'] // Branches that should never be modified
};

// Safety function to prevent operations on protected branches
function validateBranchSafety() {
  const currentBranch = process.env.GIT_BRANCH || 'develop';
  
  if (GITHUB_CONFIG.protectedBranches.includes(currentBranch)) {
    log(`❌ ERROR: Cannot operate on protected branch '${currentBranch}'`, 'error');
    log(`Protected branches: ${GITHUB_CONFIG.protectedBranches.join(', ')}`, 'error');
    log(`This script only operates on the '${GITHUB_CONFIG.branch}' branch for safety.`, 'error');
    process.exit(1);
  }
  
  log(`✅ Branch safety check passed. Operating on: ${GITHUB_CONFIG.branch}`, 'success');
}

// GitHub deployment functions
function initializeGitRepository(outputDir) {
  log('Initializing Git repository...', 'progress');
  
  try {
    // Initialize git repository
    execSync('git init', { cwd: outputDir, stdio: 'pipe' });
    
    // Add remote origin
    execSync(`git remote add origin ${GITHUB_CONFIG.remoteUrl}`, { 
      cwd: outputDir, 
      stdio: 'pipe' 
    });
    
    log('Git repository initialized', 'success');
    return true;
  } catch (error) {
    log(`Failed to initialize Git repository: ${error.message}`, 'error');
    return false;
  }
}

function commitAndPushToGitHub(outputDir, commitMessage = 'Update SaaS template') {
  log('Committing and pushing to GitHub...', 'progress');
  
  try {
    // Add all files
    execSync('git add .', { cwd: outputDir, stdio: 'pipe' });
    
    // Check if there are changes to commit
    try {
      const status = execSync('git status --porcelain', { 
        cwd: outputDir, 
        encoding: 'utf8' 
      });
      
      if (!status.trim()) {
        log('No changes to commit', 'warning');
        return true;
      }
    } catch (error) {
      // Continue with commit even if status check fails
    }
    
    // Commit changes
    execSync(`git commit -m "${commitMessage}"`, { 
      cwd: outputDir, 
      stdio: 'pipe' 
    });
    
    // Ensure we're on the correct branch before pushing
    try {
      const currentBranch = execSync('git branch --show-current', { 
        cwd: outputDir, 
        encoding: 'utf8' 
      }).trim();
      
      if (currentBranch !== GITHUB_CONFIG.branch) {
        log(`Switching to ${GITHUB_CONFIG.branch} branch...`, 'progress');
        execSync(`git checkout -b ${GITHUB_CONFIG.branch}`, { 
          cwd: outputDir, 
          stdio: 'pipe' 
        });
      }
    } catch (error) {
      log(`Warning: Could not verify branch: ${error.message}`, 'warning');
    }
    
    // Push to develop branch (ALWAYS develop, never main)
    execSync(`git push -u origin ${GITHUB_CONFIG.branch}`, { 
      cwd: outputDir, 
      stdio: 'pipe' 
    });
    
    log(`Successfully pushed to GitHub repository: ${GITHUB_CONFIG.repository}`, 'success');
    log(`Branch: ${GITHUB_CONFIG.branch}`, 'info');
    return true;
  } catch (error) {
    log(`Failed to commit and push to GitHub: ${error.message}`, 'error');
    
    // Try to handle common Git issues
    if (error.message.includes('fatal: not a git repository')) {
      log('Attempting to reinitialize Git repository...', 'progress');
      if (initializeGitRepository(outputDir)) {
        return commitAndPushToGitHub(outputDir, commitMessage);
      }
    }
    
    return false;
  }
}

function publishToNPM(outputDir) {
  log('Publishing to NPM...', 'progress');
  
  try {
    // Check if package is already published
    try {
      execSync(`npm view ${require(path.join(outputDir, 'package.json')).name}`, { 
        stdio: 'pipe' 
      });
      log('Package already exists on NPM, updating version...', 'info');
      
      // Update version
      execSync('npm version patch', { cwd: outputDir, stdio: 'inherit' });
    } catch (error) {
      log('Package not found on NPM, publishing new package...', 'info');
    }
    
    // Publish to NPM
    execSync('npm publish', { cwd: outputDir, stdio: 'inherit' });
    
    log('Successfully published to NPM', 'success');
    return true;
  } catch (error) {
    log(`Failed to publish to NPM: ${error.message}`, 'error');
    return false;
  }
}

function deployToGitHub(outputDir, shouldPublishNPM = false) {
  log('Starting GitHub deployment process...', 'progress');
  
  // Safety check - ensure we never operate on protected branches
  validateBranchSafety();
  
  const success = {
    git: false,
    npm: false
  };
  
  // Initialize Git and push to GitHub
  if (initializeGitRepository(outputDir)) {
    const commitMessage = `Update ${TEMPLATE_DISPLAY_NAME} template - ${new Date().toISOString()}`;
    success.git = commitAndPushToGitHub(outputDir, commitMessage);
  }
  
  // Publish to NPM if requested
  if (shouldPublishNPM && success.git) {
    success.npm = publishToNPM(outputDir);
  }
  
  // Summary
  log('Deployment Summary:', 'info');
  log(`  GitHub: ${success.git ? '✅ Success' : '❌ Failed'}`, 'info');
  if (shouldPublishNPM) {
    log(`  NPM: ${success.npm ? '✅ Success' : '❌ Failed'}`, 'info');
  }
  
  if (success.git) {
    log(`🔗 Repository: https://github.com/${GITHUB_CONFIG.repository}`, 'info');
    log(`🌿 Branch: ${GITHUB_CONFIG.branch}`, 'info');
  }
  
  return success;
}

// Main extraction function
function extractTemplate() {
  log(`Starting ${TEMPLATE_DISPLAY_NAME} template extraction...`, 'progress');
  
  // Clean output directory
  if (fs.existsSync(OUTPUT_DIR)) {
    log(`Cleaning existing output directory: ${OUTPUT_DIR}`, 'info');
    fs.rmSync(OUTPUT_DIR, { recursive: true });
  }
  
  // Create output directory
  ensureDirectoryExists(OUTPUT_DIR);
  log(`Created output directory: ${OUTPUT_DIR}`, 'success');
  
  // Copy files and directories
  log('Copying template files...', 'progress');
  FILES_TO_COPY.forEach(file => {
    const srcPath = path.resolve(file);
    const destPath = path.join(OUTPUT_DIR, file);
    
    if (fs.existsSync(srcPath)) {
      copyFileOrDirectory(srcPath, destPath);
      log(`Copied: ${file}`, 'success');
    } else {
      log(`Skipped (not found): ${file}`, 'warning');
    }
  });
  
  // Copy selective icons
  log('Copying selective icons...', 'progress');
  ensureDirectoryExists(path.join(OUTPUT_DIR, 'src/icons'));
  ICONS_TO_COPY.forEach(iconFile => {
    const srcPath = path.resolve(iconFile);
    const destPath = path.join(OUTPUT_DIR, iconFile);
    
    if (fs.existsSync(srcPath)) {
      copyFileOrDirectory(srcPath, destPath);
      log(`Copied icon: ${iconFile}`, 'success');
    } else {
      log(`Skipped icon (not found): ${iconFile}`, 'warning');
    }
  });
  
  // Create package.json
  log('Creating package.json...', 'progress');
  const packageJson = createPackageJson();
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );
  log('Created package.json', 'success');
  
  // Create main page
  log('Creating main page...', 'progress');
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'src/app/page.tsx'),
    createMainPage()
  );
  log('Created main page', 'success');
  
  // Integrate admin layout into main layout (no separate route group)
  log('Integrating admin layout into main layout...', 'progress');
  integrateAdminLayoutIntoMain();
  log('Integrated admin layout into main layout', 'success');
  
  // Create documentation
  log('Creating documentation...', 'progress');
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'README.md'),
    createReadme()
  );
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'DEPLOYMENT.md'),
    createDeploymentGuide()
  );
  log('Created documentation', 'success');
  
  // Modify AppSidebar for SaaS only
  log('Modifying navigation...', 'progress');
  modifyAppSidebar();
  log('Modified navigation', 'success');
  
  // Add build caching configuration
  log('Adding build caching configuration...', 'progress');
  addBuildCaching();
  log('Added build caching configuration', 'success');
  
  // Create Vercel configuration
  log('Creating Vercel configuration...', 'progress');
  createVercelConfig();
  log('Created Vercel configuration', 'success');
  
  // Create .gitignore for standalone
  log('Creating .gitignore...', 'progress');
  createGitignore();
  log('Created .gitignore', 'success');
  
  // Create LICENSE file
  log('Creating LICENSE file...', 'progress');
  createLicense();
  log('Created LICENSE file', 'success');
  
  // Create bin directory with executable script
  log('Creating bin directory with executable script...', 'progress');
  createBinDirectory();
  log('Created bin directory with executable script', 'success');
  
  // Create GitHub Actions workflow for Vercel deployment
  log('Creating GitHub Actions workflow for Vercel deployment...', 'progress');
  createGitHubWorkflow();
  log('Created GitHub Actions workflow for Vercel deployment', 'success');
  
  // Install dependencies
  log('Installing dependencies...', 'progress');
  try {
    execSync('npm install', { 
      cwd: OUTPUT_DIR, 
      stdio: 'inherit' 
    });
    log('Dependencies installed successfully', 'success');
  } catch (error) {
    log(`Failed to install dependencies: ${error.message}`, 'error');
    log('Please run "npm install" manually in the output directory', 'warning');
  }
  
  log(`🎉 ${TEMPLATE_DISPLAY_NAME} template extraction completed!`, 'success');
  log(`📁 Output directory: ${OUTPUT_DIR}`, 'info');
  
  // Deploy to GitHub if requested
  if (SHOULD_DEPLOY_GITHUB) {
    log('', 'info');
    log('🚀 Starting GitHub deployment...', 'progress');
    const deploymentSuccess = deployToGitHub(OUTPUT_DIR, SHOULD_PUBLISH_NPM);
    
    if (deploymentSuccess.git) {
      log('', 'info');
      log('✅ Template successfully deployed to GitHub!', 'success');
      log(`🔗 Repository: https://github.com/${GITHUB_CONFIG.repository}`, 'info');
      log(`🌿 Branch: ${GITHUB_CONFIG.branch}`, 'info');
    }
  }
  
  log('', 'info');
  log('🚀 Next steps:', 'info');
  log('   1. cd ' + OUTPUT_DIR, 'info');
  log('   2. npm run dev', 'info');
  log('   3. Open http://localhost:3000', 'info');
  log('', 'info');
  log('📚 Documentation available in README.md and DEPLOYMENT.md', 'info');
  
  if (!SHOULD_DEPLOY_GITHUB) {
    log('', 'info');
    log('💡 To deploy to GitHub, run with --deploy-github flag', 'info');
    log('💡 To also publish to NPM, add --publish-npm flag', 'info');
  }
}

// Run extraction
if (require.main === module) {
  extractTemplate();
}

module.exports = { extractTemplate };
