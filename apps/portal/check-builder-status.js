#!/usr/bin/env node
/**
 * Check Builder.io Configuration Status
 * 
 * This script checks if Builder.io is properly configured
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Builder.io Configuration Status\n');
console.log('=' .repeat(50));

// Check environment variables
const envPath = path.join(__dirname, '.env.local');
let envVars = {};

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      if (key.includes('BUILDER')) {
        envVars[key] = value;
      }
    }
  });
}

console.log('\n📋 Environment Variables:');
if (Object.keys(envVars).length === 0) {
  console.log('  ❌ No Builder.io environment variables found in .env.local');
} else {
  Object.entries(envVars).forEach(([key, value]) => {
    const displayValue = key.includes('KEY') ? `${value.substring(0, 10)}...` : value;
    console.log(`  ✅ ${key}: ${displayValue}`);
  });
}

// Check builder.config.ts
const configPath = path.join(__dirname, 'builder.config.ts');
console.log('\n📄 Configuration Files:');
if (fs.existsSync(configPath)) {
  console.log('  ✅ builder.config.ts exists');
  const configContent = fs.readFileSync(configPath, 'utf8');
  if (configContent.includes('NEXT_PUBLIC_BUILDER_API_KEY')) {
    console.log('  ✅ References NEXT_PUBLIC_BUILDER_API_KEY');
  }
} else {
  console.log('  ❌ builder.config.ts not found');
}

// Check BuilderComponent
const componentPath = path.join(__dirname, 'components/builder/BuilderComponent.tsx');
if (fs.existsSync(componentPath)) {
  console.log('  ✅ BuilderComponent.tsx exists');
} else {
  console.log('  ❌ BuilderComponent.tsx not found');
}

// Check API routes
const apiRoutePath = path.join(__dirname, 'app/api/builder/route.ts');
if (fs.existsSync(apiRoutePath)) {
  console.log('  ✅ API route exists at app/api/builder/route.ts');
} else {
  console.log('  ❌ API route not found');
}

// Check package.json dependencies
const packagePath = path.join(__dirname, 'package.json');
if (fs.existsSync(packagePath)) {
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  console.log('\n📦 Dependencies:');
  if (packageJson.dependencies && packageJson.dependencies['@builder.io/react']) {
    console.log(`  ✅ @builder.io/react: ${packageJson.dependencies['@builder.io/react']}`);
  } else {
    console.log('  ❌ @builder.io/react not found in dependencies');
  }
}

console.log('\n' + '='.repeat(50));
console.log('\n💡 Next Steps:');
if (!envVars.NEXT_PUBLIC_BUILDER_API_KEY) {
  console.log('  1. Add NEXT_PUBLIC_BUILDER_API_KEY to .env.local');
}
console.log('  2. Run: pnpm dev');
console.log('  3. Test Builder.io connection in Builder.io dashboard');
console.log('  4. Check Builder.io project settings for correct dev command\n');


