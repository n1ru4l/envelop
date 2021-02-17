/* eslint-disable no-console */
import { Plugin } from '@envelop/types';

export type LoggerEventType = 'execute-start' | 'execute-end';

type LoggerPluginOptions = {
  logFn: typeof console.log;
  operation?: boolean;
  result?: boolean;
  ignoreIntrospection?: boolean;
};

const DEFAULT_OPTIONS: LoggerPluginOptions = {
  logFn: console.log,
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

      options.logFn('execute-start', { uuid, args });

      return {
        onExecuteDone: ({ result }) => {
          options.logFn('execute-end', { uuid, args, result });
        },
      };
    },
  };
};
