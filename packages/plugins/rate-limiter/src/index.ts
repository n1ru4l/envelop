import { Plugin } from '@envelop/types';
import {
  getOperationAST,
  IntValueNode,
  StringValueNode,
  TypeInfo,
  visitWithTypeInfo,
  visit,
  GraphQLResolveInfo,
  GraphQLError,
  ExecutionArgs,
} from 'graphql';
import { getDirective } from './utils';
import { getGraphQLRateLimiter } from 'graphql-rate-limit';
export * from './utils';

export class UnauthenticatedError extends Error { }

export type IdentifyFn<ContextType = unknown> = (context: ContextType) => string;

export const DIRECTIVE_SDL = /* GraphQL */ `
  directive @rateLimit(max: Int, window: String, message: String) on FIELD_DEFINITION
`;

export type RateLimiterPluginOptions = {
  identifyFn: IdentifyFn;
  rateLimitDirectiveName?: 'rateLimit' | string;
  onRateLimitError?: (event: { error: string; identifier: string; executionArgs: ExecutionArgs }) => void;
};

export const useRateLimiter = (
  options: RateLimiterPluginOptions
): Plugin<{
  rateLimiterFn: ReturnType<typeof getGraphQLRateLimiter>;
}> => {
  const rateLimiterFn = getGraphQLRateLimiter({ identifyContext: options.identifyFn });

  return {
    async onExecute({
      args: executionArgs,
      setResultAndStopExecution,
    }) {
      const { schema, document, operationName, rootValue, contextValue, variableValues } = executionArgs;
      const typeInfo = new TypeInfo(schema);
      const operationAst = getOperationAST(document, operationName);
      if (!operationAst) {
        throw new Error('No operation found');
      }
      const directiveName = options.rateLimitDirectiveName || 'rateLimit';
      let rateLimiterCalls: Promise<{
        path: string[];
        errorMessage?: string;
      }>[] = [];
      visit(
        operationAst,
        visitWithTypeInfo(typeInfo, {
          Field: () => {
            const field = typeInfo.getFieldDef();
            const rateLimitDirectiveNode = field.astNode?.directives?.find(d => d.name.value === directiveName);
            if (rateLimitDirectiveNode && rateLimitDirectiveNode.arguments) {
              const maxNode = rateLimitDirectiveNode.arguments.find(arg => arg.name.value === 'max')?.value as IntValueNode;
              const windowNode = rateLimitDirectiveNode.arguments.find(arg => arg.name.value === 'window')?.value as StringValueNode;
              const messageNode = rateLimitDirectiveNode.arguments.find(arg => arg.name.value === 'message')?.value as IntValueNode;

              const message = messageNode.value;
              const max = parseInt(maxNode.value);
              const window = windowNode.value;
              const id = options.identifyFn(contextValue);

              // TODO: Identify path in a better way
              const path = [field.name];

              rateLimiterCalls.push(
                rateLimiterFn(
                  { parent: rootValue, args: variableValues || {}, context: contextValue, info: {} as GraphQLResolveInfo },
                  {
                    max,
                    window,
                    message: interpolate(message, {
                      id,
                    }),
                    identityArgs: path,
                  }
                ).then(errorMessage => {
                  if (errorMessage) {
                    if (options.onRateLimitError) {
                      options.onRateLimitError({
                        error: errorMessage,
                        identifier: id,
                        executionArgs
                      });
                    }
                  }

                  return {
                    errorMessage,
                    path,
                  }
                })
              )
            }
          },
        })
      );
      const errors: GraphQLError[] = [];
      const results = await Promise.all(rateLimiterCalls);
      for (const result of results) {
        if (result.errorMessage) {
          errors.push(new GraphQLError(result.errorMessage, undefined, undefined, undefined, result.path));
        }
      }
      if (errors.length > 0) {
        setResultAndStopExecution({
          errors,
        });
      }
    },
  };
};

function interpolate(message: string, args: { [key: string]: string }) {
  return message.replace(/\{{([^)]*)\}}/g, (_, key) => args[key.trim()]);
}
