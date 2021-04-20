import { DefaultContext, Plugin } from '@envelop/types';
import { IntValueNode, StringValueNode } from 'graphql';
import { getDirective } from './utils';
import { getGraphQLRateLimiter } from 'graphql-rate-limit';
export * from './utils';

export class UnauthenticatedError extends Error {}

export type IdentifyFn<ContextType = unknown> = (context: ContextType) => string;

export const DIRECTIVE_SDL = /* GraphQL */ `
  directive @rateLimit(max: Int, window: String, message: String) on FIELD_DEFINITION
`;

export type RateLimiterPluginOptions = {
  identifyFn: IdentifyFn;
  rateLimitDirectiveName?: 'rateLimit' | string;
};

export const useRateLimiter = (
  options: RateLimiterPluginOptions
): Plugin<{
  rateLimiterFn: ReturnType<typeof getGraphQLRateLimiter>;
}> => {
  const rateLimiterFn = getGraphQLRateLimiter({ identifyContext: options.identifyFn });

  return {
    async onContextBuilding({ context, extendContext }) {
      extendContext({
        rateLimiterFn,
      });
    },
    onExecute() {
      return {
        async onResolverCalled({ args, root, context, info }) {
          const rateLimitDirectiveNode = getDirective(info, options.rateLimitDirectiveName || 'rateLimit');

          if (rateLimitDirectiveNode) {
            const maxNode = rateLimitDirectiveNode.arguments.find(arg => arg.name.value === 'max').value as IntValueNode;
            const max = parseInt(maxNode.value);
            const windowNode = rateLimitDirectiveNode.arguments.find(arg => arg.name.value === 'window').value as StringValueNode;
            const window = windowNode.value;
            const messageNode = rateLimitDirectiveNode.arguments.find(arg => arg.name.value === 'message').value as IntValueNode;
            const message = messageNode.value;

            const errorMessage = await context.rateLimiterFn({ parent: root, args, context, info }, { max, window, message });
            if (errorMessage) throw new Error(errorMessage);
          }
        },
      };
    },
  };
};
