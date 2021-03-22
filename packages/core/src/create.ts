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
  specifiedRules,
  ValidationRule,
  ExecutionResult,
} from 'graphql';
import { AfterCallback, Envelop, OnResolverCalledHooks, Plugin } from '@envelop/types';
import { Maybe } from 'graphql/jsutils/Maybe';

const trackedSchemaSymbol = Symbol('TRACKED_SCHEMA');
const resolversHooksSymbol = Symbol('RESOLVERS_HOOKS');

export function envelop(serverOptions: { plugins: Plugin[]; initialSchema?: GraphQLSchema }): Envelop {
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
    let actualRules: undefined | ValidationRule[] = rules ? [...rules] : undefined;
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
            rules: actualRules,
            typeInfo,
            options,
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
      result = validateFn(schema, documentAST, actualRules, typeInfo, options);
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

  const beforeExecuteCalls = serverOptions.plugins.filter(p => p.onExecute);

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

    const afterCalls: ((options: { result: ExecutionResult; setResult: (newResult: ExecutionResult) => void }) => void)[] = [];
    let context = args.contextValue;

    for (const plugin of beforeExecuteCalls) {
      const after = plugin.onExecute({
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
      });

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

    let result = await executeFn({
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

  return () => {
    prepareSchema();

    return {
      parse: customParse,
      validate: customValidate,
      contextFactory: customContextFactory,
      execute: customExecute,
      get schema() {
        return schema;
      },
    };
  };
}
