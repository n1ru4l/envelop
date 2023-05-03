import { GraphQLResolveInfo, IntValueNode, StringValueNode } from 'graphql';
import { getGraphQLRateLimiter } from 'graphql-rate-limit';
import { Plugin } from '@envelop/core';
import { useOnResolve } from '@envelop/on-resolve';
import { getDirective } from './utils.js';

export * from './utils.js';

export class UnauthenticatedError extends Error {}

export type IdentifyFn<ContextType = unknown> = (context: ContextType) => string;

export const DIRECTIVE_SDL = /* GraphQL */ `
  directive @rateLimit(max: Int, window: String, message: String) on FIELD_DEFINITION
`;

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
};

interface RateLimiterContext {
  rateLimiterFn: ReturnType<typeof getGraphQLRateLimiter>;
}

export const useRateLimiter = (options: RateLimiterPluginOptions): Plugin<RateLimiterContext> => {
  const rateLimiterFn = getGraphQLRateLimiter({ identifyContext: options.identifyFn });

  return {
    onPluginInit({ addPlugin }) {
      addPlugin(
        useOnResolve(async ({ args, root, context, info }) => {
          const rateLimitDirectiveNode = getDirective(
            info,
            options.rateLimitDirectiveName || 'rateLimit',
          );

          if (rateLimitDirectiveNode && rateLimitDirectiveNode.arguments) {
            const maxNode = rateLimitDirectiveNode.arguments.find(arg => arg.name.value === 'max')
              ?.value as IntValueNode;
            const windowNode = rateLimitDirectiveNode.arguments.find(
              arg => arg.name.value === 'window',
            )?.value as StringValueNode;
            const messageNode = rateLimitDirectiveNode.arguments.find(
              arg => arg.name.value === 'message',
            )?.value as IntValueNode;

            const message = messageNode.value;
            const max = parseInt(maxNode.value);
            const window = windowNode.value;
            const id = options.identifyFn(context);

            const errorMessage = await context.rateLimiterFn(
              { parent: root, args, context, info },
              {
                max,
                window,
                message: interpolate(message, {
                  id,
                }),
              },
            );
            if (errorMessage) {
              if (options.onRateLimitError) {
                options.onRateLimitError({
                  error: errorMessage,
                  identifier: id,
                  context,
                  info,
                });
              }

              if (options.transformError) {
                throw options.transformError(errorMessage);
              }

              throw new Error(errorMessage);
            }
          }
        }),
      );
    },
    async onContextBuilding({ extendContext }) {
      extendContext({
        rateLimiterFn,
      });
    },
  };
};

function interpolate(message: string, args: { [key: string]: string }) {
  return message.replace(/\{{([^)]*)\}}/g, (_, key) => args[key.trim()]);
}
