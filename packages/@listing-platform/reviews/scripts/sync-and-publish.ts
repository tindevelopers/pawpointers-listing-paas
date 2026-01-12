/**
 * Sync and Publish Script
 * Keeps workspace and publishable versions in sync
 * 
 * Usage:
 *   pnpm publish:prepare   - Prepare dist-publish directory
 *   pnpm publish:npm       - Build and publish to npm
 *   pnpm publish:dry-run   - Test publish without actually publishing
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');
const DIST_PUBLISH = path.join(ROOT, 'dist-publish');
const SRC = path.join(ROOT, 'src');

interface PackageJson {
  name: string;
  version: string;
  [key: string]: unknown;
}

function log(message: string) {
  console.log(`\x1b[36m[sync-publish]\x1b[0m ${message}`);
}

function success(message: string) {
  console.log(`\x1b[32m[sync-publish]\x1b[0m ${message}`);
}

function error(message: string) {
  console.error(`\x1b[31m[sync-publish]\x1b[0m ${message}`);
  process.exit(1);
}

function readJson(filePath: string): PackageJson {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function writeJson(filePath: string, data: unknown) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}

function clean() {
  log('Cleaning dist-publish directory...');
  if (fs.existsSync(DIST_PUBLISH)) {
    fs.rmSync(DIST_PUBLISH, { recursive: true });
  }
  fs.mkdirSync(DIST_PUBLISH, { recursive: true });
}

function syncVersion(): string {
  log('Syncing version from workspace package.json...');
  
  const workspacePkg = readJson(path.join(ROOT, 'package.json'));
  const publishPkg = readJson(path.join(ROOT, 'package.publishable.json'));
  
  // Sync version
  publishPkg.version = workspacePkg.version;
  
  // Write to dist-publish
  writeJson(path.join(DIST_PUBLISH, 'package.json'), publishPkg);
  
  log(`Version synced: ${publishPkg.version}`);
  return publishPkg.version;
}

function createTsupConfig() {
  // Create a tsup.config.ts file for the build
  const configContent = `
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'headless/index': 'src/headless/index.ts',
    'components/index': 'src/components/index.ts',
    'hooks/index': 'src/hooks/index.ts',
    'types/index': 'src/types/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: false,  // Generate declarations separately
  clean: true,
  outDir: 'dist-publish/dist',
  external: ['react', 'react-dom'],
  splitting: true,
  treeshake: true,
  sourcemap: false,
  minify: false,
});
`;
  
  const configPath = path.join(ROOT, 'tsup.config.publish.ts');
  fs.writeFileSync(configPath, configContent.trim());
  return configPath;
}

function createDtsTsConfig() {
  // Create a tsconfig specifically for declaration generation
  const config = {
    compilerOptions: {
      target: "ES2020",
      lib: ["ES2020", "DOM", "DOM.Iterable"],
      module: "ESNext",
      moduleResolution: "bundler",
      jsx: "react-jsx",
      outDir: "./dist-publish/dist",
      rootDir: "./src",
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      declaration: true,
      declarationMap: false,
      emitDeclarationOnly: true,
      resolveJsonModule: true,
      isolatedModules: true,
    },
    include: ["src/**/*"],
    exclude: ["node_modules", "dist", "dist-publish", "scripts"]
  };
  
  const configPath = path.join(ROOT, 'tsconfig.dts.json');
  writeJson(configPath, config);
  return configPath;
}

function buildForPublish() {
  log('Building for npm publish with tsup...');
  
  // Create tsup config
  const tsupConfigPath = createTsupConfig();
  
  try {
    // Build CJS and ESM bundles
    execSync(`npx tsup --config ${tsupConfigPath}`, { 
      cwd: ROOT, 
      stdio: 'inherit' 
    });
    
    // Clean up tsup config file
    fs.unlinkSync(tsupConfigPath);
  } catch (err) {
    // Clean up config file even on error
    if (fs.existsSync(tsupConfigPath)) {
      fs.unlinkSync(tsupConfigPath);
    }
    error('Bundle build failed. Check the errors above.');
  }
  
  // Generate TypeScript declarations separately
  log('Generating TypeScript declarations...');
  const dtsConfigPath = createDtsTsConfig();
  
  try {
    execSync(`npx tsc --project ${dtsConfigPath}`, { 
      cwd: ROOT, 
      stdio: 'inherit' 
    });
    
    // Clean up dts config file
    fs.unlinkSync(dtsConfigPath);
  } catch (err) {
    // Clean up config file even on error
    if (fs.existsSync(dtsConfigPath)) {
      fs.unlinkSync(dtsConfigPath);
    }
    error('Declaration generation failed. Check the errors above.');
  }
  
  // Copy styles if they exist
  const stylesDir = path.join(SRC, 'styles');
  const distStylesDir = path.join(DIST_PUBLISH, 'dist/styles');
  
  if (fs.existsSync(stylesDir)) {
    fs.mkdirSync(distStylesDir, { recursive: true });
    const cssFiles = fs.readdirSync(stylesDir).filter(f => f.endsWith('.css'));
    cssFiles.forEach(file => {
      fs.copyFileSync(path.join(stylesDir, file), path.join(distStylesDir, file));
    });
    log(`Copied ${cssFiles.length} CSS files`);
  }
}

