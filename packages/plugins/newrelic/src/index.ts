import { Plugin, OnResolverCalledHook, Path, isAsyncIterable, EnvelopError } from '@envelop/core';
import { print, FieldNode, Kind, OperationDefinitionNode, ExecutionResult } from 'graphql';

enum AttributeName {
  COMPONENT_NAME = 'Envelop_NewRelic_Plugin',
  ANONYMOUS_OPERATION = '<anonymous>',
  EXECUTION_RESULT = 'graphql.execute.result',
  EXECUTION_OPERATION_NAME = 'graphql.execute.operationName',
  EXECUTION_OPERATION_TYPE = 'graphql.execute.operationType',
  EXECUTION_OPERATION_DOCUMENT = 'graphql.execute.document',
  EXECUTION_VARIABLES = 'graphql.execute.variables',
  RESOLVER_FIELD_PATH = 'graphql.resolver.fieldPath',
  RESOLVER_TYPE_NAME = 'graphql.resolver.typeName',
  RESOLVER_RESULT_TYPE = 'graphql.resolver.resultType',
  RESOLVER_RESULT = 'graphql.resolver.result',
  RESOLVER_ARGS = 'graphql.resolver.args',
}

export type UseNewRelicOptions = {
  includeOperationDocument?: boolean;
  includeExecuteVariables?: boolean | RegExp;
  includeRawResult?: boolean;
  trackResolvers?: boolean;
  includeResolverArgs?: boolean | RegExp;
  rootFieldsNaming?: boolean;
  operationNameProperty?: string;
  /**
   * Indicates whether or not to skip Sentry exception reporting for a given error.
   * By default, this plugin skips all `EnvelopError` errors and does not report it to Sentry.
   */
  skipError?: (args: Error) => boolean;
};

interface InternalOptions extends UseNewRelicOptions {
  isExecuteVariablesRegex?: boolean;
  isResolverArgsRegex?: boolean;
}

const DEFAULT_OPTIONS: UseNewRelicOptions = {
  includeOperationDocument: false,
  includeExecuteVariables: false,
  includeRawResult: false,
  trackResolvers: false,
  includeResolverArgs: false,
  rootFieldsNaming: false,
  operationNameProperty: '',
  skipError: defaultSkipError,
};

export function defaultSkipError(error: Error): boolean {
  return error instanceof EnvelopError;
}

