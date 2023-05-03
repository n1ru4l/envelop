import {
  defaultFieldResolver,
  GraphQLResolveInfo,
  GraphQLSchema,
  isIntrospectionType,
  isObjectType,
} from 'graphql';
import { Plugin, PromiseOrValue } from '@envelop/core';

export type Resolver<Context = unknown> = (
  root: unknown,
  args: Record<string, unknown>,
  context: Context,
  info: GraphQLResolveInfo,
) => PromiseOrValue<unknown>;

export type AfterResolver = (options: {
  result: unknown;
  setResult: (newResult: unknown) => void;
}) => PromiseOrValue<void>;

export interface OnResolveOptions<PluginContext extends Record<string, any> = {}> {
  context: PluginContext;
  root: unknown;
  args: Record<string, unknown>;
  info: GraphQLResolveInfo;
  resolver: Resolver<PluginContext>;
  replaceResolver: (newResolver: Resolver<PluginContext>) => void;
}

export type OnResolve<PluginContext extends Record<string, any> = {}> = (
  options: OnResolveOptions<PluginContext>,
) => PromiseOrValue<AfterResolver | void>;

/**
 * Wraps the provided schema by hooking into the resolvers of every field.
 *
 * Use the `onResolve` argument to manipulate the resolver and its results/errors.
 */
export function useOnResolve<PluginContext extends Record<string, any> = {}>(
  onResolve: OnResolve<PluginContext>,
): Plugin<PluginContext> {
  return {
    onSchemaChange({ schema: _schema }) {
      const schema = _schema as GraphQLSchema;
      if (!schema) return; // nothing to do if schema is missing

      for (const type of Object.values(schema.getTypeMap())) {
        if (!isIntrospectionType(type) && isObjectType(type)) {
          for (const field of Object.values(type.getFields())) {
            let resolver = (field.resolve || defaultFieldResolver) as Resolver<PluginContext>;

            field.resolve = async (root, args, context, info) => {
              const afterResolve = await onResolve({
                root,
                args,
                context,
                info,
                resolver,
                replaceResolver: newResolver => {
                  resolver = newResolver;
                },
              });

              let result;
              try {
                result = await resolver(root, args, context, info);
              } catch (err) {
                result = err as Error;
              }

              if (typeof afterResolve === 'function') {
                await afterResolve({
                  result,
                  setResult: newResult => {
                    result = newResult;
                  },
                });
              }

              if (result instanceof Error) {
                throw result;
              }
              return result;
            };
          }
        }
      }
    },
  };
}
