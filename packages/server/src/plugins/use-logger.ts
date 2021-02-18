import { PluginFn } from '@guildql/types';
import { print } from 'graphql';

type LoggerPluginOptions = {
  logger?: {
    log: typeof console.log;
    warn: typeof console.warn;
    info: typeof console.info;
    error: typeof console.error;
  };
  operation?: boolean;
  result?: boolean;
  ignoreIntrospection?: boolean;
};

const DEFAULT_OPTIONS: LoggerPluginOptions = {
  logger: console,
  operation: true,
  result: true,
  ignoreIntrospection: true,
};

export const useLogger = (rawOptions: LoggerPluginOptions = DEFAULT_OPTIONS): PluginFn => api => {
  const options = {
    DEFAULT_OPTIONS,
    ...rawOptions,
  };

  if (options.operation) {
    api.on('beforeExecute', support => {
      const params = support.getExecutionParams();

      if (options.ignoreIntrospection && params.isIntrospection) {
        return;
      }

      options.logger.log(`[START][${support.getOperationId()}]: `, print(params.document));
    });
  }

  if (options.result) {
    api.on('afterExecute', support => {
      const params = support.getExecutionParams();

      if (options.ignoreIntrospection && params.operationName === 'IntrospectionQuery') {
        return;
      }

      options.logger.log(`[END][${support.getOperationId()}]: `, support.getResult());
    });
  }
};
