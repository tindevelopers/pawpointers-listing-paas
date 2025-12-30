#!/usr/bin/env tsx

/**
 * Conflict Detection Script
 * 
 * Pre-update analysis that compares local changes vs upstream changes
 * to identify potential conflicts before applying updates.
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { updateConfig, isPathProtected } from '../config/update.config';
import { resolveDependencies } from './resolve-dependencies';

interface ConflictInfo {
  packagePath: string;
  files: string[];
  hasConflicts: boolean;
  protectedFiles: string[];
}

interface UpdateAnalysis {
  packages: ConflictInfo[];
  totalConflicts: number;
  protectedFiles: string[];
  warnings: string[];
}

/**
 * Check if upstream remote exists
 */
function checkUpstreamRemote(): boolean {
  try {
    const remotes = execSync('git remote -v', { encoding: 'utf-8' });
    return remotes.includes('upstream');
  } catch {
    return false;
  }
}

/**
 * Fetch upstream changes
 */
function fetchUpstream(branch: string = 'main'): void {
  try {
    console.log(`Fetching upstream/${branch}...`);
    execSync(`git fetch upstream ${branch}`, { stdio: 'inherit' });
  } catch (error) {
    throw new Error(`Failed to fetch upstream: ${error}`);
  }
}

/**
 * Check if a file has local changes
 */
function hasLocalChanges(filePath: string): boolean {
  try {
    const result = execSync(`git diff HEAD -- ${filePath}`, { encoding: 'utf-8' });
    return result.trim().length > 0;
  } catch {
    return false;
  }
}

/**
 * Check if a file exists in upstream
 */
function existsInUpstream(filePath: string, upstreamBranch: string = 'upstream/main'): boolean {
  try {
    execSync(`git cat-file -e ${upstreamBranch}:${filePath}`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check for conflicts between local and upstream
 */
function checkConflicts(
  packagePath: string,
  upstreamBranch: string = 'upstream/main'
): ConflictInfo {
  const conflicts: string[] = [];
  const protectedFiles: string[] = [];
  
  try {
    // Get list of files in package
    const result = execSync(
      `git ls-tree -r --name-only ${upstreamBranch} -- ${packagePath}`,
      { encoding: 'utf-8' }
    );
    
    const files = result.trim().split('\n').filter(Boolean);
    
    for (const file of files) {
      // Check if path is protected
      if (isPathProtected(file)) {
        protectedFiles.push(file);
        continue;
      }
      
      // Check if file has local changes
      if (hasLocalChanges(file)) {
        // Check if upstream also changed this file
        try {
          const diff = execSync(
            `git diff ${upstreamBranch} HEAD -- ${file}`,
            { encoding: 'utf-8' }
          );
          
          if (diff.trim().length > 0) {
            conflicts.push(file);
          }
        } catch {
          // File might not exist locally
          conflicts.push(file);
        }
      }
    }
  } catch (error) {
    console.warn(`Warning: Could not check conflicts for ${packagePath}: ${error}`);
  }
  
  const config = updateConfig[packagePath];
  
  return {
    packagePath,
    files: conflicts,
    hasConflicts: conflicts.length > 0,
    protectedFiles,
  };
}

/**
 * Analyze packages for conflicts
 */
export function analyzeConflicts(
  packages: string[],
  upstreamBranch: string = 'upstream/main',
  fetch: boolean = true
): UpdateAnalysis {
  if (fetch) {
    if (!checkUpstreamRemote()) {
      throw new Error('Upstream remote not found. Add it with: git remote add upstream <url>');
    }
    fetchUpstream(upstreamBranch.replace('upstream/', ''));
  }
  
  const warnings: string[] = [];
  const allProtectedFiles: string[] = [];
  let totalConflicts = 0;
  
  // Resolve all dependencies
  const allPackages = new Set<string>();
  for (const pkg of packages) {
    allPackages.add(pkg);
    const deps = resolveDependencies(pkg);
    deps.forEach(dep => allPackages.add(dep));
  }
  
  const packageList = Array.from(allPackages);
  
  const conflicts: ConflictInfo[] = packageList.map(pkgPath => {
    const config = updateConfig[pkgPath];
    
    if (!config) {
      warnings.push(`No config found for ${pkgPath} - will be skipped`);
      return {
        packagePath: pkgPath,
        files: [],
        hasConflicts: false,
        protectedFiles: [],
      };
    }
    
    if (!config.enabled || config.strategy === 'skip') {
      warnings.push(`${pkgPath} is disabled or set to skip - will not be updated`);
      return {
        packagePath: pkgPath,
        files: [],
        hasConflicts: false,
        protectedFiles: [],
      };
    }
    
    const conflictInfo = checkConflicts(pkgPath, upstreamBranch);
    
    if (conflictInfo.hasConflicts) {
      totalConflicts += conflictInfo.files.length;
    }
    
    conflictInfo.protectedFiles.forEach(file => {
      if (!allProtectedFiles.includes(file)) {
        allProtectedFiles.push(file);
      }
    });
    
    return conflictInfo;
  });
  
  return {
    packages: conflicts,
    totalConflicts,
    protectedFiles: allProtectedFiles,
    warnings,
  };
}

/**
 * Print analysis report
 */
export function printAnalysis(analysis: UpdateAnalysis): void {
  console.log('\n=== Conflict Analysis ===\n');
  
  if (analysis.warnings.length > 0) {
    console.log('⚠️  Warnings:');
    analysis.warnings.forEach(w => console.log(`   ${w}`));
    console.log('');
  }
  
  if (analysis.protectedFiles.length > 0) {
    console.log(`📦 Protected Files (${analysis.protectedFiles.length}):`);
    analysis.protectedFiles.forEach(file => console.log(`   ${file}`));
    console.log('');
  }
  
  console.log(`📊 Total Conflicts: ${analysis.totalConflicts}\n`);
  
  if (analysis.totalConflicts === 0) {
    console.log('✅ No conflicts detected! Safe to update.\n');
    return;
  }
  
  console.log('⚠️  Conflicts detected:\n');
  
  for (const pkg of analysis.packages) {
    if (pkg.hasConflicts) {
      console.log(`📦 ${pkg.packagePath}:`);
      console.log(`   ${pkg.files.length} file(s) with conflicts:`);
      pkg.files.forEach(file => {
        console.log(`   - ${file}`);
      });
      console.log('');
    }
  }
  
  console.log('💡 Tip: Review conflicts and resolve manually, or use conflict resolution strategy from config.');
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const packages = args.length > 0 ? args : [];
  const upstreamBranch = process.env.UPSTREAM_BRANCH || 'upstream/main';
  
  if (packages.length === 0) {
    console.error('Usage: tsx detect-conflicts.ts <package-path> [package-path...]');
    console.error('Example: tsx detect-conflicts.ts packages/@listing-platform/crm');
    process.exit(1);
  }
  
  try {
    const analysis = analyzeConflicts(packages, upstreamBranch);
    printAnalysis(analysis);
    
    if (analysis.totalConflicts > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

