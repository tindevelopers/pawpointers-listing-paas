# TinAdmin Developer Guide

## 🏗️ Multi-Template Architecture

This guide covers the development, customization, and extension of TinAdmin's multi-template system.

## 📁 Project Structure

```
tinadmin-master-admin-panel/
├── src/                    # Core application code
│   ├── app/               # Next.js app router pages
│   ├── components/        # Reusable UI components
│   ├── context/          # React context providers
│   ├── layout/           # Layout components
│   └── lib/              # Utility functions
├── templates/             # Industry-specific templates
│   ├── ecommerce/        # E-commerce template
│   ├── healthcare/       # Healthcare template
│   ├── finance/          # Finance template
│   ├── education/        # Education template
│   └── saas/             # SaaS template
├── packages/              # NPM packages
│   └── create-tinadmin/  # CLI tool
├── scripts/               # Build and automation scripts
├── docs/                  # Documentation
└── dist/                  # Built templates
```

## 🚀 Development Workflow

### 1. Environment Setup

```bash
# Clone the repository
git clone https://github.com/tindevelopers/tinadmin-master-admin-panel.git
cd tinadmin-master-admin-panel

# Install dependencies
npm install

# Start development server
npm run dev
```

### 2. Branch Strategy

- **main**: Production-ready code
- **develop**: Integration branch for features
- **staging**: Pre-production testing
- **feature/***: Individual feature development

### 3. Creating New Templates

```bash
# Create a new template
npm run template:create <template-name>

# Example: Create a restaurant template
npm run template:create restaurant
```

### 4. Template Development Process

1. **Define Template Requirements**
   ```json
   {
     "name": "TinAdmin Restaurant",
     "description": "Restaurant management dashboard",
     "features": ["menu", "orders", "inventory", "staff"],
     "theme": {
       "colors": {
         "primary": "#FF6B35",
         "secondary": "#F7931E"
       }
     }
   }
   ```

2. **Create Template Components**
   - Copy base components to template directory
   - Customize for industry-specific needs
   - Add template-specific widgets and charts

3. **Configure Template Settings**
   - Update navigation menus
   - Customize color schemes
   - Add industry-specific data models

4. **Test Template**
   ```bash
   npm run template:build <template-name>
   npm run dev
   ```

5. **Package and Publish**
   ```bash
   npm run publish:template <template-name>
   ```

## 🎨 Component Architecture

### Core Components
Located in `src/components/`, these are shared across all templates:

```typescript
// Base component structure
interface BaseComponent {
  className?: string;
  children?: React.ReactNode;
  variant?: 'default' | 'primary' | 'secondary';
}

// Example: Reusable Card component
export const Card: React.FC<BaseComponent> = ({ 
  className, 
  children, 
  variant = 'default' 
}) => {
  return (
    <div className={cn('card', `card-${variant}`, className)}>
      {children}
    </div>
  );
};
```

### Template-Specific Components
Located in `templates/[template-name]/components/`:

```typescript
// Template-specific component
interface EcommerceProductCard {
  product: Product;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export const EcommerceProductCard: React.FC<EcommerceProductCard> = ({
  product,
  onEdit,
  onDelete
}) => {
  // E-commerce specific implementation
};
```

## 🔧 Template Configuration

### Template Config Structure

```typescript
interface TemplateConfig {
  name: string;
  description: string;
  version: string;
  features: string[];
  theme: {
    colors: {
      primary: string;
      secondary: string;
      accent?: string;
    };
    fonts?: {
      primary: string;
      secondary?: string;
    };
  };
  navigation: {
    main: NavigationItem[];
    footer?: NavigationItem[];
  };
  widgets: {
    dashboard: Widget[];
    sidebar?: Widget[];
  };
}
```

### Creating Template Config

```javascript
// scripts/create-template.js
function generateTemplateConfig(templateDir, template) {
  const config = {
    name: template.name,
    description: template.description,
    version: '1.0.0',
    features: template.features,
    theme: {
      colors: template.colors,
      fonts: {
        primary: 'Inter',
        secondary: 'Poppins'
      }
    },
    navigation: generateNavigation(template.features),
    widgets: generateWidgets(template.features)
  };

  fs.writeFileSync(
    path.join(templateDir, 'template.config.json'),
    JSON.stringify(config, null, 2)
  );
}
```

## 🎯 Building and Packaging

### Build Process

1. **Template Building**
   ```bash
   # Build specific template
   npm run template:build ecommerce
   
   # Build all templates
   npm run template:build all
   ```

2. **Package Creation**
   ```bash
   # Create NPM package
   npm run publish:template ecommerce
   ```

### Build Scripts

```javascript
// scripts/build-template.js
function buildTemplate(templateType) {
  const templateDir = path.join(__dirname, '..', 'templates', templateType);
  const buildDir = path.join(__dirname, '..', 'dist', templateType);

  // Copy template files
  copyTemplateFiles(templateDir, buildDir);
  
  // Install dependencies
  installDependencies(buildDir);
  
  // Build the template
  buildTemplate(buildDir);
  
  // Create package.json for NPM
  createPackageJson(buildDir, templateType);
}
```

## 📦 NPM Package Management

### Package Structure

```json
{
  "name": "@tinadmin/template-ecommerce",
  "version": "1.0.0",
  "description": "TinAdmin E-commerce dashboard template",
  "main": "dist/index.js",
  "files": [
    "dist/",
    "public/",
    "src/",
    "package.json",
    "README.md"
  ],
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "^15.4.3",
    "react": "^19.0.0",
    "tailwindcss": "^4.0.0"
  }
}
```

### Publishing Workflow

```bash
# 1. Build template
npm run template:build ecommerce

# 2. Navigate to build directory
cd dist/ecommerce

# 3. Publish to NPM
npm publish

# 4. Update version
npm version patch

# 5. Republish
npm publish
```

## 🧪 Testing Strategy

### Unit Testing
```bash
# Run unit tests
npm test

# Run tests with coverage
npm run test:coverage
```

### Template Testing
```bash
# Test template builds
npm run test:templates

# Test template functionality
npm run test:template:functionality
```

### Integration Testing
```bash
# Test CLI installation
npm run test:cli

# Test template installation
npm run test:installation
```

## 🔄 CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/template-ci.yml
name: Template CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test-templates:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20.x'
      - name: Install dependencies
        run: npm ci
      - name: Test templates
        run: npm run test:templates
      - name: Build templates
        run: npm run template:build all
```

## 📚 Advanced Customization

### Custom Theme Development

```css
/* templates/custom-theme/globals.css */
:root {
  --primary: #your-primary-color;
  --secondary: #your-secondary-color;
  --accent: #your-accent-color;
  --background: #your-background-color;
  --foreground: #your-foreground-color;
}

