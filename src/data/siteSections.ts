export type SiteSection = {
  name: string;
  description: string;
  href: string;
};

const sections: SiteSection[] = [
  {
    name: 'About',
    description: 'Mission statement, maintainer bios, governance model, and roadmap.',
    href: '/about',
  },
  {
    name: 'Blog',
    description: 'Release notes, community spotlights, and tutorials on COBOL best practices.',
    href: '/blog',
  },
  {
    name: 'Community',
    description: 'Join Discord, mailing lists, and office hours to collaborate on CobolDepot.',
    href: '/community',
  },
  {
    name: 'Docs',
    description: 'Step-by-step instructions for installing the CLI, publishing packages, and using the API.',
    href: '/docs',
  },
  {
    name: 'FAQ',
    description: 'Find answers to onboarding, security, and troubleshooting questions.',
    href: '/faq',
  },
  {
    name: 'Guides',
    description: 'Opinionated tutorials for migrating legacy COBOL projects and setting up CI/CD.',
    href: '/guides',
  },
  {
    name: 'Info',
    description: 'Governance notes, open-source requirements, and CobolDepot CLI references.',
    href: '/info',
  },
  {
    name: 'Home',
    description: 'Hero entrypoint with search, featured packages, and quick start actions.',
    href: '/',
  },
  {
    name: 'Packages Index',
    description: 'Alphabetized, filterable directory of COBOL packages with metadata cards.',
    href: '/packages',
  },
  {
    name: 'Privacy',
    description: 'How we treat telemetry, community submissions, and support data.',
    href: '/privacy',
  },
  {
    name: 'Search',
    description: 'Advanced search interface with filtering, keyboard navigation, and instant results.',
    href: '/search',
  },
  {
    name: 'Support',
    description: 'Contact form, SLA, and incident history for transparency and trust.',
    href: '/support',
  },
];

sections.sort((a, b) => a.name.localeCompare(b.name));

export const siteSections = sections;
export const primaryNav = siteSections.filter((section) =>
  ['Home', 'Docs', 'Packages Index', 'Search', 'Support'].includes(section.name),
);
