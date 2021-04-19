import { DefaultContext, Plugin } from '@envelop/types';
import { IntValueNode, StringValueNode } from 'graphql';
import { getDirective } from './utils';
export * from './utils';
// eslint-disable-next-line import/first
import { getGraphQLRateLimiter } from 'graphql-rate-limit';

export class UnauthenticatedError extends Error {}

export type IdentifyFn<ContextType = unknown> = (context: ContextType) => string;

export const DIRECTIVE_SDL = /* GraphQL */ `
  directive @rateLimit(
          max: Int,
          window: String,
          message: String
        ) on FIELD_DEFINITION
`;

export type RateLimiterPluginOptions<ResType, ContextType> = {
  identifyFn: IdentifyFn
  rateLimitDirectiveName?: 'rateLimit' | string;
};

export const useRateLimiter = <ResType, ContextType extends DefaultContext = DefaultContext>(
  options: RateLimiterPluginOptions<ResType, ContextType>
): Plugin<ContextType> => {
  return {
    async onContextBuilding({ context, extendContext }) {
      const rateLimiter = getGraphQLRateLimiter({ identifyContext: options.identifyFn});

      extendContext(({
        rateLimiter,
      } as unknown) as ContextType);
    },
    onExecute() {
      return {
        async onResolverCalled({ args, root, context, info }) {
          const rateLimitDirectiveNode = getDirective(info, options.rateLimitDirectiveName || 'rateLimit');

          if (rateLimitDirectiveNode) {
            const maxNode = rateLimitDirectiveNode.arguments.find(arg => arg.name.value === 'max').value as IntValueNode;
            const max = maxNode.value;
            const windowNode = rateLimitDirectiveNode.arguments.find(arg => arg.name.value === 'window').value as StringValueNode;
            const window = windowNode.value;
            const messageNode = rateLimitDirectiveNode.arguments.find(arg => arg.name.value === 'message').value as IntValueNode;
            const message = messageNode.value;

            const errorMessage = await (context as { rateLimiter: any }).rateLimiter(
              { parent, args, context, info }, { max, window, message }
            );
            if (errorMessage) throw new Error(errorMessage);
          }
        },
      };
    },
  };
};
