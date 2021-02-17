import {
  defaultFieldResolver,
  DocumentNode,
  execute,
  ExecutionArgs,
  GraphQLError,
  GraphQLFieldResolver,
  GraphQLSchema,
  GraphQLTypeResolver,
  isIntrospectionType,
  isObjectType,
  parse,
  validate,
} from 'graphql';
import { AfterCallback, GraphQLServerOptions, OnResolverCalledHooks, Plugin } from '@envelop/types';
import { Maybe } from 'graphql/jsutils/Maybe';

const trackedSchemaSymbol = Symbol('TRACKED_SCHEMA');
const resolversHooksSymbol = Symbol('RESOLVERS_HOOKS');

export function envelop(serverOptions: { plugins: Plugin[]; initialSchema?: GraphQLSchema }): GraphQLServerOptions {
  let schema: GraphQLSchema | undefined | null = serverOptions.initialSchema;
  let initDone = false;

  const replaceSchema = (newSchema: GraphQLSchema) => {
    schema = newSchema;

    if (initDone) {
      for (const plugin of serverOptions.plugins) {
        plugin.onSchemaChange && plugin.onSchemaChange({ schema });
      }
    }
  };

  for (const plugin of serverOptions.plugins) {
    plugin.onPluginInit &&
      plugin.onPluginInit({
        setSchema: replaceSchema,
      });
  }

  const customParse: typeof parse = (source, options) => {
    let result: DocumentNode | Error = null;
    let parseFn: typeof parse = parse;

    const afterCalls: AfterCallback<'onParse'>[] = [];
    for (const plugin of serverOptions.plugins) {
      const afterFn =
        plugin.onParse &&
        plugin.onParse({
          params: { source, options },
          parseFn,
          setParseFn: newFn => {
            parseFn = newFn;
          },
          setParsedDocument: newDoc => {
            result = newDoc;
          },
        });

      afterFn && afterCalls.push(afterFn);
    }

    if (result === null) {
      try {
        result = parseFn(source, options);
      } catch (e) {
        result = e;
      }
    }

    for (const afterCb of afterCalls) {
      afterCb({
        replaceParseResult: newResult => {
          result = newResult;
        },
        result,
      });
    }

    if (result instanceof Error) {
      throw result;
    }

    return result;
  };

  const customValidate: typeof validate = (schema, documentAST, rules, typeInfo, options) => {
    let validateFn = validate;
    let result: readonly GraphQLError[] = null;

    const afterCalls: AfterCallback<'onValidate'>[] = [];
    for (const plugin of serverOptions.plugins) {
      const afterFn =
        plugin.onValidate &&
        plugin.onValidate({
          params: {
            schema,
            documentAST,
            rules,
            typeInfo,
            options,
          },
          validateFn,
          setValidationFn: newFn => {
            validateFn = newFn;
          },
          setResult: newResults => {
            result = newResults;
          },
        });

      afterFn && afterCalls.push(afterFn);
    }

    if (result === null) {
      result = validateFn(schema, documentAST, rules, typeInfo, options);
    }

    const valid = result.length === 0;

    for (const afterCb of afterCalls) {
      afterCb({ valid, result });
    }

    return result;
  };

  const customContextFactory = async initialContext => {
    let context = initialContext;

    const afterCalls: AfterCallback<'onContextBuilding'>[] = [];

    for (const plugin of serverOptions.plugins) {
      const afterFn =
        plugin.onContextBuilding &&
        (await plugin.onContextBuilding({
          context,
          extendContext: extension => {
            if (typeof extension === 'object') {
              context = {
                ...(context || {}),
                ...extension,
              };
            } else {
              throw new Error(`Invalid context extension provided! Expected "object", got: "${JSON.stringify(extension)}" (${typeof extension})`);
            }
          },
        }));

      afterFn && afterCalls.push(afterFn);
    }

    for (const afterCb of afterCalls) {
      afterCb({ context });
    }

    return context;
  };

  const customExecute = async (
    argsOrSchema: ExecutionArgs | GraphQLSchema,
    document?: DocumentNode,
    rootValue?: any,
    contextValue?: any,
    variableValues?: Maybe<{ [key: string]: any }>,
    operationName?: Maybe<string>,
    fieldResolver?: Maybe<GraphQLFieldResolver<any, any>>,
    typeResolver?: Maybe<GraphQLTypeResolver<any, any>>
  ) => {
    const args: ExecutionArgs =
      argsOrSchema instanceof GraphQLSchema
        ? {
            schema: argsOrSchema,
            document,
            rootValue,
            contextValue,
            variableValues,
            operationName,
            fieldResolver,
            typeResolver,
          }
        : argsOrSchema;

    const onResolversHandlers: OnResolverCalledHooks[] = [];
    let executeFn: typeof execute = execute;

    const afterCalls: ((options: { result: unknown }) => void)[] = [];
    let context = args.contextValue;

    for (const plugin of serverOptions.plugins) {
      const after =
        plugin.onExecute &&
        (await plugin.onExecute({
          executeFn,
          setExecuteFn: newExecuteFn => {
            executeFn = newExecuteFn;
          },
          extendContext: extension => {
            if (typeof extension === 'object') {
              context = {
                ...(context || {}),
                ...extension,
              };
            } else {
              throw new Error(`Invalid context extension provided! Expected "object", got: "${JSON.stringify(extension)}" (${typeof extension})`);
            }
          },
          args,
        }));

      if (after) {
        if (after.onExecuteDone) {
          afterCalls.push(after.onExecuteDone);
        }

        if (after.onResolverCalled) {
          onResolversHandlers.push(after.onResolverCalled);
        }
      }
    }

    if (!context[resolversHooksSymbol] && onResolversHandlers.length > 0) {
      context[resolversHooksSymbol] = onResolversHandlers;
    }

    const result = await executeFn({
      ...args,
      contextValue: context,
    });

    for (const afterCb of afterCalls) {
      afterCb({ result });
    }

    return result;
  };

  function prepareSchema() {
    if (schema[trackedSchemaSymbol]) {
      return;
    }

    schema[trackedSchemaSymbol] = true;

    const entries = Object.values(schema.getTypeMap());

    for (const type of entries) {
      if (!isIntrospectionType(type) && isObjectType(type)) {
        const fields = Object.values(type.getFields());

        for (const field of fields) {
          const originalFn: GraphQLFieldResolver<any, any> = field.resolve || defaultFieldResolver;

          field.resolve = async (root, args, context, info) => {
            if (context && context[resolversHooksSymbol]) {
              const hooks: OnResolverCalledHooks[] = context[resolversHooksSymbol];
              const afterCalls: (({ result }) => void)[] = [];

              for (const hook of hooks) {
                const afterFn = await hook({ root, args, context, info });
                afterFn && afterCalls.push(afterFn);
              }

              try {
                const result = await originalFn(root, args, context, info);

                for (const afterFn of afterCalls) {
                  afterFn({ result });
                }

                return result;
              } catch (e) {
                for (const afterFn of afterCalls) {
                  afterFn({ result: e });
                }

                throw e;
              }
            } else {
              return originalFn(root, args, context, info);
            }
          };
        }
      }
    }
  }

  initDone = true;

  return requestContext => {
    const afterCalls: AfterCallback<'onRequest'>[] = [];

    for (const plugin of serverOptions.plugins) {
      const afterFn = plugin.onRequest && plugin.onRequest({ requestContext });
      afterFn && afterCalls.push(afterFn);
    }

    prepareSchema();

    return {
      dispose: () => {
        for (const afterCb of afterCalls) {
          afterCb({});
        }
      },
      parse: customParse,
      validate: customValidate,
      contextFactory: customContextFactory,
      execute: customExecute,
      schema,
    };
  };
}
