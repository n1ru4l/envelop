import { Plugin } from '@guildql/types';
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

export const useLogger = (rawOptions: LoggerPluginOptions = DEFAULT_OPTIONS): Plugin => {
  const options = {
    DEFAULT_OPTIONS,
    ...rawOptions,
  };

  return {
    onExecute({ args }) {
      const uuid =
        new Date().getTime().toString(36) +
        Math.random()
          .toString(36)
          .slice(2);

      options.logger.log(`[START][${uuid}][${args.operationName}]: `, print(args.document));

      return {
        onExecuteDone: () => {
          options.logger.log(`[END][${uuid}][${args.operationName}]`);
        },
      };
    },
  };
};
