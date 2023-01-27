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

export type BuildUserContextFunction = () => InngestUserContext | Promise<InngestUserContext>;

export type BuildEventNamePrefixFunction = (options: UseInngestEventNamePrefixFunctionOptions) => Promise<string>;

export type BuildEventNameFunction = (options: UseInngestEventNameFunctionOptions) => Promise<string>;

export interface UseInngestConfig {
  buildEventNameFunction?: BuildEventNameFunction;
  buildEventNamePrefixFunction?: BuildEventNamePrefixFunction;
  sendOperations?: AllowedOperations; // change to include?
  sendErrors?: boolean;
  sendIntrospection?: boolean;
  sendAnonymousOperations?: boolean;
  includeResultData?: boolean;
  redaction?: RedactOptions;
  // skip some schema coordinate queries to blacklist
  // option to send specific graphqlerror events to inngest
  logging?: boolean | UseInngestLogger | UseInngestLogLevel;
}

export interface UseInngestPluginOptions extends UseInngestConfig {
  inngestClient: Inngest<Record<string, EventPayload>>;
  userContext?: BuildUserContextFunction;
}

export type UseInngestLoggerOptions = {
  logger: UseInngestLogger;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ContextType = Record<string, any>;

export interface UseInngestExecuteOptions {
  params: OnExecuteEventPayload<ContextType>;
  logger: UseInngestLogger;
}

export interface UseInngestEventNameFunctionOptions extends UseInngestExecuteOptions {
  documentString?: string;
  eventNamePrefix: string;
}

export interface UseInngestEventNamePrefixFunctionOptions extends UseInngestExecuteOptions {}

export type UseInngestEventOptions = {
  documentString?: string;
} & UseInngestExecuteOptions &
  Pick<UseInngestPluginOptions, 'sendOperations' | 'buildEventNamePrefixFunction'>;

export type UseInngestDataOptions = {
  eventName: string;
  result: ExecutionResult;
} & UseInngestExecuteOptions &
  UseInngestLoggerOptions &
  Pick<
    UseInngestPluginOptions,
    // | 'buildEventNameFunction'
    // | 'buildEventNamePrefixFunction'
    | 'sendOperations'
    | 'sendErrors'
    | 'sendIntrospection'
    | 'sendAnonymousOperations'
    | 'includeResultData'
    | 'redaction'
  >;

export type UseInngestUserContextOptions = UseInngestExecuteOptions & UseInngestLoggerOptions;
