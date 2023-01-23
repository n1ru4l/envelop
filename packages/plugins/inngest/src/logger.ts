import { createLogger } from 'graphql-yoga';
import type { YogaLogger } from 'graphql-yoga';

import type { UseInngestPluginOptions } from './types';

export const buildLogger = (options: Pick<UseInngestPluginOptions, 'logging'>): YogaLogger => {
  const logging = options?.logging != null ? options.logging : true;

  return typeof logging === 'boolean'
    ? logging === true
      ? createLogger()
      : createLogger('silent')
    : typeof logging === 'string'
    ? createLogger(logging)
    : logging;
};
