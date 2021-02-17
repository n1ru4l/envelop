import { PluginFn } from '../types';
import { print } from 'graphql';

type LoggerPluginOptions = {
  logger?: {
    log: typeof console.log;
    warn: typeof console.warn;
    info: typeof console.info;
    error: typeof console.error;
  };
  request?: boolean;
  response?: boolean;
};

const DEFAULT_OPTIONS = {
  logger: console,
  request: true,
  response: true,
};

export const useLogger = (rawOptions: LoggerPluginOptions = DEFAULT_OPTIONS): PluginFn => api => {
  const options = {
    DEFAULT_OPTIONS,
    ...rawOptions,
  };

  if (options.request) {
    api.on('beforeExecute', support => {
      options.logger.log('Going to execute operation: ', print(support.getExecutionParams().document));
    });
  }

  if (options.response) {
    api.on('afterExecute', support => {
      options.logger.log('Operation execution done:', support.getResult());
    });
  }
};
