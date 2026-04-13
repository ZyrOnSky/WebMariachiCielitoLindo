import { execSync } from 'child_process';
import { cp, mkdir, readdir, rm, readFile, writeFile, lstat } from 'fs/promises';
import path from 'path';
import os from 'os';

const sourceBranch = 'desarrollo';
const targetBranch = 'main';
const dryRun = process.argv.includes('--dry-run');
const push = process.argv.includes('--push');
const root = path.resolve('.');
const tempDir = path.join(os.tmpdir(), `wmcl-sync-main-${Date.now()}`);

const allowedRootEntries = new Set([
  '.gitignore',
  '.firebaserc',
  'README.md',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'vite.config.ts',
  'netlify.toml',
  'index.html',
  'firebase-applet-config.json',
  'firebase.json',
  'firestore.rules',
  'firestore.indexes.json',
  'src',
  'public',
  'styles',
  'medios'
]);

const allowedPackageScripts = new Set(['dev', 'build', 'preview', 'clean', 'lint']);

function run(cmd, options = {}) {
  const result = execSync(cmd, { stdio: 'pipe', encoding: 'utf8', ...options }).trim();
  return result;
}

async function removeExtraFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === '.git') continue;
    if (!allowedRootEntries.has(entry.name)) {
      const targetPath = path.join(dir, entry.name);
      await rm(targetPath, { recursive: true, force: true });
      console.log(`Removed from main worktree: ${entry.name}`);
    }
  }
}

async function copyRecursive(src, dest) {
  const stat = await lstat(src);
  if (stat.isDirectory()) {
    await mkdir(dest, { recursive: true });
    const items = await readdir(src, { withFileTypes: true });
    for (const item of items) {
      await copyRecursive(path.join(src, item.name), path.join(dest, item.name));
    }
  } else if (stat.isFile()) {
    await mkdir(path.dirname(dest), { recursive: true });
    await cp(src, dest);
  }
}

async function syncPackageJson(sourcePath, destPath) {
  const pkgJsonText = await readFile(sourcePath, 'utf8');
  const pkg = JSON.parse(pkgJsonText);
  if (pkg.scripts) {
    pkg.scripts = Object.fromEntries(
      Object.entries(pkg.scripts).filter(([key]) => allowedPackageScripts.has(key))
    );
  }
  await writeFile(destPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
}

async function copyWhitelist() {
  for (const entry of allowedRootEntries) {
    const srcPath = path.join(root, entry);
    const destPath = path.join(tempDir, entry);
    try {
      await copyRecursive(srcPath, destPath);
      console.log(`Copied ${entry}`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.warn(`Skipped missing entry: ${entry}`);
        continue;
      }
      throw error;
    }
  }
  await syncPackageJson(path.join(root, 'package.json'), path.join(tempDir, 'package.json'));
}

async function main() {
  const currentBranch = run('git rev-parse --abbrev-ref HEAD');
  if (currentBranch !== sourceBranch) {
    throw new Error(`This script must be run from branch '${sourceBranch}'. Current branch is '${currentBranch}'.`);
  }

  console.log(`Running sync from ${sourceBranch} to ${targetBranch}`);
  console.log(`Temporary main worktree: ${tempDir}`);

  if (dryRun) {
    console.log('Dry run enabled. No changes will be pushed.');
  }

  run(`git worktree add --checkout ${JSON.stringify(tempDir)} ${targetBranch}`);

  try {
    await removeExtraFiles(tempDir);
    await copyWhitelist();

    const gitStatus = run(`git -C ${JSON.stringify(tempDir)} status --short`);
    if (!gitStatus) {
      console.log('No changes detected in main after syncing essential files.');
      return;
    }

    console.log('Changes detected in main worktree:');
    console.log(gitStatus);

    run(`git -C ${JSON.stringify(tempDir)} add --all`);
    run(`git -C ${JSON.stringify(tempDir)} commit -m "Sync main with essential deployment files from desarrollo"`);
    console.log('Committed synced changes to main.');

    if (push) {
      console.log('Pushing main to origin...');
      run(`git -C ${JSON.stringify(tempDir)} push origin ${targetBranch}`);
      console.log('Pushed main to origin.');
    } else {
      console.log('Done. Use --push to push main automatically.');
    }
  } finally {
    run(`git worktree remove --force ${JSON.stringify(tempDir)}`);
    console.log('Temporary worktree removed.');
  }
}

main().catch(error => {
  console.error('Sync failed:', error.message);
  process.exit(1);
});
