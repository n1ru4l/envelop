import { createCatchAllMeta } from 'nextra/catch-all';

export default async () => {
  const { listFiles } = await import('../../lib/remote-utils');

  const files = await listFiles({
    repo: 'https://github.com/n1ru4l/envelop',
    rootDir: 'website/src/pages/docs/',
  });

  return createCatchAllMeta(files, {
    index: 'Introduction',
    'getting-started': 'First Steps',
    integrations: 'Integrations and Examples',
    'composing-envelop': 'Sharing Envelops',
    core: '@envelop/core',
    tracing: '',
    plugins: {
      title: '',
      type: 'folder',
      items: {
        index: 'Introduction',
        'custom-plugin': 'Building Plugins',
        lifecycle: '',
        testing: '',
        typescript: 'TypeScript Support',
      },
    },
    guides: {
      title: '',
      type: 'folder',
      items: {
        'securing-your-graphql-api': '',
        'adding-authentication-with-auth0': '',
        'monitoring-and-tracing': '',
        'using-graphql-features-from-the-future': '',
        'resolving-subscription-data-loader-caching-issues': 'Resolving Subscription DataLoader Caching Issues',
        'adding-a-graphql-response-cache': '',
        'integrating-with-databases': '',
      },
    },
  });
};
