import { NextApiRequest, NextApiResponse } from 'next';
import Lru from 'tiny-lru';
import { NpmsIO, PackageInfo } from 'npms.io';

const npmsIO = new NpmsIO();
const cache = Lru(100, 3.6e6); // 1h

type Tags =
  | 'tracing'
  | 'metrics'
  | 'core'
  | 'error-handling'
  | 'security'
  | 'utilities'
  | 'performance'
  | 'caching'
  | 'dev-tools'
  | 'authentication'
  | 'authorization'
  | 'schema';

export type RawPlugin = {
  title: string;
  npmPackage: string;
  tags: Tags[];
  readme?: string;
  iconUrl?: string;
};

const pluginsArr: RawPlugin[] = [
  {
    title: 'useSentry',
    npmPackage: '@envelop/sentry',
    iconUrl: '/assets/logos/sentry.png',
    tags: ['tracing', 'metrics', 'error-handling'],
  },
  {
    title: 'useSchema',
    npmPackage: '@envelop/core',
    iconUrl: '/logo.png',
    tags: ['core'],
  },
  {
    title: 'useErrorHandler',
    npmPackage: '@envelop/core',
    iconUrl: '/logo.png',
    tags: ['core', 'error-handling'],
  },
  {
    title: 'useMaskedErrors',
    npmPackage: '@envelop/core',
    iconUrl: '/logo.png',
    tags: ['core', 'error-handling', 'security'],
  },
  {
    title: 'useExtendContext',
    npmPackage: '@envelop/core',
    iconUrl: '/logo.png',
    tags: ['core', 'utilities'],
  },
  {
    title: 'useLogger',
    npmPackage: '@envelop/core',
    iconUrl: '/logo.png',
    tags: ['core', 'utilities'],
  },
  {
    title: 'usePayloadFormatter',
    npmPackage: '@envelop/core',
    iconUrl: '/logo.png',
    tags: ['core', 'utilities'],
  },
  {
    title: 'useTiming',
    npmPackage: '@envelop/core',
    iconUrl: '/logo.png',
    tags: ['core', 'tracing', 'utilities'],
  },
  {
    title: 'useGraphQLJit',
    npmPackage: '@envelop/graphql-jit',
    iconUrl: '/assets/logos/graphql.png',
    tags: ['performance'],
  },
  {
    title: 'useParserCache',
    npmPackage: '@envelop/parser-cache',
    iconUrl: '/logo.png',
    tags: ['performance', 'caching'],
  },
  {
    title: 'useValidationCache',
    npmPackage: '@envelop/validation-cache',
    iconUrl: '/logo.png',
    tags: ['performance', 'caching'],
  },
  {
    title: 'useDepthLimit',
    npmPackage: '@envelop/depth-limit',
    iconUrl: '/logo.png',
    tags: ['performance', 'security'],
  },
  {
    title: 'useDataLoader',
    npmPackage: '@envelop/dataloader',
    iconUrl: '/assets/logos/graphql.png',
    tags: ['performance'],
  },
  {
    title: 'useApolloTracing',
    npmPackage: '@envelop/apollo-tracing',
    iconUrl: '/assets/logos/apollo.png',
    tags: ['dev-tools'],
  },
  {
    title: 'useOpenTelemetry',
    npmPackage: '@envelop/opentelemetry',
    iconUrl: '/assets/logos/opentelemetry.png',
    tags: ['tracing', 'metrics', 'error-handling'],
  },
  {
    title: 'useGenericAuth',
    npmPackage: '@envelop/generic-auth',
    iconUrl: '/assets/logos/generic_auth.png',
    tags: ['security', 'authentication', 'authorization'],
  },
  {
    title: 'useAuth0',
    npmPackage: '@envelop/auth0',
    iconUrl: '/assets/logos/auth0.png',
    tags: ['security', 'authentication', 'authorization'],
  },
  {
    title: 'useGraphQLModules',
    npmPackage: '@envelop/graphql-modules',
    iconUrl: 'https://www.graphql-modules.com/img/just-logo.svg',
    tags: ['schema', 'utilities', 'dev-tools'],
  },
  {
    title: 'useRateLimiter',
    npmPackage: '@envelop/graphql-middleware',
    iconUrl: '/assets/logos/rate_limiter.png',
    tags: ['schema', 'utilities', 'security'],
  },
  {
    title: 'useDisableIntrospection',
    npmPackage: '@envelop/disable-introspection',
    iconUrl: '/assets/logos/graphql.png',
    tags: ['utilities', 'security'],
  },
  {
    title: 'useFilterAllowedOperations',
    npmPackage: '@envelop/filter-operation-type',
    iconUrl: '/assets/logos/graphql.png',
    tags: ['utilities', 'security'],
  },
  {
    title: 'usePreloadAssets',
    npmPackage: '@envelop/preload-assets',
    iconUrl: '/assets/logos/assets.png',
    tags: ['utilities'],
  },
  {
    title: 'usePersistedOperations',
    npmPackage: '@envelop/persisted-operations',
    iconUrl: '/assets/logos/persisted_operations.png',
    tags: ['security', 'performance'],
  },
  {
    title: 'useHive',
    npmPackage: '@graphql-hive/client',
    iconUrl: 'https://the-guild.dev/static/shared-logos/products/hive.svg',
    tags: ['tracing', 'metrics', 'dev-tools'],
  },
];

export type PluginWithStats = RawPlugin & {
  stats: PackageInfo;
};

async function getPackageStats(name: string): Promise<PackageInfo | null> {
  try {
    return await npmsIO.api.package.packageInfo(name);
  } catch (e) {
    return null;
  }
}

async function plugins(req: NextApiRequest, res: NextApiResponse) {
  const allPlugins = await Promise.all(
    pluginsArr.map(async rawPlugin => {
      const stats = cache.get(rawPlugin.title) || (await getPackageStats(rawPlugin.npmPackage));

      if (rawPlugin && !cache.has(rawPlugin.title)) {
        cache.set(rawPlugin.title, stats);
      }

      return {
        ...rawPlugin,
        stats,
      };
    })
  );

  res.json(allPlugins);
}

export default plugins;
