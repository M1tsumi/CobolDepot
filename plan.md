# Cloudflare Static Deployment Plan

## 1. Overview
- Goal: Launch the CobolDepot static site (package manager + docs) via Cloudflare Pages for reliable global delivery.
- Approach: Keep the site static-first, driven by generated package metadata, with progressive enhancements for search and browsing.
- Note: Cloudflare Pages is already connected to this GitHub repository.

## 2. Cloudflare Pages Deployment Workflow
1. **Repository Connection**: GitHub repo is connected to Cloudflare Pages; main branch = production, preview branches for PRs.
2. **Build Command**: `npm run build` (or corresponding static site generator command once chosen); output to `dist/`.
3. **Environment Variables**: Store API keys (e.g., search index) as encrypted Cloudflare Pages env vars.
4. **Routing & Headers**: Use `_headers` and `_redirects` to manage caching, security headers, and pretty URLs.
5. **Custom Domain & SSL**: Add apex + `www` domain, enforce HTTPS, enable HTTP/3.
6. **Caching Strategy**: Leverage Cloudflare CDN defaults; fine-tune cache TTL in `_headers`; purge on release.
7. **Observability**: Enable Analytics, set up notifications for failed builds, script synthetic checks via Cloudflare Workers if needed.

## 3. Packages
Packages will be added as the community contributes. See the example package below for reference when submitting a PR.

### Example Package Entry
```yaml
name: example-cobol-utils
version: 1.0.0
description: A sample COBOL utility library demonstrating package structure.
author: your-github-username
repository: https://github.com/M1tsumi/CobolDepot
keywords:
  - cobol
  - utility
  - example
license: MIT
```

To add a package, open a pull request following this format.

## 4. Site Organization (Alphabetical)
- **About**: Mission statement, maintainer info, roadmap, and contribution guidelines.
- **Blog**: Release notes, community highlights, and deep dives into COBOL package usage.
- **Community**: Links to Discord, mailing list, and community call schedule.
- **Docs**: How-to guides for installing CobolDepot CLI, publishing packages, and API references.
- **FAQ**: Quick answers for onboarding, security, and troubleshooting.
- **Guides**: Opinionated tutorials (e.g., migrating legacy COBOL projects, setting up CI).
- **Home**: Hero section with search bar, featured packages, and quick-start CTA.
- **Packages Index**: Filterable, alphabetized list of COBOL packages with metadata cards.
- **Search**: Dedicated page that mirrors global search but offers advanced filtering and keyboard navigation.
- **Support**: Contact form, SLA details, and incident history for transparency.

## 5. Search Implementation (Alphabetical)
- **Autocomplete**: Provide instant suggestions as users type, highlighting package names and categories.
- **Breadcrumb Filters**: Surface active filters (e.g., platform, maintainer) with one-click removal.
- **Client Caching**: Cache recent search results in session storage for snappy back/forward nav.
- **Debounced Input**: Delay API calls by ~150ms to reduce chatter while typing.
- **Federated Results**: Return mixed package + doc hits with clear labels for context.
- **Keyboard Shortcuts**: Support `/` to focus search and arrow navigation through results.
- **Relevance Signals**: Rank by popularity, recent updates, and exact name matches.
- **Relevance Signals**: Rank by recent updates, exact name matches, and documentation hits.
- **Synonym Sets**: Map COBOL jargon (e.g., "copybook" vs "module") for better discoverability.
- **Algolia Env Vars**: Configure `PUBLIC_ALGOLIA_APP_ID`, `PUBLIC_ALGOLIA_SEARCH_KEY`, and `PUBLIC_ALGOLIA_INDEX_NAME` as Cloudflare Pages environment variables so the Astro build can hydrate the search UI. Missing values should keep the site in local-only demo mode.

### Cloudflare Pages Search Setup
1. **Secrets**: Add the Algolia env vars above in both Preview and Production environments. Keys must be scoped to search-only access.
2. **Index Sync**: Run the (future) indexing script in CI before deploying so the Algolia index mirrors `registry/*.yaml`.
3. **Validation**: Ensure `npm run validate:registry` passes before triggering the Algolia sync + build pipeline.

## 6. Next Steps
1. Choose the static site framework (Astro vs. alternative) and scaffold base project.
2. Implement package metadata ingestion pipeline feeding the Packages Index + search index.
3. Configure Cloudflare Pages env vars and branch deploy rules.
4. Stand up Algolia (or similar) index, wire up search UI, and validate caching.
5. Launch MVP, monitor analytics, and iterate on content + performance.
