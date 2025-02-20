import { GraphQLResolveInfo, responsePathAsArray } from 'graphql';
import { minimatch } from 'minimatch';
import { mapMaybePromise, Plugin } from '@envelop/core';
import { useOnResolve } from '@envelop/on-resolve';
import { createGraphQLError, getDirectiveExtensions } from '@graphql-tools/utils';
import { getGraphQLRateLimiter } from './get-graphql-rate-limiter.js';
import { InMemoryStore } from './in-memory-store.js';
import { RateLimitError } from './rate-limit-error.js';
import { RedisStore } from './redis-store.js';
import { Store } from './store.js';
import {
  FormatErrorInput,
  GraphQLRateLimitConfig,
  GraphQLRateLimitDirectiveArgs,
  Identity,
  Options,
} from './types.js';

export {
  FormatErrorInput,
  GraphQLRateLimitConfig,
  GraphQLRateLimitDirectiveArgs,
  Identity,
  InMemoryStore,
  Options,
  RateLimitError,
  RedisStore,
  Store,
};

export type IdentifyFn<ContextType = unknown> = (context: ContextType) => string;

export type MessageInterpolator<ContextType = unknown> = (
  message: string,
  identifier: string,
  params: {
    root: unknown;
    args: Record<string, unknown>;
    context: ContextType;
    info: GraphQLResolveInfo;
  },
) => string;

export const DIRECTIVE_SDL = /* GraphQL */ `
  directive @rateLimit(
    max: Int
    window: String
    message: String
    identityArgs: [String]
    arrayLengthField: String
    readOnly: Boolean
    uncountRejected: Boolean
  ) on FIELD_DEFINITION
`;

export type RateLimitDirectiveArgs = {
  max?: number;
  window?: string;
  message?: string;
  identityArgs?: string[];
  arrayLengthField?: string;
  readOnly?: boolean;
  uncountRejected?: boolean;
};

export type RateLimiterPluginOptions = {
  identifyFn: IdentifyFn;
  rateLimitDirectiveName?: 'rateLimit' | string;
  transformError?: (message: string) => Error;
  onRateLimitError?: (event: {
    error: string;
    identifier: string;
    context: unknown;
    info: GraphQLResolveInfo;
  }) => void;
  interpolateMessage?: MessageInterpolator;
  configByField?: ConfigByField[];
} & Omit<GraphQLRateLimitConfig, 'identifyContext'>;

export interface ConfigByField extends RateLimitDirectiveArgs {
  type: string;
  field: string;
  identifyFn?: IdentifyFn;
}

export const defaultInterpolateMessageFn: MessageInterpolator = (message, identifier) =>
  interpolateByArgs(message, { id: identifier });

interface RateLimiterContext {
  rateLimiterFn: ReturnType<typeof getGraphQLRateLimiter>;
}

export const useRateLimiter = (options: RateLimiterPluginOptions): Plugin<RateLimiterContext> => {
  const rateLimiterFn = getGraphQLRateLimiter({
    ...options,
    identifyContext: options.identifyFn,
  });

  const interpolateMessage = options.interpolateMessage || defaultInterpolateMessageFn;

  return {
    onPluginInit({ addPlugin }) {
      addPlugin(
        useOnResolve(({ root, args, context, info }) => {
          const field = info.parentType.getFields()[info.fieldName];
          if (field) {
            const directives = getDirectiveExtensions<{
              rateLimit?: RateLimitDirectiveArgs;
            }>(field);
            const rateLimitDefs = directives?.rateLimit;

            let rateLimitDef = rateLimitDefs?.[0];
            let identifyFn = options.identifyFn;
            let fieldIdentity = false;

            if (!rateLimitDef) {
              const foundConfig = options.configByField?.find(
                ({ type, field }) =>
                  minimatch(info.parentType.name, type) && minimatch(info.fieldName, field),
              );
              if (foundConfig) {
                rateLimitDef = foundConfig;
                if (foundConfig.identifyFn) {
                  identifyFn = foundConfig.identifyFn;
                  fieldIdentity = true;
                }
              }
            }

            if (rateLimitDef) {
              const message = rateLimitDef.message;
              const max = rateLimitDef.max && Number(rateLimitDef.max);
              const window = rateLimitDef.window;
              const identifier = identifyFn(context);

              return mapMaybePromise(
                rateLimiterFn(
                  {
                    parent: root,
                    args: fieldIdentity ? { ...args, identifier } : args,
                    context,
                    info,
                  },
                  {
                    max,
                    window,
                    identityArgs: fieldIdentity
                      ? ['identifier', ...(rateLimitDef.identityArgs || [])]
                      : rateLimitDef.identityArgs,
                    arrayLengthField: rateLimitDef.arrayLengthField,
                    uncountRejected: rateLimitDef.uncountRejected,
                    readOnly: rateLimitDef.readOnly,
                    message:
                      message && identifier
                        ? interpolateMessage(message, identifier, {
                            root,
                            args,
                            context,
                            info,
                          })
                        : undefined,
                  },
                ),
                errorMessage => {
                  if (errorMessage) {
                    if (options.onRateLimitError) {
                      options.onRateLimitError({
                        error: errorMessage,
                        identifier,
                        context,
                        info,
                      });
                    }

                    if (options.transformError) {
                      throw options.transformError(errorMessage);
                    }

                    throw createGraphQLError(errorMessage, {
                      extensions: {
                        http: {
                          statusCode: 429,
                          headers: {
                            'Retry-After': window,
                          },
                        },
                      },
                      path: responsePathAsArray(info.path),
                      nodes: info.fieldNodes,
                    });
                  }
                },
              );
            }
          }
        }),
      );
    },
    onContextBuilding({ extendContext }) {
      extendContext({
        rateLimiterFn,
      });
    },
  };
};

function interpolateByArgs(message: string, args: { [key: string]: string }) {
  return message.replace(/\{{([^)]*)\}}/g, (_, key) => args[key.trim()]);
}