function copyAssets() {
  log('Copying assets...');
  
  // Copy README
  const readmeSrc = path.join(ROOT, 'README.md');
  if (fs.existsSync(readmeSrc)) {
    fs.copyFileSync(readmeSrc, path.join(DIST_PUBLISH, 'README.md'));
    log('Copied README.md');
  }
  
  // Copy CHANGELOG if exists
  const changelogSrc = path.join(ROOT, 'CHANGELOG.md');
  if (fs.existsSync(changelogSrc)) {
    fs.copyFileSync(changelogSrc, path.join(DIST_PUBLISH, 'CHANGELOG.md'));
    log('Copied CHANGELOG.md');
  }
  
  // Copy LICENSE if exists (check root and package dir)
  const licensePaths = [
    path.join(ROOT, 'LICENSE'),
    path.join(ROOT, '../../LICENSE'),
  ];
  for (const licensePath of licensePaths) {
    if (fs.existsSync(licensePath)) {
      fs.copyFileSync(licensePath, path.join(DIST_PUBLISH, 'LICENSE'));
      log('Copied LICENSE');
      break;
    }
  }
}

function validateBuild() {
  log('Validating build...');
  
  const requiredFiles = [
    'package.json',
    'README.md',
    'dist/index.js',
    'dist/index.mjs',
    'dist/index.d.ts',
  ];
  
  const missing = requiredFiles.filter(
    file => !fs.existsSync(path.join(DIST_PUBLISH, file))
  );
  
  if (missing.length > 0) {
    error(`Missing required files: ${missing.join(', ')}`);
  }
  
  // Check file sizes
  const indexJs = path.join(DIST_PUBLISH, 'dist/index.js');
  const stats = fs.statSync(indexJs);
  log(`Build size: ${(stats.size / 1024).toFixed(2)} KB (index.js)`);
  
  success('Build validated successfully');
}

function showPackageInfo() {
  const pkg = readJson(path.join(DIST_PUBLISH, 'package.json'));
  
  console.log('\n┌─────────────────────────────────────────────────────────────┐');
  console.log('│                    Package Ready to Publish                  │');
  console.log('├─────────────────────────────────────────────────────────────┤');
  console.log(`│  Name:     ${String(pkg.name).padEnd(46)}│`);
  console.log(`│  Version:  ${String(pkg.version).padEnd(46)}│`);
  console.log('├─────────────────────────────────────────────────────────────┤');
  console.log('│  Files in dist-publish/:                                    │');
  
  function listDir(dir: string, prefix = '') {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        console.log(`│    ${(prefix + file + '/').padEnd(40)} ${'dir'.padStart(8)} │`);
        // Only go one level deep
        if (prefix === '') {
          const subFiles = fs.readdirSync(fullPath).slice(0, 5);
          subFiles.forEach(sf => {
            const sfPath = path.join(fullPath, sf);
            const sfStat = fs.statSync(sfPath);
            const size = sfStat.isDirectory() 
              ? 'dir' 
              : `${(sfStat.size / 1024).toFixed(1)}KB`;
            console.log(`│      ${sf.padEnd(38)} ${size.padStart(8)} │`);
          });
          if (fs.readdirSync(fullPath).length > 5) {
            console.log(`│      ... and ${fs.readdirSync(fullPath).length - 5} more files`.padEnd(57) + '│');
          }
        }
      } else {
        const size = `${(stat.size / 1024).toFixed(1)}KB`;
        console.log(`│    ${(prefix + file).padEnd(40)} ${size.padStart(8)} │`);
      }
    });
  }
  
  listDir(DIST_PUBLISH);
  
  console.log('└─────────────────────────────────────────────────────────────┘\n');
}

function publish(dryRun: boolean) {
  log(dryRun ? 'Running publish dry-run...' : 'Publishing to npm...');
  
  const cmd = dryRun 
    ? 'npm publish --dry-run' 
    : 'npm publish --access public';
  
  try {
    execSync(cmd, { cwd: DIST_PUBLISH, stdio: 'inherit' });
    success(dryRun ? 'Dry-run complete!' : 'Published successfully!');
  } catch (err) {
    if (dryRun) {
      // Dry run might "fail" but still show useful output
      log('Dry-run completed (check output above)');
    } else {
      error('Publish failed. Check npm credentials and try again.');
    }
  }
}

function printUsage() {
  console.log(`
\x1b[36mReviews SDK - Sync & Publish Tool\x1b[0m

Usage:
  pnpm publish:prepare   Prepare dist-publish directory for inspection
  pnpm publish:dry-run   Test publish without actually publishing
  pnpm publish:npm       Build and publish to npm

Options:
  --prepare    Only prepare, don't publish
  --dry-run    Run npm publish --dry-run
  --publish    Actually publish to npm

The script will:
  1. Clean the dist-publish directory
  2. Sync version from workspace package.json
  3. Build with tsup (CJS + ESM bundles)
  4. Generate TypeScript declarations with tsc
  5. Copy README, CHANGELOG, LICENSE
  6. Validate the build
  7. Publish (if --publish or --dry-run)
`);
}

// Main
const args = process.argv.slice(2);
const isPrepare = args.includes('--prepare');
const isPublish = args.includes('--publish');
const isDryRun = args.includes('--dry-run');

if (!isPrepare && !isPublish && !isDryRun) {
  printUsage();
  process.exit(0);
}

try {
  console.log('\n');
  clean();
  const version = syncVersion();
  buildForPublish();
  copyAssets();
  validateBuild();
  showPackageInfo();
  
  if (isPublish || isDryRun) {
    publish(isDryRun);
  } else {
    success(`Prepared dist-publish/ for version ${version}`);
    console.log('\nNext steps:');
    console.log('  • Inspect dist-publish/ directory');
    console.log('  • Run "pnpm publish:dry-run" to test');
    console.log('  • Run "pnpm publish:npm" to publish\n');
  }
} catch (err) {
  error(err instanceof Error ? err.message : String(err));
}
