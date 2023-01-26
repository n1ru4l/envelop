import type { ExecutionResult, OnExecuteEventPayload } from '@envelop/core';
import type { RedactOptions } from 'fast-redact';
import type { OperationTypeNode } from 'graphql';
import type { Inngest, EventPayload } from 'inngest';

export type AllowedOperations = Iterable<OperationTypeNode>;

export type UseInngestEntityRecord = {
  typename: string;
  id?: number | string;
};

export type UseInngestLogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error';

export type UseInngestLogger = Record<UseInngestLogLevel, (...args: any[]) => void>;

export type InngestUserContext = Pick<EventPayload, 'user'>;

export type InngestUserContextFunction = () => InngestUserContext | Promise<InngestUserContext>;

export type EventNamePrefixFunction = (options: UseInngestEventOptions) => Promise<string>;

export type BuildEventNameFunction = (options: UseInngestEventOptions) => Promise<string>;

export interface UseInngestConfig {
  eventNamePrefix?: string;
  buildEventNameFunction?: BuildEventNameFunction;
  allowedOperations?: AllowedOperations; // change to include?
  allowErrors?: boolean;
  allowIntrospection?: boolean;
  allowAnonymousOperations?: boolean;
  includeResultData?: boolean;
  redaction?: RedactOptions;
  // skip some schema coordinate queries to blacklist
  // option to send specific graphqlerror events to inngest
  logging?: boolean | UseInngestLogger | UseInngestLogLevel;
}

export interface UseInngestPluginOptions extends UseInngestConfig {
  inngestClient: Inngest<Record<string, EventPayload>>;
  userContext?: InngestUserContextFunction;
}

export type UseInngestLoggerOptions = {
  logger: UseInngestLogger;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ContextType = Record<string, any>;

export type UseInngestExecuteOptions = {
  params: OnExecuteEventPayload<ContextType>;
};

export type UseInngestEventOptions = {
  documentString?: string;
} & UseInngestExecuteOptions &
  UseInngestLoggerOptions &
  Pick<UseInngestPluginOptions, 'eventNamePrefix' | 'allowedOperations'>;

export type UseInngestDataOptions = {
  result: ExecutionResult;
} & UseInngestExecuteOptions &
  UseInngestLoggerOptions &
  Pick<
    UseInngestPluginOptions,
    | 'buildEventNameFunction'
    | 'allowedOperations'
    | 'allowErrors'
    | 'allowIntrospection'
    | 'allowAnonymousOperations'
    | 'includeResultData'
    | 'redaction'
  >;

export type UseInngestUserContextOptions = UseInngestExecuteOptions & UseInngestLoggerOptions;
