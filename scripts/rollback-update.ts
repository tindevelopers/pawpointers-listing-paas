#!/usr/bin/env tsx

/**
 * Rollback Update Script
 * 
 * Rolls back the last update using the backup branch or update history.
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

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
 * Get current branch
 */
function getCurrentBranch(): string {
  try {
    return execSync('git branch --show-current', { encoding: 'utf-8' }).trim();
  } catch {
    return 'main';
  }
}

/**
 * Check if branch exists
 */
function branchExists(branch: string): boolean {
  try {
    execSync(`git rev-parse --verify ${branch}`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Rollback to backup branch
 */
function rollbackToBackup(backupBranch: string, force: boolean = false): void {
  const currentBranch = getCurrentBranch();
  
  if (!branchExists(backupBranch)) {
    throw new Error(`Backup branch ${backupBranch} does not exist`);
  }
  
  console.log(`Rolling back to ${backupBranch}...`);
  
  if (force) {
    execSync(`git reset --hard ${backupBranch}`, { stdio: 'inherit' });
  } else {
    // Checkout backup branch
    execSync(`git checkout ${backupBranch}`, { stdio: 'inherit' });
    
    // If we were on a different branch, ask to merge or reset
    if (currentBranch !== backupBranch) {
      console.log(`\nYou are now on ${backupBranch}.`);
      console.log(`To restore ${currentBranch} to this state:`);
      console.log(`  git checkout ${currentBranch}`);
      console.log(`  git reset --hard ${backupBranch}`);
    }
  }
}

/**
 * Rollback last update
 */
export function rollbackLastUpdate(force: boolean = false): void {
  const history = loadUpdateHistory();
  
  if (history.length === 0) {
    throw new Error('No update history found. Cannot rollback.');
  }
  
  const lastUpdate = history[history.length - 1];
  
  if (!lastUpdate.backupBranch) {
    throw new Error('Last update has no backup branch. Cannot rollback.');
  }
  
  console.log('Last update:');
  console.log(`  Packages: ${lastUpdate.packages.join(', ')}`);
  console.log(`  Timestamp: ${lastUpdate.timestamp}`);
  console.log(`  Backup branch: ${lastUpdate.backupBranch}\n`);
  
  rollbackToBackup(lastUpdate.backupBranch, force);
}

/**
 * List available rollback points
 */
export function listRollbackPoints(): void {
  const history = loadUpdateHistory();
  
  if (history.length === 0) {
    console.log('No update history found.');
    return;
  }
  
  console.log('Available rollback points:\n');
  
  history.forEach((entry, index) => {
    console.log(`${index + 1}. ${entry.timestamp}`);
    console.log(`   Packages: ${entry.packages.join(', ')}`);
    if (entry.backupBranch) {
      console.log(`   Backup: ${entry.backupBranch}`);
    }
    console.log('');
  });
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (command === 'list' || command === 'ls') {
    listRollbackPoints();
  } else if (command === 'last' || !command) {
    try {
      const force = args.includes('--force') || args.includes('-f');
      rollbackLastUpdate(force);
      console.log('\n✅ Rollback completed!');
    } catch (error: any) {
      console.error('❌ Rollback failed:', error.message);
      process.exit(1);
    }
  } else if (command === '--help' || command === '-h') {
    console.log(`
Usage: tsx rollback-update.ts [command] [options]

Commands:
  last, (none)    Rollback to last update
  list, ls        List available rollback points

Options:
  --force, -f     Force rollback (hard reset)
  --help, -h      Show this help

Examples:
  tsx rollback-update.ts
  tsx rollback-update.ts last --force
  tsx rollback-update.ts list
    `);
  } else {
    console.error(`Unknown command: ${command}`);
    console.error('Run with --help for usage information');
    process.exit(1);
  }
}

