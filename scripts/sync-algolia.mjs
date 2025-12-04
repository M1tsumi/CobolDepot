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

const chunkArray = (items, size = 1000) => {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

const readRegistryManifests = async () => {
  const entries = await readdir(registryDir, { withFileTypes: true });
  const yamlFiles = entries.filter((entry) => entry.isFile() && entry.name.endsWith('.yaml'));
  if (yamlFiles.length === 0) {
    throw new Error('No registry manifests found to sync.');
  }

  const manifests = [];

  for (const file of yamlFiles) {
    const absolutePath = path.join(registryDir, file.name);
    const source = path.relative(process.cwd(), absolutePath);
    const raw = await readFile(absolutePath, 'utf-8');
    let parsed;
    try {
      parsed = YAML.parse(raw);
    } catch (error) {
      throw new Error(`Unable to parse YAML in ${source}: ${error.message}`);
    }

    validateManifest(parsed, source);
    manifests.push(parsed);
  }

  return manifests;
};

const validateManifest = (manifest, source) => {
  for (const field of requiredFields) {
    if (manifest[field] === undefined || manifest[field] === null) {
      throw new Error(`Missing required field "${field}" in ${source}`);
    }
  }

  for (const field of stringFields) {
    if (typeof manifest[field] !== 'string' || !manifest[field].trim()) {
      throw new Error(`Field "${field}" must be a non-empty string in ${source}`);
    }
  }

  if (!Array.isArray(manifest.keywords) || manifest.keywords.length === 0) {
    throw new Error(`Field "keywords" must be a non-empty array in ${source}`);
  }

  if (!manifest.keywords.every((keyword) => typeof keyword === 'string' && keyword.trim().length > 0)) {
    throw new Error(`Field "keywords" must only contain non-empty strings in ${source}`);
  }

  if (typeof manifest.version === 'string' && !semverRegex.test(manifest.version)) {
    throw new Error(`Field "version" must be a valid semver string in ${source}`);
  }

};

const normalizeRecords = (manifests) =>
  manifests.map((manifest) => ({
    objectID: manifest.name,
    type: 'package',
    ...manifest,
    keywords: manifest.keywords || [],
    updatedTimestamp: Number.isNaN(Date.parse(manifest.updatedAt)) ? 0 : Date.parse(manifest.updatedAt),
  }));

const getAlgoliaConfig = () => {
  const appId = process.env.ALGOLIA_APP_ID;
  const adminKey = process.env.ALGOLIA_ADMIN_KEY;
  const indexName = process.env.ALGOLIA_INDEX_NAME;

  if (!appId || !adminKey || !indexName) {
    throw new Error('ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY, and ALGOLIA_INDEX_NAME must be set to sync the index.');
  }

  return { appId, adminKey, indexName };
};

const pushToAlgolia = async (records, { appId, adminKey, indexName }) => {
  const endpoint = `https://${appId}.algolia.net/1/indexes/${encodeURIComponent(indexName)}/batch`;
  const chunks = chunkArray(records, 1000);

  for (const chunk of chunks) {
    const payload = {
      requests: chunk.map((record) => ({
        action: 'replaceObject',
        body: record,
      })),
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Algolia-Application-Id': appId,
        'X-Algolia-API-Key': adminKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Algolia sync failed with status ${response.status}: ${details}`);
    }
  }
};

const run = async () => {
  const manifests = await readRegistryManifests();
  const records = normalizeRecords(manifests);
  const config = getAlgoliaConfig();

  console.log(`Preparing to sync ${records.length} record(s) to Algolia index "${config.indexName}"...`);
  await pushToAlgolia(records, config);
  console.log('✔ Algolia index synced successfully.');
};

run().catch((error) => {
  console.error(`Algolia sync failed: ${error.message}`);
  process.exitCode = 1;
});
