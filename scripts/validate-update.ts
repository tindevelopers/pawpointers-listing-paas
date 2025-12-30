#!/usr/bin/env tsx

/**
 * Post-Update Validation Script
 * 
 * Validates that updates were applied correctly and the codebase is still functional.
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

interface ValidationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Check if git repository is clean
 */
function checkGitStatus(): { clean: boolean; message: string } {
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf-8' });
    if (status.trim().length === 0) {
      return { clean: true, message: 'Git repository is clean' };
    }
    return { clean: false, message: 'Git repository has uncommitted changes' };
  } catch (error) {
    return { clean: false, message: `Error checking git status: ${error}` };
  }
}

/**
 * Run TypeScript type checking
 */
function runTypeCheck(): { success: boolean; message: string } {
  try {
    console.log('Running TypeScript type check...');
    execSync('pnpm type-check', { stdio: 'inherit' });
    return { success: true, message: 'TypeScript type check passed' };
  } catch (error) {
    return { success: false, message: `TypeScript type check failed: ${error}` };
  }
}

/**
 * Build updated packages
 */
function buildPackages(packages: string[]): { success: boolean; message: string } {
  try {
    console.log('Building updated packages...');
    
    for (const pkg of packages) {
      // Extract package name from path
      const packageName = pkg.split('/').pop() || pkg;
      
      // Try to build using turbo filter
      try {
        execSync(`pnpm turbo build --filter=${packageName}`, { stdio: 'inherit' });
      } catch {
        // Fallback: try building directly in package directory
        const packageJsonPath = join(pkg, 'package.json');
        if (existsSync(packageJsonPath)) {
          console.log(`Building ${pkg}...`);
          execSync(`cd ${pkg} && pnpm build`, { stdio: 'inherit' });
        }
      }
    }
    
    return { success: true, message: 'Package builds successful' };
  } catch (error) {
    return { success: false, message: `Package build failed: ${error}` };
  }
}

/**
 * Check package.json consistency
 */
function checkPackageJson(packages: string[]): { success: boolean; message: string } {
  const errors: string[] = [];
  
  for (const pkg of packages) {
    const packageJsonPath = join(pkg, 'package.json');
    if (!existsSync(packageJsonPath)) {
      errors.push(`Missing package.json: ${packageJsonPath}`);
      continue;
    }
    
    try {
      const content = require(packageJsonPath);
      if (!content.name) {
        errors.push(`Missing name in ${packageJsonPath}`);
      }
      if (!content.version) {
        errors.push(`Missing version in ${packageJsonPath}`);
      }
    } catch (error) {
      errors.push(`Invalid package.json: ${packageJsonPath} - ${error}`);
    }
  }
  
  if (errors.length > 0) {
    return { success: false, message: errors.join('; ') };
  }
  
  return { success: true, message: 'Package.json files are valid' };
}

/**
 * Run pnpm install to verify dependencies
 */
function verifyDependencies(): { success: boolean; message: string } {
  try {
    console.log('Verifying dependencies...');
    execSync('pnpm install --frozen-lockfile', { stdio: 'inherit' });
    return { success: true, message: 'Dependencies verified' };
  } catch (error) {
    return { success: false, message: `Dependency verification failed: ${error}` };
  }
}

/**
 * Validate update
 */
export function validateUpdate(
  packages: string[],
  options: {
    typeCheck?: boolean;
    build?: boolean;
    checkDeps?: boolean;
    checkGit?: boolean;
  } = {}
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const {
    typeCheck = true,
    build = true,
    checkDeps = true,
    checkGit = true,
  } = options;
  
  // Check git status
  if (checkGit) {
    const gitStatus = checkGitStatus();
    if (!gitStatus.clean) {
      warnings.push(gitStatus.message);
    }
  }
  
  // Check package.json files
  const pkgCheck = checkPackageJson(packages);
  if (!pkgCheck.success) {
    errors.push(pkgCheck.message);
  }
  
  // Verify dependencies
  if (checkDeps) {
    const depsCheck = verifyDependencies();
    if (!depsCheck.success) {
      errors.push(depsCheck.message);
    }
  }
  
  // Type check
  if (typeCheck) {
    const typeCheckResult = runTypeCheck();
    if (!typeCheckResult.success) {
      errors.push(typeCheckResult.message);
    }
  }
  
  // Build packages
  if (build) {
    const buildResult = buildPackages(packages);
    if (!buildResult.success) {
      errors.push(buildResult.message);
    }
  }
  
  return {
    success: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Print validation results
 */
export function printValidation(result: ValidationResult): void {
  console.log('\n=== Validation Results ===\n');
  
  if (result.warnings.length > 0) {
    console.log('⚠️  Warnings:');
    result.warnings.forEach(w => console.log(`   ${w}`));
    console.log('');
  }
  
  if (result.errors.length > 0) {
    console.log('❌ Errors:');
    result.errors.forEach(e => console.log(`   ${e}`));
    console.log('');
    console.log('❌ Validation failed!');
    return;
  }
  
  console.log('✅ Validation passed!');
  console.log('   All checks completed successfully.\n');
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const packages = args.length > 0 ? args : [];
  
  if (packages.length === 0) {
    console.error('Usage: tsx validate-update.ts <package-path> [package-path...]');
    console.error('Example: tsx validate-update.ts packages/@listing-platform/crm');
    process.exit(1);
  }
  
  const result = validateUpdate(packages);
  printValidation(result);
  
  process.exit(result.success ? 0 : 1);
}

