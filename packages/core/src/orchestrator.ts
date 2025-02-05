import {
  AfterContextBuildingHook,
  AfterParseHook,
  AfterValidateHook,
  ArbitraryObject,
  AsyncIterableIteratorOrValue,
  DefaultContext,
  EnvelopContextFnWrapper,
  ExecuteFunction,
  ExecutionResult,
  GetEnvelopedFn,
  Maybe,
  OnContextBuildingHook,
  OnContextErrorHandler,
  OnEnvelopedHook,
  OnExecuteDoneHook,
  OnExecuteDoneHookResultOnEndHook,
  OnExecuteDoneHookResultOnNextHook,
  OnExecuteHook,
  OnParseHook,
  OnSubscribeHook,
  OnSubscribeResultResultOnEndHook,
  OnSubscribeResultResultOnNextHook,
  OnValidateHook,
  ParseFunction,
  Plugin,
  SubscribeErrorHook,
  SubscribeFunction,
  SubscribeResultHook,
  TypedExecutionArgs,
  TypedSubscriptionArgs,
  ValidateFunction,
  type EnvelopData,
} from '@envelop/types';
import { documentStringMap } from './document-string-map.js';
import {
  errorAsyncIterator,
  finalAsyncIterator,
  isAsyncIterable,
  makeExecute,
  makeSubscribe,
  mapAsyncIterator,
} from './utils.js';

export type EnvelopOrchestrator<
  InitialContext extends ArbitraryObject = ArbitraryObject,
  PluginsContext extends ArbitraryObject = ArbitraryObject,
  Data extends EnvelopData = EnvelopData,
> = {
  init: (initialContext?: Maybe<InitialContext>) => void;
  parse: EnvelopContextFnWrapper<
    ReturnType<GetEnvelopedFn<PluginsContext>>['parse'],
    InitialContext
  >;
  validate: EnvelopContextFnWrapper<
    ReturnType<GetEnvelopedFn<PluginsContext>>['validate'],
    InitialContext
  >;
  execute: ReturnType<GetEnvelopedFn<PluginsContext>>['execute'];
  subscribe: ReturnType<GetEnvelopedFn<PluginsContext>>['subscribe'];
  contextFactory: EnvelopContextFnWrapper<
    ReturnType<GetEnvelopedFn<PluginsContext>>['contextFactory'],
    PluginsContext
  >;
  getCurrentSchema: () => Maybe<any>;
  data: Map<Plugin, Data>;
};

type EnvelopOrchestratorOptions<Data extends EnvelopData = EnvelopData> = {
  plugins: Plugin[];
  data?: Map<Plugin, Data>;
};

function throwEngineFunctionError(name: string) {
  throw Error(`No \`${name}\` function found! Register it using "useEngine" plugin.`);
}

export function createEnvelopOrchestrator<
  PluginsContext extends DefaultContext,
  Data extends EnvelopData = EnvelopData,
