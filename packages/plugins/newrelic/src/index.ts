import { shim as instrumentationApi } from 'newrelic';
import { Plugin, OnExecuteHookResult } from '@envelop/types';
import { print, FieldNode } from 'graphql';
import { Path } from 'graphql/jsutils/Path';

export enum AttributeName {
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
  includeExecuteVariables?: boolean;
  includeRawResult?: boolean;
  trackResolvers?: boolean;
  includeResolverArgs?: boolean;
  rootFieldsNaming?: boolean;
  operationNameProperty?: string;
};

const DEFAULT_OPTIONS: UseNewRelicOptions = {
  includeExecuteVariables: false,
  includeRawResult: false,
  trackResolvers: false,
  includeResolverArgs: false,
  rootFieldsNaming: false,
  operationNameProperty: '',
};

export const useNewRelic = (rawOptions?: UseNewRelicOptions): Plugin => {
  const options = {
    ...DEFAULT_OPTIONS,
    ...(rawOptions || {}),
  };
  const logger = instrumentationApi.logger.child({ component: AttributeName.COMPONENT_NAME });
  logger.info(`${AttributeName.COMPONENT_NAME} registered`);

  instrumentationApi.agent.metrics
    .getOrCreateMetric(`Supportability/ExternalModules/${AttributeName.COMPONENT_NAME}`)
    .incrementCallCount();

  return {
    onExecute({ args }) {
      const transactionNameState = instrumentationApi.agent.tracer.getTransaction().nameState;
      const spanContext = instrumentationApi.agent.tracer.getSpanContext();
      const delimiter = transactionNameState.delimiter;
      const rootOperation = args.contextValue.operation;
      const operationType = rootOperation.operation;
      const document = print(args.contextValue.document);
      const operationName =
        rootOperation[options.operationNameProperty as string] || rootOperation.name?.value || AttributeName.ANONYMOUS_OPERATION;
      const rootFields = rootOperation.selectionSet.selections.map((selection: FieldNode) => selection.name.value);

      transactionNameState.setName(
        transactionNameState.prefix,
        transactionNameState.verb,
        delimiter,
        operationType + delimiter + operationName + (options.rootFieldsNaming ? delimiter + rootFields.join('&') : '')
      );

      spanContext.addCustomAttribute(AttributeName.EXECUTION_OPERATION_NAME, operationName);
      spanContext.addCustomAttribute(AttributeName.EXECUTION_OPERATION_TYPE, operationType);
      spanContext.addCustomAttribute(AttributeName.EXECUTION_OPERATION_DOCUMENT, document);
      options.includeExecuteVariables &&
        spanContext.addCustomAttribute(AttributeName.EXECUTION_VARIABLES, JSON.stringify(args.variableValues || {}));

      const operationSegment = instrumentationApi.getActiveSegment();

      const onResolverCalled: OnExecuteHookResult['onResolverCalled'] = options.trackResolvers
        ? ({ args: resolversArgs, info }) => {
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
            options.includeResolverArgs &&
              resolverSegment.addAttribute(AttributeName.RESOLVER_ARGS, JSON.stringify(resolversArgs || {}));

            return ({ result }) => {
              if (options.includeRawResult) {
                resolverSegment.addAttribute(AttributeName.RESOLVER_RESULT, JSON.stringify(result));
              }

              if (result instanceof Error) {
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
          if (result.data && options.includeRawResult) {
            spanContext.addCustomAttribute(AttributeName.EXECUTION_RESULT, JSON.stringify(result));
          }

          if (result.errors && result.errors.length > 0) {
            const agent = instrumentationApi.agent;
            const transaction = instrumentationApi.tracer.getTransaction();

            for (const error of result.errors) {
              agent.errors.add(transaction, error);
            }
          }

          operationSegment.end();
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
