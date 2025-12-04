#!/usr/bin/env node
import process from 'node:process';
import path from 'node:path';
import { mkdir, rm, writeFile, stat } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { loadPackages, findPackageByName } from './utils/registry.js';

const log = (...args) => console.log('[coboldepot]', ...args);
const error = (...args) => console.error('[coboldepot]', ...args);

const ensureGitAvailable = async () =>
  new Promise((resolve, reject) => {
    const child = spawn('git', ['--version'], { stdio: 'ignore' });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error('git executable not found in PATH'));
      }
    });
  });

const installPackage = async (pkg) => {
  await ensureGitAvailable();

  const installRoot = path.resolve(process.cwd(), '.coboldepot', 'packages');
  await mkdir(installRoot, { recursive: true });
  const targetDir = path.join(installRoot, `${pkg.name}@${pkg.version}`);

  try {
    await stat(targetDir);
    log(`Removing existing installation at ${targetDir}`);
    await rm(targetDir, { recursive: true, force: true });
  } catch (err) {
    if (err.code !== 'ENOENT') {
      throw err;
    }
  }

  log(`Cloning ${pkg.repository} into ${targetDir}`);
  await new Promise((resolve, reject) => {
    const child = spawn('git', ['clone', '--depth=1', pkg.repository, targetDir], { stdio: 'inherit' });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`git clone exited with code ${code}`));
      }
    });
  });

  const metadata = {
    name: pkg.name,
    version: pkg.version,
    repository: pkg.repository,
    repoKey: pkg.repoKey,
    license: pkg.license,
    installedAt: new Date().toISOString(),
  };

  await writeFile(path.join(targetDir, 'coboldepot.json'), JSON.stringify(metadata, null, 2));
  log(`Installed ${pkg.name}@${pkg.version}. Repo key ${pkg.repoKey} recorded in coboldepot.json.`);
};

const listPackages = (packages) => {
  const rows = packages.map((pkg) => `${pkg.name.padEnd(24)} ${pkg.version.padEnd(8)} ${pkg.license.toUpperCase()} ${pkg.repository}`);
  log('Available packages (open-source only):');
  rows.forEach((row) => console.log('  ', row));
};

const showPackageInfo = (pkg) => {
  log(`Package: ${pkg.name}`);
  console.log(`  Version     : ${pkg.version}`);
  console.log(`  License     : ${pkg.license.toUpperCase()}`);
  console.log(`  Repository  : ${pkg.repository}`);
  console.log(`  Repo key    : ${pkg.repoKey}`);
  console.log(`  Author      : ${pkg.author}`);
  console.log(`  Keywords    : ${pkg.keywords.join(', ')}`);
  console.log(`  Updated     : ${pkg.updatedAt}`);
};

const run = async () => {
  const [, , command, ...params] = process.argv;
  const packages = await loadPackages();

  if (!command || ['-h', '--help'].includes(command)) {
    console.log(`CobolDepot CLI
Usage:
  coboldepot list
  coboldepot info <package>
  coboldepot install <package>
`);
    return;
  }

  if (command === 'list') {
    listPackages(packages);
    return;
  }

  const packageName = params[0];
  if (!packageName) {
    throw new Error(`Missing package name for command "${command}"`);
  }

  const pkg = findPackageByName(packages, packageName);
  if (!pkg) {
    throw new Error(`Package "${packageName}" not found in registry.`);
  }

  switch (command) {
    case 'info':
      showPackageInfo(pkg);
      break;
    case 'install':
      if (!pkg.repository.startsWith('https://github.com/')) {
        throw new Error('Only GitHub repositories are supported for installation at this time.');
      }
      await installPackage(pkg);
      break;
    default:
      throw new Error(`Unknown command "${command}"`);
  }
};

run().catch((err) => {
  error(err.message);
  process.exitCode = 1;
});
