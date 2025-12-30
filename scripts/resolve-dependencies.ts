#!/usr/bin/env tsx

/**
 * Dependency Resolver
 * 
 * Analyzes package dependencies and determines which packages must be updated together.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { updateConfig } from '../config/update.config';

interface PackageDependency {
  name: string;
  path: string;
  dependencies: string[];
  peerDependencies: string[];
}

/**
 * Read package.json and extract dependencies
 */
function readPackageJson(packagePath: string): PackageDependency | null {
  const packageJsonPath = join(packagePath, 'package.json');
  
  if (!existsSync(packageJsonPath)) {
    return null;
  }
  
  try {
    const content = readFileSync(packageJsonPath, 'utf-8');
    const pkg = JSON.parse(content);
    
    // Extract workspace dependencies (packages starting with @listing-platform or @tinadmin)
    const workspaceDeps = [
      ...Object.keys(pkg.dependencies || {}),
      ...Object.keys(pkg.peerDependencies || {}),
    ].filter(dep => 
      dep.startsWith('@listing-platform/') || 
      dep.startsWith('@tinadmin/')
    );
    
    return {
      name: pkg.name,
      path: packagePath,
      dependencies: workspaceDeps,
      peerDependencies: Object.keys(pkg.peerDependencies || {}),
    };
  } catch (error) {
    console.error(`Error reading ${packageJsonPath}:`, error);
    return null;
  }
}

/**
 * Convert package name to path
 */
function packageNameToPath(packageName: string): string | null {
  if (packageName.startsWith('@listing-platform/')) {
    const name = packageName.replace('@listing-platform/', '');
    return `packages/@listing-platform/${name}`;
  }
  if (packageName.startsWith('@tinadmin/')) {
    const name = packageName.replace('@tinadmin/', '');
    return `packages/@tinadmin/${name}`;
  }
  return null;
}

/**
 * Resolve all dependencies for a package
 */
export function resolveDependencies(
  packagePath: string,
  visited: Set<string> = new Set()
): string[] {
  if (visited.has(packagePath)) {
    return [];
  }
  visited.add(packagePath);
  
  const pkg = readPackageJson(packagePath);
  if (!pkg) {
    return [];
  }
  
  const dependencies: string[] = [];
  
  // Add explicit dependencies from config
  const config = updateConfig[packagePath];
  if (config?.dependencies) {
    dependencies.push(...config.dependencies);
  }
  
  // Add dependencies from package.json
  for (const depName of pkg.dependencies) {
    const depPath = packageNameToPath(depName);
    if (depPath && !dependencies.includes(depPath)) {
      dependencies.push(depPath);
      
      // Recursively resolve sub-dependencies
      const subDeps = resolveDependencies(depPath, visited);
      for (const subDep of subDeps) {
        if (!dependencies.includes(subDep)) {
          dependencies.push(subDep);
        }
      }
    }
  }
  
  return dependencies;
}

/**
 * Get update order (topological sort)
 */
export function getUpdateOrder(packages: string[]): string[] {
  const visited = new Set<string>();
  const order: string[] = [];
  
  function visit(pkgPath: string) {
    if (visited.has(pkgPath)) {
      return;
    }
    
    visited.add(pkgPath);
    const deps = resolveDependencies(pkgPath);
    
    // Visit dependencies first
    for (const dep of deps) {
      if (packages.includes(dep)) {
        visit(dep);
      }
    }
    
    // Then add this package
    if (!order.includes(pkgPath)) {
      order.push(pkgPath);
    }
  }
  
  for (const pkg of packages) {
    visit(pkg);
  }
  
  return order;
}

/**
 * Validate that all dependencies are enabled for update
 */
export function validateDependencies(packages: string[]): {
  valid: boolean;
  missing: string[];
} {
  const missing: string[] = [];
  
  for (const pkgPath of packages) {
    const deps = resolveDependencies(pkgPath);
    
    for (const dep of deps) {
      const config = updateConfig[dep];
      if (!config || !config.enabled || config.strategy === 'skip') {
        if (!missing.includes(dep)) {
          missing.push(dep);
        }
      }
    }
  }
  
  return {
    valid: missing.length === 0,
    missing,
  };
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const packagePath = args[0];
  
  if (!packagePath) {
    console.error('Usage: tsx resolve-dependencies.ts <package-path>');
    console.error('Example: tsx resolve-dependencies.ts packages/@listing-platform/crm');
    process.exit(1);
  }
  
  console.log(`Resolving dependencies for: ${packagePath}\n`);
  
  const deps = resolveDependencies(packagePath);
  console.log('Dependencies:');
  deps.forEach(dep => console.log(`  - ${dep}`));
  
  const order = getUpdateOrder([packagePath, ...deps]);
  console.log('\nUpdate order:');
  order.forEach((pkg, index) => console.log(`  ${index + 1}. ${pkg}`));
  
  const validation = validateDependencies([packagePath]);
  if (!validation.valid) {
    console.log('\n⚠️  Missing dependencies:');
    validation.missing.forEach(dep => console.log(`  - ${dep}`));
    process.exit(1);
  } else {
    console.log('\n✅ All dependencies are enabled for update');
  }
}

