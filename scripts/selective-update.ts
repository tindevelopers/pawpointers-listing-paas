#!/usr/bin/env tsx

/**
 * Selective Update Script
 * 
 * Main script for selectively updating packages from upstream while protecting
 * custom changes in forks.
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { updateConfig, isPathProtected, getEnabledPackages } from '../config/update.config';
import { resolveDependencies, getUpdateOrder, validateDependencies } from './resolve-dependencies';
import { analyzeConflicts, printAnalysis } from './detect-conflicts';
import { validateUpdate, printValidation } from './validate-update';

interface UpdateOptions {
  dryRun?: boolean;
  upstreamBranch?: string;
  skipValidation?: boolean;
  skipConflictCheck?: boolean;
  createBackup?: boolean;
  backupBranch?: string;
}

interface UpdateResult {
  success: boolean;
  updated: string[];
  skipped: string[];
  errors: string[];
  backupBranch?: string;
}

/**
 * Load update history
 */
function loadUpdateHistory(): any[] {
  const historyPath = '.updates/update-history.json';
  if (existsSync(historyPath)) {
    try {
      const content = readFileSync(historyPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Save update history
 */
function saveUpdateHistory(entry: any): void {
  const historyDir = '.updates';
  if (!existsSync(historyDir)) {
    mkdirSync(historyDir, { recursive: true });
  }
  
  const historyPath = join(historyDir, 'update-history.json');
  const history = loadUpdateHistory();
  
  history.push({
    ...entry,
    timestamp: new Date().toISOString(),
  });
  
  writeFileSync(historyPath, JSON.stringify(history, null, 2));
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
 * Get current branch name
 */
function getCurrentBranch(): string {
  try {
    return execSync('git branch --show-current', { encoding: 'utf-8' }).trim();
  } catch {
    return 'main';
  }
}

/**
 * Get current commit hash
 */
function getCurrentCommit(): string {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    return '';
  }
}

/**
 * Create backup branch
 */
function createBackupBranch(baseBranch: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupBranch = `backup-before-update-${timestamp}`;
  
  try {
    execSync(`git checkout -b ${backupBranch}`, { stdio: 'pipe' });
    execSync(`git checkout ${baseBranch}`, { stdio: 'pipe' });
    return backupBranch;
  } catch (error) {
    throw new Error(`Failed to create backup branch: ${error}`);
  }
}

/**
 * Fetch upstream
 */
function fetchUpstream(branch: string): void {
  console.log(`Fetching upstream/${branch}...`);
  try {
    execSync(`git fetch upstream ${branch}`, { stdio: 'inherit' });
  } catch (error) {
    throw new Error(`Failed to fetch upstream: ${error}`);
  }
}

/**
 * Update a single package
 */
function updatePackage(
  packagePath: string,
  upstreamBranch: string,
  dryRun: boolean = false
): { success: boolean; message: string } {
  const config = updateConfig[packagePath];
  
  if (!config) {
    return { success: false, message: `No config found for ${packagePath}` };
  }
  
  if (!config.enabled || config.strategy === 'skip') {
    return { success: false, message: `Package ${packagePath} is disabled or set to skip` };
  }
  
  if (dryRun) {
    console.log(`[DRY RUN] Would update: ${packagePath}`);
    return { success: true, message: 'Dry run - no changes made' };
  }
  
  try {
    console.log(`Updating ${packagePath}...`);
    
    // Checkout files from upstream
    execSync(`git checkout ${upstreamBranch} -- ${packagePath}`, { stdio: 'pipe' });
    
    // If strategy is merge and there are conflicts, handle them
    if (config.strategy === 'merge' && config.conflictResolution) {
      // Git checkout already handles this, but we might need to handle conflicts
      const status = execSync('git status --porcelain', { encoding: 'utf-8' });
      if (status.includes('UU') || status.includes('AA')) {
        // Conflicts detected
        if (config.conflictResolution === 'theirs') {
          execSync(`git checkout --theirs -- ${packagePath}`, { stdio: 'pipe' });
          execSync(`git add ${packagePath}`, { stdio: 'pipe' });
        } else if (config.conflictResolution === 'ours') {
          execSync(`git checkout --ours -- ${packagePath}`, { stdio: 'pipe' });
          execSync(`git add ${packagePath}`, { stdio: 'pipe' });
        } else {
          // Manual resolution required
          console.log(`⚠️  Manual conflict resolution required for ${packagePath}`);
          return { success: false, message: 'Manual conflict resolution required' };
        }
      }
    }
    
    return { success: true, message: `Updated ${packagePath}` };
  } catch (error) {
    return { success: false, message: `Failed to update ${packagePath}: ${error}` };
  }
}

/**
 * Main update function
 */
export async function selectiveUpdate(
  packages: string[],
  options: UpdateOptions = {}
): Promise<UpdateResult> {
  const {
    dryRun = false,
    upstreamBranch = 'upstream/main',
    skipValidation = false,
    skipConflictCheck = false,
    createBackup = true,
    backupBranch,
  } = options;
  
  const result: UpdateResult = {
    success: false,
    updated: [],
    skipped: [],
    errors: [],
  };
  
  // Check prerequisites
  if (!checkUpstreamRemote()) {
    result.errors.push('Upstream remote not found. Add it with: git remote add upstream <url>');
    return result;
  }
  
  // Resolve all dependencies
  const allPackages = new Set<string>();
  for (const pkg of packages) {
    allPackages.add(pkg);
    const deps = resolveDependencies(pkg);
    deps.forEach(dep => allPackages.add(dep));
  }
  
  const packagesToUpdate = Array.from(allPackages);
  
  // Validate dependencies
  const depValidation = validateDependencies(packagesToUpdate);
  if (!depValidation.valid) {
    result.errors.push(
      `Missing dependencies: ${depValidation.missing.join(', ')}. ` +
      'Enable them in config/update.config.ts'
    );
    return result;
  }
  
  // Get update order
  const updateOrder = getUpdateOrder(packagesToUpdate);
  
  console.log('\n=== Selective Update ===\n');
  console.log(`Packages to update: ${updateOrder.length}`);
  updateOrder.forEach((pkg, index) => {
    console.log(`  ${index + 1}. ${pkg}`);
  });
  console.log('');
  
  // Check for conflicts
  if (!skipConflictCheck && !dryRun) {
    console.log('Checking for conflicts...\n');
    const analysis = analyzeConflicts(packagesToUpdate, upstreamBranch, false);
    printAnalysis(analysis);
    
    if (analysis.totalConflicts > 0) {
      const config = updateConfig[packages[0]];
      if (config?.conflictResolution === 'manual') {
        result.errors.push('Conflicts detected and manual resolution required');
        return result;
      }
    }
  }
  
  // Create backup branch
  if (createBackup && !dryRun) {
    const currentBranch = getCurrentBranch();
    const backup = backupBranch || createBackupBranch(currentBranch);
    result.backupBranch = backup;
    console.log(`✅ Created backup branch: ${backup}\n`);
  }
  
  // Fetch upstream
  const branchName = upstreamBranch.replace('upstream/', '');
  fetchUpstream(branchName);
  
  // Update packages in order
  console.log('Updating packages...\n');
  for (const pkg of updateOrder) {
    const updateResult = updatePackage(pkg, upstreamBranch, dryRun);
    
    if (updateResult.success) {
      result.updated.push(pkg);
      console.log(`✅ ${updateResult.message}`);
    } else {
      result.skipped.push(pkg);
      result.errors.push(`${pkg}: ${updateResult.message}`);
      console.log(`⚠️  ${updateResult.message}`);
    }
  }
  
  // Validate update
  if (!skipValidation && !dryRun && result.updated.length > 0) {
    console.log('\nValidating update...\n');
    const validation = validateUpdate(result.updated, {
      typeCheck: true,
      build: true,
      checkDeps: true,
    });
    printValidation(validation);
    
    if (!validation.success) {
      result.errors.push(...validation.errors);
      result.success = false;
      return result;
    }
  }
  
  // Save update history
  if (!dryRun && result.updated.length > 0) {
    saveUpdateHistory({
      packages: result.updated,
      upstreamBranch,
      upstreamCommit: execSync(`git rev-parse ${upstreamBranch}`, { encoding: 'utf-8' }).trim(),
      localCommit: getCurrentCommit(),
      backupBranch: result.backupBranch,
    });
  }
  
  result.success = result.errors.length === 0;
  
  return result;
}

/**
 * Print update results
 */
function printResults(result: UpdateResult, dryRun: boolean): void {
  console.log('\n=== Update Results ===\n');
  
  if (dryRun) {
    console.log('🔍 DRY RUN - No changes were made\n');
  }
  
  if (result.updated.length > 0) {
    console.log(`✅ Updated packages (${result.updated.length}):`);
    result.updated.forEach(pkg => console.log(`   - ${pkg}`));
    console.log('');
  }
  
  if (result.skipped.length > 0) {
    console.log(`⚠️  Skipped packages (${result.skipped.length}):`);
    result.skipped.forEach(pkg => console.log(`   - ${pkg}`));
    console.log('');
  }
  
  if (result.errors.length > 0) {
    console.log(`❌ Errors (${result.errors.length}):`);
    result.errors.forEach(err => console.log(`   - ${err}`));
    console.log('');
  }
  
  if (result.backupBranch) {
    console.log(`💾 Backup branch: ${result.backupBranch}`);
    console.log(`   To rollback: git reset --hard ${result.backupBranch}\n`);
  }
  
  if (result.success) {
    console.log('✅ Update completed successfully!');
    if (!dryRun) {
      console.log('   Review changes and commit when ready.\n');
    }
  } else {
    console.log('❌ Update completed with errors.');
    console.log('   Review errors above and resolve before committing.\n');
  }
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  
  // Parse arguments
  const packages: string[] = [];
  const options: UpdateOptions = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--dry-run' || arg === '-d') {
      options.dryRun = true;
    } else if (arg === '--package' || arg === '-p') {
      const pkg = args[++i];
      if (pkg) {
        // Convert short name to full path
        if (pkg.startsWith('@listing-platform/')) {
          packages.push(`packages/${pkg}`);
        } else if (pkg.startsWith('@tinadmin/')) {
          packages.push(`packages/${pkg}`);
        } else if (!pkg.includes('/')) {
          packages.push(`packages/@listing-platform/${pkg}`);
        } else {
          packages.push(pkg);
        }
      }
    } else if (arg === '--packages') {
      const pkgs = args[++i]?.split(',') || [];
      pkgs.forEach(p => {
        if (!p.includes('/')) {
          packages.push(`packages/@listing-platform/${p}`);
        } else {
          packages.push(p);
        }
      });
    } else if (arg === '--upstream-branch' || arg === '-b') {
      options.upstreamBranch = `upstream/${args[++i] || 'main'}`;
    } else if (arg === '--skip-validation') {
      options.skipValidation = true;
    } else if (arg === '--skip-conflict-check') {
      options.skipConflictCheck = true;
    } else if (arg === '--no-backup') {
      options.createBackup = false;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Usage: tsx selective-update.ts [options]

Options:
  --package, -p <name>        Package to update (e.g., crm, reviews)
  --packages <list>           Comma-separated list of packages
  --dry-run, -d               Preview changes without applying
  --upstream-branch, -b <br>  Upstream branch (default: main)
  --skip-validation           Skip post-update validation
  --skip-conflict-check       Skip conflict detection
  --no-backup                 Don't create backup branch
  --help, -h                  Show this help

Examples:
  tsx selective-update.ts --package crm --dry-run
  tsx selective-update.ts --packages crm,reviews,maps
  tsx selective-update.ts --package crm --upstream-branch develop
      `);
      process.exit(0);
    }
  }
  
  if (packages.length === 0) {
    console.error('Error: No packages specified');
    console.error('Use --package <name> or --packages <list>');
    console.error('Run with --help for usage information');
    process.exit(1);
  }
  
  selectiveUpdate(packages, options)
    .then(result => {
      printResults(result, options.dryRun || false);
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Error:', error);
      process.exit(1);
    });
}

