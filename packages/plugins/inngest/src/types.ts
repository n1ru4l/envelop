import type { ExecutionResult, OnExecuteEventPayload } from '@envelop/core';
import type { RedactOptions } from 'fast-redact';
import type { OperationTypeNode } from 'graphql';
import type { Inngest, ClientOptions, EventPayload } from 'inngest';

export type AllowedOperations = Iterable<OperationTypeNode>;

export type UseInngestEntityRecord = {
  typename: string;
  id?: number | string;
};

export type UseInngestLogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error';

export type UseInngestLogger = Record<UseInngestLogLevel, (...args: any[]) => void>;

export type InngestUserContext = Pick<EventPayload, 'user'>;

export type InngestUserContextFunction = () => InngestUserContext | Promise<InngestUserContext>;

export type UseInngestPluginOptions = {
  inngestClient?: Inngest<Record<string, EventPayload>> | ClientOptions;
  eventNamePrefix?: string;
  allowedOperations?: AllowedOperations;
  allowErrors?: boolean;
  allowIntrospection?: boolean;
  allowAnonymousOperations?: boolean;
  includeResultData?: boolean;
  redaction?: RedactOptions;
  // skip some schema coordinate queries to blacklist
  // option to send specific graphqlerror events to inngest
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
  Pick<UseInngestPluginOptions, 'eventNamePrefix'> &
  Pick<UseInngestPluginOptions, 'allowedOperations'>;

export type InngestDataOptions = {
  result: ExecutionResult;
} & InngestEventExecuteOptions &
  InngestLoggerOptions &
  Pick<UseInngestPluginOptions, 'allowedOperations'> &
  Pick<UseInngestPluginOptions, 'allowErrors'> &
  Pick<UseInngestPluginOptions, 'allowIntrospection'> &
  Pick<UseInngestPluginOptions, 'allowAnonymousOperations'> &
  Pick<UseInngestPluginOptions, 'includeResultData'> &
  Pick<UseInngestPluginOptions, 'redaction'>;

export type InngestUserContextOptions = InngestEventExecuteOptions & InngestLoggerOptions;
