import type { StatsD } from 'hot-shots';
import {
  AfterParseEventPayload,
  isAsyncIterable,
  isIntrospectionOperationString,
  Plugin,
} from '@envelop/core';

export interface StatsDPluginOptions {
  client: StatsD;
  /**
   * If you wish to disable introspection logging (default: false)
   */
  skipIntrospection?: boolean;
  /**
   * <prefix>.operations.count (default: graphql)
   */
  prefix?: string;
}

export const metricNames = {
  operationCount: 'operations.count',
  errorCount: 'operations.error_count',
  latency: 'operations.latency',
};

interface Tags {
  [key: string]: string;
}

function getOperation(document: any) {
  return document.definitions.find((def: any) => def.kind === 'OperationDefinition');
}

function isParseFailure(
  parseResult: AfterParseEventPayload<any>['result'],
): parseResult is Error | null {
  return parseResult === null || parseResult instanceof Error;
}

const tagsByContext = new WeakMap<any, Tags>();
const timeByContext = new WeakMap<any, number>();

function getTags(context: any) {
  return tagsByContext.get(context);
}

export const useStatsD = (options: StatsDPluginOptions): Plugin => {
  const { client, prefix = 'graphql', skipIntrospection = false } = options;

  function createMetricName(name: string) {
    return `${prefix}.${name}`;
  }

  function increaseErrorCount(tags?: Tags) {
    client.increment(createMetricName(metricNames.errorCount), tags);
  }

  function increaseOperationCount(tags?: Tags) {
    client.increment(createMetricName(metricNames.operationCount), tags);
  }

  return {
    onEnveloped({ context }) {
      timeByContext.set(context, Date.now());
    },
    onParse({ extendContext, params }) {
      if (skipIntrospection && isIntrospectionOperationString(params.source)) {
        return;
      }

      return function onParseDone(payload) {
        if (isParseFailure(payload.result)) {
          increaseErrorCount();
          increaseOperationCount();
        } else {
          const operation = getOperation(payload.result);
          tagsByContext.set(payload.context, {
            operation: operation?.name?.value || 'anonymous',
          });
        }
      };
    },
    onValidate({ context }) {
      const tags = getTags(context);

      if (!tags) {
        return undefined;
      }

      return function onValidateDone({ valid }) {
        if (!valid) {
          increaseErrorCount(tags);
          increaseOperationCount(tags);
        }
      };
    },
    onExecute({ args }) {
      const tags = getTags(args.contextValue);

      if (!tags) {
        return undefined;
      }

      return {
        onExecuteDone({ result }) {
          const start = timeByContext.get(args.contextValue);
          if (start == null) {
            return;
          }
          const latency = Date.now() - start;

          if (isAsyncIterable(result)) {
            // eslint-disable-next-line no-console
            console.warn(
              `Plugin "statsd" encountered a AsyncIterator which is not supported yet, so tracing data is not available for the operation.`,
            );
            return;
          }

          increaseOperationCount(tags);

          if (result.errors && Array.isArray(result.errors)) {
            increaseErrorCount(tags);
          } else {
            client.histogram(createMetricName(metricNames.latency), latency, tags);
          }
        },
      };
    },
  };
};
