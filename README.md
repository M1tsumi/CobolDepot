# CobolDepot

CobolDepot is a static-first COBOL package registry + docs experience deployed to Cloudflare Pages. The project uses Astro, TailwindCSS (with DaisyUI), and an Algolia-powered search overlay.

## Getting Started

```bash
npm install
npm run dev
```

Production builds run via `npm run build`, which triggers the registry validator before emitting the `dist/` output served by Cloudflare Pages.

## Registry Manifests

Package metadata is stored under `registry/*.yaml`. Each file must include the required fields outlined in `scripts/validate-registry.mjs`. Run `npm run validate:registry` locally (and note it also runs automatically before `npm run build`).

## Search Configuration

The search UI connects to Algolia when the following environment variables are present (all prefixed with `PUBLIC_` to be exposed at build/runtime):

| Variable | Description |
| --- | --- |
| `PUBLIC_ALGOLIA_APP_ID` | Algolia Application ID for the CobolDepot index. |
| `PUBLIC_ALGOLIA_SEARCH_KEY` | Search-only API key scoped to read access. |
| `PUBLIC_ALGOLIA_INDEX_NAME` | Algolia index containing the package/doc records. |

When these variables are absent, the UI falls back to client-side filtering of the local registry data for demos.

## Cloudflare Pages Notes

1. Connect the repository and set the **Build Command** to `npm run build` with **Build Output Directory** `dist`.
2. Add the Algolia env vars above (plus any future secrets) under **Pages → Settings → Environment Variables**, making sure preview + production values are set.
3. Use `_headers` / `_redirects` if you need custom caching or routing rules.
4. Each push to `main` produces the production deployment; pull requests automatically generate preview URLs.

## Algolia Index Sync

Populate the Algolia index anytime the registry changes by running:

```bash
ALGOLIA_APP_ID="app" ALGOLIA_ADMIN_KEY="secret" ALGOLIA_INDEX_NAME="coboldepot" npm run sync:algolia
```

The script performs the following steps:

1. Runs `npm run validate:registry` to ensure manifests are well-formed.
2. Converts each `registry/*.yaml` entry into Algolia objects (with `objectID`, `popularity`, timestamps, etc.).
3. Calls the Algolia Batch API with `replaceObject` actions in chunks of 1,000.

CI usage recommendation:

1. Store `ALGOLIA_APP_ID`, `ALGOLIA_ADMIN_KEY` (write key), and `ALGOLIA_INDEX_NAME` as encrypted secrets in your pipeline (GitHub Actions, etc.).
2. Add a job that runs on `main` (and optionally PRs) executing `npm ci && npm run sync:algolia` before the Cloudflare Pages deploy step.
3. This repo ships with `.github/workflows/algolia-sync.yml`, which triggers on `main` pushes that touch registry/scripts files and can also be run manually via the GitHub Actions tab.
4. Monitor the job logs for the "✔ Algolia index synced successfully." message before proceeding to deployment.
