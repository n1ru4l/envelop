import { IRoutes, GenerateRoutes } from '@guild-docs/server';

export function getRoutes(): IRoutes {
  const Routes: IRoutes = {
    _: {
      docs: {
        $name: 'Getting Started',
        $routes: [
          ['README', 'Introduction'],
          ['getting-started', 'First Steps'],
          ['integrations', 'Integrations and Examples'],
          ['core', '@envelop/core'],
          ['composing-envelop', 'Sharing Envelops'],
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
    },
  };

  GenerateRoutes({
    Routes,
  });

  return Routes;
}
