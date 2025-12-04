import YAML from 'yaml';
import type { PackageRecord } from '../types/package';

export type { PackageRecord } from '../types/package';

const registryFiles = import.meta.glob('../../registry/*.yaml', {
  eager: true,
  as: 'raw',
}) as Record<string, string>;

const parsePackage = (raw: string, source: string): PackageRecord => {
  const parsed = YAML.parse(raw) as Partial<PackageRecord> | undefined;
  if (!parsed) {
    throw new Error(`Unable to parse registry entry: ${source}`);
  }

  const requiredFields: (keyof PackageRecord)[] = [
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

  for (const field of requiredFields) {
    if (parsed[field] === undefined || parsed[field] === null) {
      throw new Error(`Missing "${field}" in registry entry: ${source}`);
    }
  }

  return parsed as PackageRecord;
};

export const packages: PackageRecord[] = Object.entries(registryFiles)
  .map(([source, raw]) => parsePackage(raw, source))
  .sort((a, b) => a.name.localeCompare(b.name));
