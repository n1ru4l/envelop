import { createRequire } from 'node:module';
import { withGuildDocs } from '@guild-docs/server';
import { register } from 'esbuild-register/dist/node.js';
import { i18n } from './next-i18next.config.js';

const require = createRequire(import.meta.url);
register({ extensions: ['.ts', '.tsx'] });

const { getRoutes } = require('./routes.ts');

export default withGuildDocs({
  i18n,
  getRoutes,
  eslint: {
    ignoreDuringBuilds: true,
  },
  redirects: () => [
    /* Guides */
    {
      source: '/docs/securing-your-graphql-api',
      destination: '/docs/guides/securing-your-graphql-api',
      permanent: true,
    },
    {
      source: '/docs/adding-authentication-with-auth0',
      destination: '/docs/guides/adding-authentication-with-auth0',
      permanent: true,
    },
    {
      source: '/docs/monitoring-and-tracing',
      destination: '/docs/guides/monitoring-and-tracing',
      permanent: true,
    },
    {
      source: '/docs/using-graphql-features-from-the-future',
      destination: '/docs/guides/using-graphql-features-from-the-future',
      permanent: true,
    },
    {
      source: '/docs/resolving-subscription-data-loader-caching-issues',
      destination: '/docs/guides/resolving-subscription-data-loader-caching-issues',
      permanent: true,
    },
    {
      source: '/docs/adding-a-graphql-response-cache',
      destination: '/docs/guides/adding-a-graphql-response-cache',
      permanent: true,
    },
    {
      source: '/plugins/use-depth-limit',
      destination: '/plugins/graphql-armor-max-depth',
      permanent: true,
    },
  ],
});
