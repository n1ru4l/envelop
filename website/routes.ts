import { IRoutes, GenerateRoutes } from '@guild-docs/server';

export function getRoutes(): IRoutes {
  const Routes: IRoutes = {
    _: {
      docs: {
        $name: 'Getting Started',
        $routes: [
          ['README', 'Introduction'],
          ['getting-started', 'Installation'],
          ['integrations', 'Integrations and Examples'],
          ['core', '@envelop/core'],
          ['composing-envelop', 'Sharing Envelops'],
        ],
      },
      'docs/guides': {
        $name: 'Guides',
        $routes: [
          ['securing-your-graphql-api', 'Securing Your GraphQL API'],
          ['adding-authentication-with-auth0', 'Authentication with Auth0'],
          ['monitoring-and-tracing', 'Monitoring and Tracing'],
          ['using-graphql-features-from-the-future', 'GraphQL Features from the Future'],
          ['resolving-subscription-data-loader-caching-issues', 'Resolving subscription DataLoader Cache Issues'],
          ['adding-a-graphql-response-cache', 'GraphQL Response Caching'],
        ],
      },
      'docs/plugins': {
        $name: 'Plugins',
        $routes: [
          ['README', 'Introduction'],
          ['custom-plugin', 'Building Plugins'],
          ['lifecycle', 'Lifecycle'],
          ['testing', 'Testing'],
        ],
      },
    },
  };

  GenerateRoutes({
    Routes,
  });

  return Routes;
}
