/* eslint-disable no-console */
import { Plugin } from '@envelop/types';

type LoggerPluginOptions = {
  logFn: typeof console.log;
};

const DEFAULT_OPTIONS: LoggerPluginOptions = {
  logFn: console.log,
};

export const useLogger = (rawOptions: LoggerPluginOptions = DEFAULT_OPTIONS): Plugin => {
  const options = {
    DEFAULT_OPTIONS,
    ...rawOptions,
  };

  return {
    onExecute({ args }) {
      options.logFn('execute-start', { args });

      return {
        onExecuteDone: ({ result }) => {
          options.logFn('execute-end', { args, result });
        },
      };
    },
  };
};