export const useNewRelic = (rawOptions?: UseNewRelicOptions): Plugin => {
  const options: InternalOptions = {
    ...DEFAULT_OPTIONS,
    ...(rawOptions || {}),
  };
  options.isExecuteVariablesRegex = options.includeExecuteVariables instanceof RegExp;
  options.isResolverArgsRegex = options.includeResolverArgs instanceof RegExp;
  const instrumentationApi$ = import('newrelic')
    .then(m => m.default || m)
    .then(({ shim }) => {
      shim.agent.metrics.getOrCreateMetric(`Supportability/ExternalModules/${AttributeName.COMPONENT_NAME}`).incrementCallCount();
      return shim;
    });

  const logger$ = instrumentationApi$.then(({ logger }) => {
    const childLogger = logger.child({ component: AttributeName.COMPONENT_NAME });
    childLogger.info(`${AttributeName.COMPONENT_NAME} registered`);
    return childLogger;
  });

  return {
    async onExecute({ args }) {
      const instrumentationApi = await instrumentationApi$;
      const transactionNameState = instrumentationApi.agent.tracer.getTransaction().nameState;
      const spanContext = instrumentationApi.agent.tracer.getSpanContext();
      const delimiter = transactionNameState.delimiter;
      const rootOperation = args.document.definitions.find(
        definitionNode => definitionNode.kind === Kind.OPERATION_DEFINITION
      ) as OperationDefinitionNode;
      const operationType = rootOperation.operation;
      const document = print(args.document);
      const operationName =
        args.document[options.operationNameProperty as string] ||
        args.operationName ||
        rootOperation.name?.value ||
        AttributeName.ANONYMOUS_OPERATION;
      let rootFields: string[] | null = null;

      if (options.rootFieldsNaming) {
        const fieldNodes = rootOperation.selectionSet.selections.filter(
          selectionNode => selectionNode.kind === Kind.FIELD
        ) as FieldNode[];
        rootFields = fieldNodes.map(fieldNode => fieldNode.name.value);
      }

      transactionNameState.setName(
        transactionNameState.prefix,
        transactionNameState.verb,
        delimiter,
        operationType + delimiter + operationName + (rootFields ? delimiter + rootFields.join('&') : '')
      );

      spanContext.addCustomAttribute(AttributeName.EXECUTION_OPERATION_NAME, operationName);
      spanContext.addCustomAttribute(AttributeName.EXECUTION_OPERATION_TYPE, operationType);
      options.includeOperationDocument && spanContext.addCustomAttribute(AttributeName.EXECUTION_OPERATION_DOCUMENT, document);

      if (options.includeExecuteVariables) {
        const rawVariables = args.variableValues || {};
        const executeVariablesToTrack = options.isExecuteVariablesRegex
          ? filterPropertiesByRegex(rawVariables, options.includeExecuteVariables as RegExp)
          : rawVariables;

        spanContext.addCustomAttribute(AttributeName.EXECUTION_VARIABLES, JSON.stringify(executeVariablesToTrack));
      }

      const operationSegment = instrumentationApi.getActiveSegment();

      const onResolverCalled: OnResolverCalledHook | undefined = options.trackResolvers
        ? async ({ args: resolversArgs, info }) => {
            const logger = await logger$;
            const { returnType, path, parentType } = info;
            const formattedPath = flattenPath(path, delimiter);
            const currentSegment = instrumentationApi.getActiveSegment();

            if (!currentSegment) {
              logger.trace('No active segment found at resolver call. Not recording resolver (%s).', formattedPath);
              return () => {};
            }

            const resolverSegment = instrumentationApi.createSegment(
              `resolver${delimiter}${formattedPath}`,
              null,
              operationSegment
            );

            if (!resolverSegment) {
              logger.trace('Resolver segment was not created (%s).', formattedPath);
              return () => {};
            }

            resolverSegment.start();

            resolverSegment.addAttribute(AttributeName.RESOLVER_FIELD_PATH, formattedPath);
            resolverSegment.addAttribute(AttributeName.RESOLVER_TYPE_NAME, parentType.toString());
            resolverSegment.addAttribute(AttributeName.RESOLVER_RESULT_TYPE, returnType.toString());

            if (options.includeResolverArgs) {
              const rawArgs = resolversArgs || {};
              const resolverArgsToTrack = options.isResolverArgsRegex
                ? filterPropertiesByRegex(rawArgs, options.includeResolverArgs as RegExp)
                : rawArgs;

              resolverSegment.addAttribute(AttributeName.RESOLVER_ARGS, JSON.stringify(resolverArgsToTrack));
            }

            return ({ result }) => {
              if (options.includeRawResult) {
                resolverSegment.addAttribute(AttributeName.RESOLVER_RESULT, JSON.stringify(result));
              }

              if (result instanceof Error && !options.skipError?.(result)) {
                const transaction = instrumentationApi.tracer.getTransaction();
                instrumentationApi.agent.errors.add(transaction, JSON.stringify(result));
              }

              resolverSegment.end();
            };
          }
        : undefined;

      return {
        onResolverCalled,
        onExecuteDone({ result }) {
          const sendResult = (singularResult: ExecutionResult) => {
            if (singularResult.data && options.includeRawResult) {
              spanContext.addCustomAttribute(AttributeName.EXECUTION_RESULT, JSON.stringify(singularResult));
            }

            if (singularResult.errors && singularResult.errors.length > 0) {
              const agent = instrumentationApi.agent;
              const transaction = instrumentationApi.tracer.getTransaction();

              for (const error of singularResult.errors) {
                agent.errors.add(transaction, JSON.stringify(error));
              }
            }
          };
          if (isAsyncIterable(result)) {
            return {
              onNext: ({ result: singularResult }) => {
                sendResult(singularResult);
              },
              onEnd: () => {
                operationSegment.end();
              },
            };
          }
          sendResult(result);
          operationSegment.end();
          return {};
        },
      };
    },
  };
};

function flattenPath(fieldPath: Path, delimiter = '/') {
  const pathArray = [];
  let thisPath: Path | undefined = fieldPath;

  while (thisPath) {
    if (typeof thisPath.key !== 'number') {
      pathArray.push(thisPath.key);
    }
    thisPath = thisPath.prev;
  }

  return pathArray.reverse().join(delimiter);
}

function filterPropertiesByRegex(initialObject: { [key: string]: any }, pattern: RegExp) {
  const filteredObject = {};

  for (const property of Object.keys(initialObject)) {
    if (pattern.test(property)) filteredObject[property] = initialObject[property];
  }

  return filteredObject;
}
