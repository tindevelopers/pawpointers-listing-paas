#!/usr/bin/env node

/**
 * Post-build script to add .js extensions to ESM imports in compiled files
 * This is required for Node.js ESM module resolution
 */

const fs = require('fs');
const path = require('path');

function addJsExtensions(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    
    if (file.isDirectory()) {
      addJsExtensions(fullPath);
    } else if (file.name.endsWith('.js') && !file.name.endsWith('.d.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let modified = false;
      
      // Replace relative imports without extensions
      // Match: import ... from '../lib/supabase' or '../lib/supabase'
      // But not: import ... from '@supabase/supabase-js' or './file.js'
      content = content.replace(
        /from\s+['"](\.\.?\/[^'"]+)(?<!\.js)['"]/g,
        (match, importPath) => {
          // Skip if it's a package import or already has extension
          if (importPath.startsWith('@') || importPath.startsWith('http')) {
            return match;
          }
          modified = true;
          return match.replace(importPath, importPath + '.js');
        }
      );
      
      // Also handle dynamic imports
      content = content.replace(
        /import\s*\(['"](\.\.?\/[^'"]+)(?<!\.js)['"]\)/g,
        (match, importPath) => {
          if (importPath.startsWith('@') || importPath.startsWith('http')) {
            return match;
          }
          modified = true;
          return match.replace(importPath, importPath + '.js');
        }
      );
      
      if (modified) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated imports in ${fullPath}`);
      }
    }
  }
}

const distDir = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distDir)) {
  console.log('Adding .js extensions to ESM imports...');
  addJsExtensions(distDir);
  console.log('Done!');
} else {
  console.error('dist directory not found. Run build first.');
  process.exit(1);
}