>({
  plugins,
  data: externalData,
}: EnvelopOrchestratorOptions<Data>): EnvelopOrchestrator<any, PluginsContext> {
  let schema: any | undefined | null = null;
  let initDone = false;

  const parse: ParseFunction = () => throwEngineFunctionError('parse');
  const validate: ValidateFunction = () => throwEngineFunctionError('validate');
  const execute: ExecuteFunction = () => throwEngineFunctionError('execute');
  const subscribe: SubscribeFunction = () => throwEngineFunctionError('subscribe');

  // Define the initial method for replacing the GraphQL schema, this is needed in order
  // to allow setting the schema from the onPluginInit callback. We also need to make sure
  // here not to call the same plugin that initiated the schema switch.
  const replaceSchema = (newSchema: any, ignorePluginIndex = -1) => {
    if (schema === newSchema) {
      return;
    }
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

  const contextErrorHandlers: Array<[OnContextErrorHandler, Plugin]> = [];

  // Iterate all plugins and trigger onPluginInit
  for (let i = 0; i < plugins.length; i++) {
    const plugin = plugins[i];
    const pluginsToAdd: Plugin[] = [];
    plugin.onPluginInit &&
      plugin.onPluginInit({
        plugins,
        addPlugin: newPlugin => {
          pluginsToAdd.push(newPlugin);
        },
        setSchema: modifiedSchema => replaceSchema(modifiedSchema, i),
        registerContextErrorHandler: handler => contextErrorHandlers.push([handler, plugin]),
      });
    pluginsToAdd.length && plugins.splice(i + 1, 0, ...pluginsToAdd);
  }

  // A set of before callbacks defined here in order to allow it to be used later
  const beforeCallbacks = {
    init: [] as [OnEnvelopedHook<any>, Data][],
    parse: [] as [OnParseHook<any>, Data][],
    validate: [] as [OnValidateHook<any>, Data][],
    subscribe: [] as [OnSubscribeHook<any>, Data][],
    execute: [] as [OnExecuteHook<any>, Data][],
    context: [] as [OnContextBuildingHook<any>, Data][],
  };

  const envelopData = new Map<Plugin, Data>();
  for (const plugin of plugins) {
    // Prepare the plugin data for this operation. It should inherit existing data if it exists.
    const externalPluginData = externalData?.get(plugin);
    const pluginData = { ...externalPluginData, forOperation: {} } as Data;
    envelopData.set(plugin, pluginData);

    const { onContextBuilding, onEnveloped, onExecute, onParse, onSubscribe, onValidate } = plugin;
    onEnveloped && beforeCallbacks.init.push([onEnveloped, pluginData]);
    onContextBuilding && beforeCallbacks.context.push([onContextBuilding, pluginData]);
    onExecute && beforeCallbacks.execute.push([onExecute, pluginData]);
    onParse && beforeCallbacks.parse.push([onParse, pluginData]);
    onSubscribe && beforeCallbacks.subscribe.push([onSubscribe, pluginData]);
    onValidate && beforeCallbacks.validate.push([onValidate, pluginData]);
  }

  const init: EnvelopOrchestrator['init'] = initialContext => {
    for (const [i, [onEnveloped, data]] of beforeCallbacks.init.entries()) {
      onEnveloped({
        context: initialContext,
        extendContext: extension => {
          if (!initialContext) {
            return;
          }

          Object.assign(initialContext, extension);
        },
        setSchema: modifiedSchema => replaceSchema(modifiedSchema, i),
        data,
      });
    }
  };

  const customParse: EnvelopContextFnWrapper<typeof parse, any> = beforeCallbacks.parse.length
    ? initialContext => (source, parseOptions) => {
        let result: any | Error | null = null;
        let parseFn: typeof parse = parse;
        const context = initialContext;
        const afterCalls: [AfterParseHook<any>, Data][] = [];

        for (const [onParse, data] of beforeCallbacks.parse) {
          const afterFn = onParse({
            context,
            extendContext: extension => {
              Object.assign(context, extension);
            },
            params: { source, options: parseOptions },
            parseFn,
            setParseFn: newFn => {
              parseFn = newFn;
            },
            setParsedDocument: newDoc => {
              result = newDoc;
            },
            data,
          });

          afterFn && afterCalls.push([afterFn, data]);
        }

        if (result === null) {
          try {
            result = parseFn(source, parseOptions);
          } catch (e) {
            result = e as Error;
          }
        }

        for (const [afterCb, data] of afterCalls) {
          afterCb({
            context,
            extendContext: extension => {
              Object.assign(context, extension);
            },
            replaceParseResult: newResult => {
              result = newResult;
            },
            result,
            data,
          });
        }

        if (result === null) {
          throw new Error(`Failed to parse document.`);
        }

        if (result instanceof Error) {
          throw result;
        }

        documentStringMap.set(result, source.toString());

        return result;
      }
    : () => parse;

  const customValidate: EnvelopContextFnWrapper<typeof validate, any> = beforeCallbacks.validate
    .length
    ? initialContext => (schema, documentAST, rules, typeInfo, validationOptions) => {
        let actualRules: undefined | any[] = rules ? [...rules] : undefined;
        let validateFn = validate;
        let result: null | readonly any[] = null;
        const context = initialContext;

        const afterCalls: [AfterValidateHook<any>, Data][] = [];

        for (const [onValidate, data] of beforeCallbacks.validate) {
          const afterFn = onValidate({
            data,
            context,
            extendContext: extension => {
              Object.assign(context, extension);
            },
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
                actualRules = [];
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

          afterFn && afterCalls.push([afterFn, data]);
        }

        if (!result) {
          result = validateFn(schema, documentAST, actualRules, typeInfo, validationOptions);
        }

        if (!result) {
          return;
        }

        const valid = result.length === 0;

        for (const [afterCb, data] of afterCalls) {
          afterCb({
            data,
            valid,
            result,
            context,
            extendContext: extension => {
              Object.assign(context, extension);
            },
            setResult: newResult => {
              result = newResult;
            },
          });
        }

        return result;
      }
    : () => validate;

  const customContextFactory: EnvelopContextFnWrapper<(orchestratorCtx?: any) => any, any> =
    beforeCallbacks.context.length
      ? initialContext => async orchestratorCtx => {
          const afterCalls: [AfterContextBuildingHook<any>, Data][] = [];

          // In order to have access to the "last working" context object we keep this outside of the try block:
          const context = initialContext;
          if (orchestratorCtx) {
            Object.assign(context, orchestratorCtx);
          }

          try {
            let isBreakingContextBuilding = false;

            for (const [onContext, data] of beforeCallbacks.context) {
              const afterHookResult = await onContext({
                data,
                context,
                extendContext: extension => {
                  Object.assign(context, extension);
                },
                breakContextBuilding: () => {
                  isBreakingContextBuilding = true;
                },
              });

              if (typeof afterHookResult === 'function') {
                afterCalls.push([afterHookResult, data]);
              }

              if ((isBreakingContextBuilding as boolean) === true) {
                break;
              }
            }

            for (const [afterCb, data] of afterCalls) {
              afterCb({
                data,
                context,
                extendContext: extension => {
                  Object.assign(context, extension);
                },
              });
            }

            return context;
          } catch (err) {
            let error: unknown = err;
            for (const [errorCb, plugin] of contextErrorHandlers) {
              errorCb({
                data: envelopData.get(plugin)!,
                context,
                error,
                setError: err => {
                  error = err;
                },
              });
            }
            throw error;
          }
        }
      : initialContext => orchestratorCtx => {
          if (orchestratorCtx) {
            Object.assign(initialContext, orchestratorCtx);
          }
          return initialContext;
        };

  const useCustomSubscribe = beforeCallbacks.subscribe.length;

  const customSubscribe = useCustomSubscribe
    ? makeSubscribe(async args => {
        let subscribeFn = subscribe as SubscribeFunction;

        const afterCalls: [SubscribeResultHook<PluginsContext>, Data][] = [];
        const subscribeErrorHandlers: [SubscribeErrorHook, Data][] = [];

        const context = (args.contextValue as {}) || {};
        let result: AsyncIterableIteratorOrValue<ExecutionResult> | undefined;

        for (const [onSubscribe, data] of beforeCallbacks.subscribe) {
          const after = await onSubscribe({
            data,
            subscribeFn,
            setSubscribeFn: newSubscribeFn => {
              subscribeFn = newSubscribeFn;
            },
            extendContext: extension => {
              Object.assign(context, extension);
            },
            args: args as TypedSubscriptionArgs<PluginsContext>,
            setResultAndStopExecution: stopResult => {
              result = stopResult;
            },
          });

          if (after) {
            if (after.onSubscribeResult) {
              afterCalls.push([after.onSubscribeResult, data]);
            }
            if (after.onSubscribeError) {
              subscribeErrorHandlers.push([after.onSubscribeError, data]);
            }
          }

          if (result !== undefined) {
            break;
          }
        }

        if (result === undefined) {
          result = await subscribeFn({
            ...args,
            contextValue: context,
            // Casted for GraphQL.js 15 compatibility
            // Can be removed once we drop support for GraphQL.js 15
          });
        }
        if (!result) {
          return;
        }

        const onNextHandler: [OnSubscribeResultResultOnNextHook<PluginsContext>, Data][] = [];
        const onEndHandler: [OnSubscribeResultResultOnEndHook, Data][] = [];

        for (const [afterCb, data] of afterCalls) {
          const hookResult = afterCb({
            data,
            args: args as TypedSubscriptionArgs<PluginsContext>,
            result,
            setResult: newResult => {
              result = newResult;
            },
          });
          if (hookResult) {
            if (hookResult.onNext) {
              onNextHandler.push([hookResult.onNext, data]);
            }
            if (hookResult.onEnd) {
              onEndHandler.push([hookResult.onEnd, data]);
            }
          }
        }

        if (onNextHandler.length && isAsyncIterable(result)) {
          result = mapAsyncIterator(result, async result => {
            for (const [onNext, data] of onNextHandler) {
              await onNext({
                data,
                args: args as TypedSubscriptionArgs<PluginsContext>,
                result,
                setResult: newResult => (result = newResult),
              });
            }
            return result;
          });
        }
        if (onEndHandler.length && isAsyncIterable(result)) {
          result = finalAsyncIterator(result, () => {
            for (const [onEnd, data] of onEndHandler) {
              onEnd({ data });
            }
          });
        }

        if (subscribeErrorHandlers.length && isAsyncIterable(result)) {
          result = errorAsyncIterator(result, err => {
            let error = err;
            for (const [handler, data] of subscribeErrorHandlers) {
              handler({
                data,
                error,
                setError: err => {
                  error = err;
                },
              });
            }
            throw error;
          });
        }

        return result as AsyncIterableIterator<ExecutionResult>;
      })
    : makeSubscribe(subscribe as any);

  const useCustomExecute = beforeCallbacks.execute.length;

  const customExecute = useCustomExecute
    ? makeExecute(async args => {
        let executeFn = execute as ExecuteFunction;
        let result: AsyncIterableIteratorOrValue<ExecutionResult> | undefined;

        const afterCalls: [OnExecuteDoneHook<PluginsContext>, Data][] = [];
        const context = (args.contextValue as {}) || {};

        for (const [onExecute, data] of beforeCallbacks.execute) {
          const after = await onExecute({
            data,
            executeFn,
            setExecuteFn: newExecuteFn => {
              executeFn = newExecuteFn;
            },
            setResultAndStopExecution: stopResult => {
              result = stopResult;
            },
            extendContext: extension => {
              if (typeof extension === 'object') {
                Object.assign(context, extension);
              } else {
                throw new Error(
                  `Invalid context extension provided! Expected "object", got: "${JSON.stringify(
                    extension,
                  )}" (${typeof extension})`,
                );
              }
            },
            args: args as TypedExecutionArgs<PluginsContext>,
          });

          if (after?.onExecuteDone) {
            afterCalls.push([after.onExecuteDone, data]);
          }

          if (result !== undefined) {
            break;
          }
        }

        if (result === undefined) {
          result = (await executeFn({
            ...args,
            contextValue: context,
          })) as AsyncIterableIteratorOrValue<ExecutionResult>;
        }

        const onNextHandler: [OnExecuteDoneHookResultOnNextHook<PluginsContext>, Data][] = [];
        const onEndHandler: [OnExecuteDoneHookResultOnEndHook, Data][] = [];

        for (const [afterCb, data] of afterCalls) {
          const hookResult = await afterCb({
            data,
            args: args as TypedExecutionArgs<PluginsContext>,
            result,
            setResult: newResult => {
              result = newResult;
            },
          });
          if (hookResult) {
            if (hookResult.onNext) {
              onNextHandler.push([hookResult.onNext, data]);
            }
            if (hookResult.onEnd) {
              onEndHandler.push([hookResult.onEnd, data]);
            }
          }
        }

        if (onNextHandler.length && isAsyncIterable(result)) {
          result = mapAsyncIterator(result, async result => {
            for (const [onNext, data] of onNextHandler) {
              await onNext({
                data,
                args: args as TypedExecutionArgs<PluginsContext>,
                result,
                setResult: newResult => {
                  result = newResult;
                },
              });
            }
            return result;
          });
        }
        if (onEndHandler.length && isAsyncIterable(result)) {
          result = finalAsyncIterator(result, () => {
            for (const [onEnd, data] of onEndHandler) {
              onEnd({ data });
            }
          });
        }

        return result;
      })
    : makeExecute(execute);

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

  return {
    getCurrentSchema() {
      return schema;
    },
    init,
    parse: customParse,
    validate: customValidate,
    execute: customExecute as ExecuteFunction,
    subscribe: customSubscribe,
    contextFactory: customContextFactory,
    data: envelopData,
  };
}
