import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { createHash } from 'node:crypto';

const registryDir = fileURLToPath(new URL('../../registry', import.meta.url));

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

const semverRegex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-.]+)?(?:\+[0-9A-Za-z-.]+)?$/;

export const getPackageKey = (repository) =>
  createHash('sha256').update(repository.trim().toLowerCase()).digest('hex').slice(0, 32);

const normalizeRecord = (manifest, source) => {
  for (const field of requiredFields) {
    if (manifest[field] === undefined || manifest[field] === null) {
      throw new Error(`Missing required field "${field}" in ${source}`);
    }
  }

  if (!Array.isArray(manifest.keywords) || manifest.keywords.some((keyword) => typeof keyword !== 'string')) {
    throw new Error(`Field "keywords" must be an array of strings in ${source}`);
  }

  if (!semverRegex.test(manifest.version)) {
    throw new Error(`Field "version" must be a valid semver string in ${source}`);
  }

  const normalizedLicense = manifest.license.trim().toLowerCase();
  if (!allowedLicenses.has(normalizedLicense)) {
    throw new Error(`Field "license" must be an approved open-source license in ${source}`);
  }

  return {
    ...manifest,
    license: normalizedLicense,
    repoKey: getPackageKey(manifest.repository),
  };
};

export const loadPackages = async () => {
  const entries = await readdir(registryDir, { withFileTypes: true });
  const yamlFiles = entries.filter((entry) => entry.isFile() && entry.name.endsWith('.yaml'));

  const packages = [];
  for (const file of yamlFiles) {
    const absolutePath = path.join(registryDir, file.name);
    const raw = await readFile(absolutePath, 'utf-8');
    const parsed = YAML.parse(raw);
    packages.push(normalizeRecord(parsed, file.name));
  }

  return packages.sort((a, b) => a.name.localeCompare(b.name));
};

export const findPackageByName = (packages, name) =>
  packages.find((pkg) => pkg.name.toLowerCase() === name.toLowerCase());
