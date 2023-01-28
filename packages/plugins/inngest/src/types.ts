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

export type InngestUserContext = Record<string, any> | undefined;

export type UseInngestUserContextOptions = UseInngestExecuteOptions & UseInngestLoggerOptions;

export type BuildUserContextFunction = (
  options: UseInngestUserContextOptions
) => InngestUserContext | Promise<InngestUserContext>;

export type BuildEventNamePrefixFunction = (options: UseInngestEventNamePrefixFunctionOptions) => Promise<string>;

export type BuildEventNameFunction = (options: UseInngestEventNameFunctionOptions) => Promise<string>;
export interface UseInngestPluginOptions {
  inngestClient: Inngest<Record<string, EventPayload>>;
  buildEventNameFunction?: BuildEventNameFunction;
  buildEventNamePrefixFunction?: BuildEventNamePrefixFunction;
  buildUserContextFunction?: BuildUserContextFunction;
  userContext?: BuildUserContextFunction;
  logging?: boolean | UseInngestLogger | UseInngestLogLevel;
  sendOperations?: AllowedOperations;
  sendErrors?: boolean;
  sendIntrospection?: boolean;
  sendAnonymousOperations?: boolean;
  denylist?: { types?: string[]; schemaCoordinates?: string[] };
  includeResultData?: boolean;
  redaction?: RedactOptions;
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
    | 'sendOperations'
    | 'sendErrors'
    | 'sendIntrospection'
    | 'sendAnonymousOperations'
    | 'denylist'
    | 'includeResultData'
    | 'redaction'
  >;
