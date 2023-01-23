import type { ExecutionResult, OnExecuteEventPayload } from '@envelop/core';
import type { RedactOptions } from 'fast-redact';

import type { Inngest, ClientOptions, EventPayload } from 'inngest';

export type UseInngestLogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error';

export type UseInngestLogger = Record<UseInngestLogLevel, (...args: any[]) => void>;

export type InngestUserContext = Pick<EventPayload, 'user'>;

export type InngestUserContextFunction = () => InngestUserContext | Promise<InngestUserContext>;

export type UseInngestPluginOptions = {
  inngestClient: Inngest<Record<string, EventPayload>> | ClientOptions;
  eventNamePrefix?: string;
  includeErrors?: boolean;
  includeIntrospection?: boolean;
  skipAnonymousOperations?: boolean;
  omitData?: boolean;
  redaction?: RedactOptions;
  logging?: boolean | UseInngestLogger | UseInngestLogLevel;
  userContext?: InngestUserContextFunction;
};

export type InngestLoggerOptions = {
  logger: UseInngestLogger;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ContextType = Record<string, any>;

export type InngestEventExecuteOptions = {
  params: OnExecuteEventPayload<ContextType>;
};

export type InngestEventOptions = {
  documentString?: string;
} & InngestEventExecuteOptions &
  InngestLoggerOptions &
  Pick<UseInngestPluginOptions, 'eventNamePrefix'>;

export type InngestDataOptions = {
  result: ExecutionResult;
} & InngestEventExecuteOptions &
  InngestLoggerOptions &
  Pick<UseInngestPluginOptions, 'includeErrors'> &
  Pick<UseInngestPluginOptions, 'includeIntrospection'> &
  Pick<UseInngestPluginOptions, 'redaction'> &
  Pick<UseInngestPluginOptions, 'skipAnonymousOperations'>;

export type InngestUserContextOptions = InngestEventExecuteOptions & InngestLoggerOptions;
