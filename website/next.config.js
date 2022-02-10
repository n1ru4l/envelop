const { register } = require('esbuild-register/dist/node');

register({
  extensions: ['.ts', '.tsx'],
});

const { i18n } = require('./next-i18next.config');
const { withGuildDocs } = require('@guild-docs/server');
const { getRoutes } = require('./routes.ts');

module.exports = withGuildDocs({
  i18n,
  getRoutes,
  eslint: {
    ignoreDuringBuilds: true,
  },
  async redirects() {
    return [
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
    ];
  }
});


