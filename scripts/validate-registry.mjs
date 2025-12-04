import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const registryDir = fileURLToPath(new URL('../registry', import.meta.url));
const requiredFields = [
  'name',
  'version',
  'description',
  'author',
  'repository',
  'keywords',
  'license',
  'updatedAt',
  'popularity',
];

const stringFields = new Set([
  'name',
  'version',
  'description',
  'author',
  'repository',
  'license',
  'updatedAt',
]);

const semverRegex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-.]+)?(?:\+[0-9A-Za-z-.]+)?$/;

const formatRelative = (absolutePath) => path.relative(process.cwd(), absolutePath);

const fail = (message) => {
  console.error(message);
};

const validateManifest = (manifest, source) => {
  let hasErrors = false;

  for (const field of requiredFields) {
    if (manifest[field] === undefined || manifest[field] === null) {
      fail(`✖ Missing required field "${field}" in ${source}`);
      hasErrors = true;
    }
  }

  for (const field of stringFields) {
    if (typeof manifest[field] !== 'string' || !manifest[field].trim()) {
      fail(`✖ Field "${field}" must be a non-empty string in ${source}`);
      hasErrors = true;
    }
  }

  if (typeof manifest.repository === 'string') {
    try {
      // eslint-disable-next-line no-new
      new URL(manifest.repository);
    } catch {
      fail(`✖ Field "repository" must be a valid URL in ${source}`);
      hasErrors = true;
    }
  }

  if (typeof manifest.version === 'string' && !semverRegex.test(manifest.version)) {
    fail(`✖ Field "version" must be a valid semver string in ${source}`);
    hasErrors = true;
  }

  if (!Array.isArray(manifest.keywords) || manifest.keywords.length === 0) {
    fail(`✖ Field "keywords" must be a non-empty array of strings in ${source}`);
    hasErrors = true;
  } else if (!manifest.keywords.every((keyword) => typeof keyword === 'string' && keyword.trim().length > 0)) {
    fail(`✖ Field "keywords" must only contain non-empty strings in ${source}`);
    hasErrors = true;
  }

  if (typeof manifest.popularity !== 'number' || Number.isNaN(manifest.popularity)) {
    fail(`✖ Field "popularity" must be a number in ${source}`);
    hasErrors = true;
  }

  return hasErrors;
};

const run = async () => {
  const entries = await readdir(registryDir, { withFileTypes: true });
  const yamlFiles = entries.filter((entry) => entry.isFile() && entry.name.endsWith('.yaml'));

  if (yamlFiles.length === 0) {
    console.warn('⚠ No registry manifests found. Skipping validation.');
    return;
  }

  let hasErrors = false;

  for (const file of yamlFiles) {
    const absolutePath = path.join(registryDir, file.name);
    const source = formatRelative(absolutePath);

    try {
      const raw = await readFile(absolutePath, 'utf-8');
      const parsed = YAML.parse(raw);

      if (!parsed || typeof parsed !== 'object') {
        fail(`✖ Unable to parse YAML in ${source}`);
        hasErrors = true;
        continue;
      }

      const manifestHasErrors = validateManifest(parsed, source);
      hasErrors = hasErrors || manifestHasErrors;
    } catch (error) {
      fail(`✖ Failed to read ${source}: ${error.message}`);
      hasErrors = true;
    }
  }

  if (hasErrors) {
    fail('\nRegistry validation failed.');
    process.exitCode = 1;
    return;
  }

  console.log(`✔ Registry validation passed for ${yamlFiles.length} manifest(s).`);
};

run().catch((error) => {
  fail(`Unexpected registry validation error: ${error.message}`);
  process.exitCode = 1;
});
