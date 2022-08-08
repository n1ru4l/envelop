import { StaticImageData } from 'next/image';

import sentryIcon from '../../public/assets/logos/sentry.png';
import datadogIcon from '../../public/assets/logos/datadog.png';
import graphqlIcon from '../../public/assets/logos/graphql.png';
import apolloIcon from '../../public/assets/logos/apollo.png';
import opentelemetryIcon from '../../public/assets/logos/opentelemetry.png';
import genericAuthIcon from '../../public/assets/logos/generic_auth.png';
import rateLimiterIcon from '../../public/assets/logos/rate_limiter.png';
import graphqlArmorIcon from '../../public/assets/logos/graphql-armor.svg';
import prometheusIcon from '../../public/assets/logos/prometheus.png';
import newrelicIcon from '../../public/assets/logos/newrelic.png';
import modulesIcon from '../../public/assets/logos/modules.svg';
import auth0Icon from '../../public/assets/logos/auth0.png';
import persistedOperationsIcon from '../../public/assets/logos/persisted_operations.png';
import assetsIcon from '../../public/assets/logos/assets.png';
import envelopIcon from '../../public/logo.png';
import hiveIcon from 'https://the-guild.dev/static/shared-logos/products/hive.svg';

export const ALL_TAGS = [
  'tracing',
  'metrics',
  'core',
  'errors',
  'security',
  'utilities',
  'performance',
  'caching',
  'devtool',
  'authentication',
  'authorization',
  'schema',
  'subscription',
] as const;

export type Tags = typeof ALL_TAGS[number];

