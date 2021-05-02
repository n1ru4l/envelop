import {
  defaultFieldResolver,
  DocumentNode,
  execute,
  subscribe,
  ExecutionArgs,
  GraphQLError,
  GraphQLFieldResolver,
  GraphQLSchema,
  GraphQLTypeResolver,
  isIntrospectionType,
  isObjectType,
  parse,
  validate,
  specifiedRules,
  ValidationRule,
  ExecutionResult,
  SubscriptionArgs,
} from 'graphql';
import { AfterCallback, AfterResolverPayload, DefaultContext, Envelop, OnResolverCalledHooks, Plugin } from '@envelop/types';
import { Maybe } from 'graphql/jsutils/Maybe';

const trackedSchemaSymbol = Symbol('TRACKED_SCHEMA');
const resolversHooksSymbol = Symbol('RESOLVERS_HOOKS');

export function envelop(options: { plugins: Plugin[]; extends?: Envelop[]; initialSchema?: GraphQLSchema }): Envelop {
  let schema: GraphQLSchema | undefined | null = options.initialSchema;
  let initDone = false;
  const childPlugins = (options.extends || []).reduce((prev, child) => [...prev, ...child._plugins], []);
  const plugins: Plugin[] = [...childPlugins, ...options.plugins];

  const replaceSchema = (newSchema: GraphQLSchema, ignorePluginIndex = -1) => {
    schema = newSchema;

    if (initDone) {
      for (const [i, plugin] of plugins.entries()) {
        if (i !== ignorePluginIndex) {
          plugin.onSchemaChange &&
            plugin.onSchemaChange({
              schema,
              replaceSchema: schemaToSet => {
                replaceSchema(schemaToSet, i);
              },
            });
        }
      }
    }
  };

  for (const [i, plugin] of plugins.entries()) {
    plugin.onPluginInit &&
      plugin.onPluginInit({
        setSchema: modifiedSchema => replaceSchema(modifiedSchema, i),
      });
  }

  const customParse: typeof parse = (source, parseOptions) => {
    let result: DocumentNode | Error = null;
    let parseFn: typeof parse = parse;

    const afterCalls: AfterCallback<'onParse'>[] = [];
    for (const plugin of plugins) {
      const afterFn =
        plugin.onParse &&
        plugin.onParse({
          params: { source, options: parseOptions },
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
        result = parseFn(source, parseOptions);
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

  const customValidate: typeof validate = (schema, documentAST, rules, typeInfo, validationOptions) => {
    let actualRules: undefined | ValidationRule[] = rules ? [...rules] : undefined;
    let validateFn = validate;
    let result: readonly GraphQLError[] = null;

    const afterCalls: AfterCallback<'onValidate'>[] = [];
    for (const plugin of plugins) {
      const afterFn =
        plugin.onValidate &&
        plugin.onValidate({
          params: {
            schema,
            documentAST,
            rules: actualRules,
            typeInfo,
            options: validationOptions,
          },
          validateFn,
          addValidationRule: rule => {
            if (!actualRules) {
              actualRules = [...specifiedRules];
            }

            actualRules.push(rule);
          },
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
      result = validateFn(schema, documentAST, actualRules, typeInfo, validationOptions);
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

    for (const plugin of plugins) {
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
              throw new Error(
                `Invalid context extension provided! Expected "object", got: "${JSON.stringify(extension)}" (${typeof extension})`
              );
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

  const beforeExecuteCalls = plugins.filter(p => p.onExecute);
  const beforeSubscribeCalls = plugins.filter(p => p.onSubscribe);

  const customSubscribe = async (
    argsOrSchema: SubscriptionArgs | GraphQLSchema,
    document?: DocumentNode,
    rootValue?: any,
    contextValue?: any,
    variableValues?: Maybe<{ [key: string]: any }>,
    operationName?: Maybe<string>,
    fieldResolver?: Maybe<GraphQLFieldResolver<any, any>>,
    subscribeFieldResolver?: Maybe<GraphQLFieldResolver<any, any>>
  ) => {
    const args: SubscriptionArgs =
      argsOrSchema instanceof GraphQLSchema
        ? {
            schema: argsOrSchema,
            document,
            rootValue,
            contextValue,
            variableValues,
            operationName,
            fieldResolver,
            subscribeFieldResolver,
          }
        : argsOrSchema;

    const onResolversHandlers: OnResolverCalledHooks[] = [];
    let subscribeFn: typeof subscribe = subscribe;

    const afterCalls: ((options: {
      result: AsyncIterableIterator<ExecutionResult> | ExecutionResult;
      setResult: (newResult: AsyncIterableIterator<ExecutionResult> | ExecutionResult) => void;
    }) => void)[] = [];
    let context = args.contextValue;

    for (const plugin of beforeSubscribeCalls) {
      const after = plugin.onSubscribe({
        subscribeFn,
        setSubscribeFn: newSubscribeFn => {
          subscribeFn = newSubscribeFn;
        },
        extendContext: extension => {
          if (typeof extension === 'object') {
            context = {
              ...(context || {}),
              ...extension,
            };
          } else {
            throw new Error(
              `Invalid context extension provided! Expected "object", got: "${JSON.stringify(extension)}" (${typeof extension})`
            );
          }
        },
        args,
      });

      if (after) {
        if (after.onSubscribeResult) {
          afterCalls.push(after.onSubscribeResult);
        }
        if (after.onResolverCalled) {
          onResolversHandlers.push(after.onResolverCalled);
        }
      }
    }

    if (onResolversHandlers.length) {
      context[resolversHooksSymbol] = onResolversHandlers;
    }

    let result = await subscribeFn({
      ...args,
      contextValue: context,
    });

    for (const afterCb of afterCalls) {
      afterCb({
        result,
        setResult: newResult => {
          result = newResult;
        },
      });
    }

    return result;
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
    let result: ExecutionResult;

    const afterCalls: ((options: { result: ExecutionResult; setResult: (newResult: ExecutionResult) => void }) => void)[] = [];
    let context = args.contextValue;

    for (const plugin of beforeExecuteCalls) {
      let stopCalled = false;

      const after = plugin.onExecute({
        executeFn,
        setExecuteFn: newExecuteFn => {
          executeFn = newExecuteFn;
        },
        setResultAndStopExecution: stopResult => {
          stopCalled = true;
          result = stopResult;
        },
        extendContext: extension => {
          if (typeof extension === 'object') {
            context = {
              ...(context || {}),
              ...extension,
            };
          } else {
            throw new Error(
              `Invalid context extension provided! Expected "object", got: "${JSON.stringify(extension)}" (${typeof extension})`
            );
          }
        },
        args,
      });

      if (stopCalled) {
        return result;
      }

      if (after) {
        if (after.onExecuteDone) {
          afterCalls.push(after.onExecuteDone);
        }
        if (after.onResolverCalled) {
          onResolversHandlers.push(after.onResolverCalled);
        }
      }
    }

    if (onResolversHandlers.length) {
      context[resolversHooksSymbol] = onResolversHandlers;
    }

    result = await executeFn({
      ...args,
      contextValue: context,
    });

    for (const afterCb of afterCalls) {
      afterCb({
        result,
        setResult: newResult => {
          result = newResult;
        },
      });
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
              const afterCalls: Array<(p: AfterResolverPayload) => void> = [];

              for (const hook of hooks) {
                const afterFn = await hook({ root, args, context, info });
                afterFn && afterCalls.push(afterFn);
              }

              try {
                let result = await originalFn(root, args, context, info);

                for (const afterFn of afterCalls) {
                  afterFn({
                    result,
                    setResult: newResult => {
                      result = newResult;
                    },
                  });
                }

                return result;
              } catch (e) {
                let resultErr = e;

                for (const afterFn of afterCalls) {
                  afterFn({
                    result: resultErr,
                    setResult: newResult => {
                      resultErr = newResult;
                    },
                  });
                }

                throw resultErr;
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

  // This is done in order to trigger the first schema available, to allow plugins that needs the schema
  // eagerly to have it.
  if (schema) {
    for (const [i, plugin] of plugins.entries()) {
      plugin.onSchemaChange &&
        plugin.onSchemaChange({
          schema,
          replaceSchema: modifiedSchema => replaceSchema(modifiedSchema, i),
        });
    }
  }

  const envelop = () => {
    prepareSchema();

    return {
      parse: customParse,
      validate: customValidate,
      contextFactory: customContextFactory,
      execute: customExecute,
      subscribe: customSubscribe,
      get schema() {
        return schema;
      },
    };
  };

  envelop._plugins = plugins;

  return envelop;
}
