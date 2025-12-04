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
const allowedLicenses = new Set([
  'mit',
  'apache-2.0',
  'bsd-2-clause',
  'bsd-3-clause',
  'gpl-2.0',
  'gpl-3.0',
  'lgpl-2.1',
  'lgpl-3.0',
  'mpl-2.0',
  'epl-2.0',
  'cc0-1.0',
]);

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

  if (typeof manifest.license === 'string') {
    const normalized = manifest.license.trim().toLowerCase();
    if (!allowedLicenses.has(normalized)) {
      fail(
        `✖ Field "license" must be an approved open-source license (${Array.from(allowedLicenses).join(', ')}) in ${source}`,
      );
      hasErrors = true;
    }
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