.dark {
  --primary: #your-dark-primary;
  --secondary: #your-dark-secondary;
  /* ... other dark theme variables */
}
```

### Custom Component Development

```typescript
// Custom widget component
interface CustomWidgetProps {
  data: any[];
  config: WidgetConfig;
}

export const CustomWidget: React.FC<CustomWidgetProps> = ({ data, config }) => {
  return (
    <div className="custom-widget">
      {/* Your custom implementation */}
    </div>
  );
};
```

### Plugin System

```typescript
// Plugin interface
interface TinAdminPlugin {
  name: string;
  version: string;
  install: (app: TinAdminApp) => void;
  uninstall: () => void;
}

// Plugin registration
class PluginManager {
  private plugins: Map<string, TinAdminPlugin> = new Map();
  
  register(plugin: TinAdminPlugin) {
    this.plugins.set(plugin.name, plugin);
  }
  
  install(pluginName: string, app: TinAdminApp) {
    const plugin = this.plugins.get(pluginName);
    if (plugin) {
      plugin.install(app);
    }
  }
}
```

## 🚀 Performance Optimization

### Bundle Optimization
```javascript
// next.config.js
module.exports = {
  experimental: {
    optimizePackageImports: ['@tinadmin/core'],
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@tinadmin/core': path.resolve(__dirname, 'packages/core'),
    };
    return config;
  },
};
```

### Code Splitting
```typescript
// Dynamic imports for large components
const HeavyChart = dynamic(() => import('./HeavyChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false
});
```

## 🔐 Security Best Practices

### Input Validation
```typescript
import { z } from 'zod';

const TemplateConfigSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  features: z.array(z.string()).min(1),
});

export function validateTemplateConfig(config: unknown) {
  return TemplateConfigSchema.parse(config);
}
```

### Dependency Security
```bash
# Regular security audits
npm audit

# Fix vulnerabilities
npm audit fix

# Check for outdated packages
npm outdated
```

## 📖 Documentation Standards

### Component Documentation
```typescript
/**
 * ProductCard component for displaying product information
 * 
 * @param product - Product data object
 * @param onEdit - Callback function for edit action
 * @param onDelete - Callback function for delete action
 * @param variant - Visual variant of the card
 * 
 * @example
 * ```tsx
 * <ProductCard 
 *   product={productData}
 *   onEdit={(id) => handleEdit(id)}
 *   onDelete={(id) => handleDelete(id)}
 *   variant="default"
 * />
 * ```
 */
export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onEdit,
  onDelete,
  variant = 'default'
}) => {
  // Component implementation
};
```

### API Documentation
```typescript
/**
 * Template API for managing templates
 */
export class TemplateAPI {
  /**
   * Creates a new template from configuration
   * 
   * @param config - Template configuration object
   * @returns Promise<Template> - Created template instance
   * 
   * @throws {ValidationError} When config is invalid
   * @throws {TemplateError} When template creation fails
   */
  async createTemplate(config: TemplateConfig): Promise<Template> {
    // Implementation
  }
}
```

## 🆘 Troubleshooting

### Common Issues

1. **Template Build Failures**
   ```bash
   # Clear build cache
   rm -rf .next dist
   npm run template:build <template-name>
   ```

2. **NPM Publishing Issues**
   ```bash
   # Check NPM authentication
   npm whoami
   
   # Login to NPM
   npm login
   ```

3. **Dependency Conflicts**
   ```bash
   # Clear node_modules
   rm -rf node_modules package-lock.json
   npm install
   ```

### Debug Mode
```bash
# Enable debug logging
DEBUG=tinadmin:* npm run dev

# Template-specific debugging
DEBUG=tinadmin:template npm run template:build
```

---

**Ready to contribute?** Check out our [Contributing Guidelines](CONTRIBUTING.md) and start building amazing templates! 🚀