export const pluginsArr: {
  identifier: string;
  title: string;
  npmPackage: string;
  icon: StaticImageData;
  tags: Tags[];
  githubReadme?: {
    repo: string;
    path: string;
  };
  className?: string;
}[] = [
  {
    identifier: 'use-sentry',
    title: 'useSentry',
    npmPackage: '@envelop/sentry',
    icon: sentryIcon,
    className: 'dark:invert',
    tags: ['tracing', 'metrics', 'errors'],
  },
  {
    identifier: 'use-statsd',
    title: 'useStatsD',
    npmPackage: '@envelop/statsd',
    icon: datadogIcon,
    tags: ['metrics', 'errors'],
  },
  {
    identifier: 'use-schema',
    title: 'useSchema',
    githubReadme: {
      repo: 'n1ru4l/envelop',
      path: 'packages/core/docs/use-schema.md',
    },
    npmPackage: '@envelop/core',
    icon: envelopIcon,
    tags: ['core', 'schema'],
  },
  {
    identifier: 'use-async-schema',
    title: 'useAsyncSchema',
    githubReadme: {
      repo: 'n1ru4l/envelop',
      path: 'packages/core/docs/use-async-schema.md',
    },
    npmPackage: '@envelop/core',
    icon: envelopIcon,
    tags: ['core', 'schema'],
  },
  {
    identifier: 'use-lazy-loaded-schema',
    title: 'useLazyLoadedSchema',
    githubReadme: {
      repo: 'n1ru4l/envelop',
      path: 'packages/core/docs/use-lazy-loaded-schema.md',
    },
    npmPackage: '@envelop/core',
    icon: envelopIcon,
    tags: ['core', 'schema'],
  },
  {
    identifier: 'use-error-handler',
    title: 'useErrorHandler',
    githubReadme: {
      repo: 'n1ru4l/envelop',
      path: 'packages/core/docs/use-error-handler.md',
    },
    npmPackage: '@envelop/core',
    icon: envelopIcon,
    tags: ['core', 'errors'],
  },
  {
    identifier: 'use-masked-errors',
    title: 'useMaskedErrors',
    githubReadme: {
      repo: 'n1ru4l/envelop',
      path: 'packages/core/docs/use-masked-errors.md',
    },
    npmPackage: '@envelop/core',
    icon: envelopIcon,
    tags: ['core', 'errors', 'security'],
  },
  {
    identifier: 'use-extend-context',
    title: 'useExtendContext',
    githubReadme: {
      repo: 'n1ru4l/envelop',
      path: 'packages/core/docs/use-extend-context.md',
    },
    npmPackage: '@envelop/core',
    icon: envelopIcon,
    tags: ['core', 'utilities'],
  },
  {
    identifier: 'use-immediate-introspection',
    title: 'useImmediateIntrospection',
    githubReadme: {
      repo: 'n1ru4l/envelop',
      path: 'packages/core/docs/use-immediate-introspection.md',
    },
    npmPackage: '@envelop/core',
    icon: envelopIcon,
    tags: ['core', 'utilities', 'performance'],
  },
  {
    identifier: 'use-logger',
    title: 'useLogger',
    githubReadme: {
      repo: 'n1ru4l/envelop',
      path: 'packages/core/docs/use-logger.md',
    },
    npmPackage: '@envelop/core',
    icon: envelopIcon,
    tags: ['core', 'utilities'],
  },
  {
    identifier: 'use-payload-formatter',
    title: 'usePayloadFormatter',
    githubReadme: {
      repo: 'n1ru4l/envelop',
      path: 'packages/core/docs/use-payload-formatter.md',
    },
    npmPackage: '@envelop/core',
    icon: envelopIcon,
    tags: ['core', 'utilities'],
  },
  {
    identifier: 'use-timing',
    title: 'useTiming',
    githubReadme: {
      repo: 'n1ru4l/envelop',
      path: 'packages/core/docs/use-timing.md',
    },
    npmPackage: '@envelop/core',
    icon: envelopIcon,
    tags: ['core', 'tracing', 'utilities'],
  },
  {
    identifier: 'use-graphql-jit',
    title: 'useGraphQLJit',
    npmPackage: '@envelop/graphql-jit',
    icon: graphqlIcon,
    tags: ['performance'],
  },
  {
    identifier: 'use-parser-cache',
    title: 'useParserCache',
    npmPackage: '@envelop/parser-cache',
    icon: envelopIcon,
    tags: ['performance', 'caching'],
  },
  {
    identifier: 'use-validation-cache',
    title: 'useValidationCache',
    npmPackage: '@envelop/validation-cache',
    icon: envelopIcon,
    tags: ['performance', 'caching'],
  },
  {
    identifier: 'use-data-loader',
    title: 'useDataLoader',
    npmPackage: '@envelop/dataloader',
    icon: graphqlIcon,
    tags: ['performance', 'caching'],
  },
  {
    identifier: 'use-apollo-tracing',
    title: 'useApolloTracing',
    npmPackage: '@envelop/apollo-tracing',
    icon: apolloIcon,
    className: 'dark:invert',
    tags: ['devtool', 'metrics'],
  },
  {
    identifier: 'use-apollo-datasources',
    title: 'useApolloDataSources',
    npmPackage: '@envelop/apollo-datasources',
    icon: apolloIcon,
    className: 'dark:invert',
    tags: ['devtool', 'utilities'],
  },
  {
    identifier: 'use-open-telemetry',
    title: 'useOpenTelemetry',
    npmPackage: '@envelop/opentelemetry',
    icon: opentelemetryIcon,
    tags: ['tracing', 'metrics', 'errors'],
  },
  {
    identifier: 'use-generic-auth',
    title: 'useGenericAuth',
    npmPackage: '@envelop/generic-auth',
    icon: genericAuthIcon,
    className: 'dark:invert',
    tags: ['security', 'authentication', 'authorization'],
  },
  {
    identifier: 'use-auth0',
    title: 'useAuth0',
    npmPackage: '@envelop/auth0',
    icon: auth0Icon,
    tags: ['security', 'authentication', 'authorization'],
  },
  {
    identifier: 'use-graphql-modules',
    title: 'useGraphQLModules',
    npmPackage: '@envelop/graphql-modules',
    icon: modulesIcon,
    tags: ['schema', 'utilities', 'devtool'],
  },
  {
    identifier: 'use-rate-limiter',
    title: 'useRateLimiter',
    npmPackage: '@envelop/rate-limiter',
    icon: rateLimiterIcon,
    className: 'dark:invert',
    tags: ['schema', 'utilities', 'security'],
  },
  {
    identifier: 'use-disable-introspection',
    title: 'useDisableIntrospection',
    npmPackage: '@envelop/disable-introspection',
    icon: graphqlIcon,
    tags: ['utilities', 'security'],
  },
  {
    identifier: 'use-filter-allowed-operations',
    title: 'useFilterAllowedOperations',
    npmPackage: '@envelop/filter-operation-type',
    icon: graphqlIcon,
    tags: ['utilities', 'security'],
  },
  {
    identifier: 'use-preload-assets',
    title: 'usePreloadAssets',
    npmPackage: '@envelop/preload-assets',
    icon: assetsIcon,
    className: 'dark:invert',
    tags: ['utilities'],
  },
  {
    identifier: 'use-persisted-operations',
    title: 'usePersistedOperations',
    npmPackage: '@envelop/persisted-operations',
    icon: persistedOperationsIcon,
    className: 'dark:invert',
    tags: ['security', 'performance'],
  },
  {
    identifier: 'use-graphql-hive',
    title: 'useHive',
    npmPackage: '@graphql-hive/client',
    icon: hiveIcon,
    tags: ['tracing', 'metrics', 'devtool'],
  },
  {
    identifier: 'use-newrelic',
    title: 'useNewRelic',
    npmPackage: '@envelop/newrelic',
    icon: newrelicIcon,
    tags: ['tracing', 'metrics', 'errors'],
  },
  {
    identifier: 'use-live-query',
    title: 'useLiveQuery',
    npmPackage: '@envelop/live-query',
    icon: graphqlIcon,
    tags: ['utilities'],
  },
  {
    identifier: 'use-fragment-arguments',
    title: 'useFragmentArguments',
    npmPackage: '@envelop/fragment-arguments',
    icon: graphqlIcon,
    tags: ['utilities'],
  },
  {
    identifier: 'use-apollo-server-errors',
    title: 'useApolloServerErrors',
    npmPackage: '@envelop/apollo-server-errors',
    icon: apolloIcon,
    className: 'dark:invert',
    tags: ['utilities', 'errors'],
  },
  {
    identifier: 'use-operation-field-permissions',
    title: 'useOperationFieldPermissions',
    npmPackage: '@envelop/operation-field-permissions',
    icon: graphqlIcon,
    tags: ['security', 'authorization'],
  },
  {
    identifier: 'use-extended-validation',
    title: 'useExtendedValidation',
    npmPackage: '@envelop/extended-validation',
    icon: graphqlIcon,
    tags: ['devtool', 'utilities'],
  },
  {
    identifier: 'use-prometheus',
    title: 'usePrometheus',
    npmPackage: '@envelop/prometheus',
    icon: prometheusIcon,
    tags: ['metrics', 'errors'],
  },
  {
    identifier: 'use-context-value-per-execute-subscription-event',
    title: 'useContextValuePerExecuteSubscriptionEvent',
    npmPackage: '@envelop/execute-subscription-event',
    icon: graphqlIcon,
    tags: ['utilities', 'subscription'],
    githubReadme: {
      repo: 'n1ru4l/envelop',
      path: '/packages/plugins/execute-subscription-event/README.md',
    },
  },
  {
    identifier: 'use-resource-limitations',
    title: 'useResourceLimitations',
    npmPackage: '@envelop/resource-limitations',
    icon: rateLimiterIcon,
    className: 'dark:invert',
    tags: ['schema', 'utilities', 'security'],
  },
  {
    identifier: 'use-response-cache',
    title: 'useResponseCache',
    npmPackage: '@envelop/response-cache',
    icon: envelopIcon,
    tags: ['caching', 'performance'],
  },
  {
    identifier: 'use-apollo-federation',
    title: 'useApolloFederation',
    npmPackage: '@envelop/apollo-federation',
    icon: apolloIcon,
    className: 'dark:invert',
    tags: ['schema', 'utilities'],
  },
  {
    identifier: 'graphql-armor-max-aliases',
    title: 'maxAliasesPlugin',
    npmPackage: '@escape.tech/graphql-armor-max-aliases',
    icon: graphqlArmorIcon,
    tags: ['performance', 'security'],
  },
  {
    identifier: 'graphql-armor-max-depth',
    title: 'maxDepthPlugin',
    npmPackage: '@escape.tech/graphql-armor-max-depth',
    icon: graphqlArmorIcon,
    tags: ['performance', 'security'],
  },
  {
    identifier: 'graphql-armor-max-depth',
    title: 'maxDirectivesPlugin',
    npmPackage: '@escape.tech/graphql-armor-max-directives',
    icon: graphqlArmorIcon,
    tags: ['performance', 'security'],
  },
  {
    identifier: 'graphql-armor-max-tokens',
    title: 'maxTokensPlugin',
    npmPackage: '@escape.tech/graphql-armor-max-tokens',
    icon: graphqlArmorIcon,
    tags: ['performance', 'security'],
  },
  {
    identifier: 'graphql-armor-block-field-suggestions',
    title: 'blockFieldSuggestions',
    npmPackage: '@escape.tech/graphql-armor-block-field-suggestions',
    icon: graphqlArmorIcon,
    tags: ['security'],
  },
];
