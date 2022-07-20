/* eslint-disable no-console */
import { Plugin } from '@envelop/types';
import { DocumentNode, ExecutionArgs, getOperationAST, GraphQLResolveInfo, Source, SubscriptionArgs } from 'graphql';
import { isIntrospectionOperationString, envelopIsIntrospectionSymbol } from '../utils.js';

const HR_TO_NS = 1e9;
const NS_TO_MS = 1e6;

export type ResultTiming = { ms: number; ns: number };

export type TimingPluginOptions = {
  skipIntrospection?: boolean;
  onContextBuildingMeasurement?: (timing: ResultTiming) => void;
  onExecutionMeasurement?: (args: ExecutionArgs, timing: ResultTiming) => void;
  onSubscriptionMeasurement?: (args: SubscriptionArgs, timing: ResultTiming) => void;
  onParsingMeasurement?: (source: Source | string, timing: ResultTiming) => void;
  onValidationMeasurement?: (document: DocumentNode, timing: ResultTiming) => void;
  onResolverMeasurement?: (info: GraphQLResolveInfo, timing: ResultTiming) => void;
};

const DEFAULT_OPTIONS: TimingPluginOptions = {
  onExecutionMeasurement: (args, timing) =>
    console.log(`Operation execution "${args.operationName}" done in ${timing.ms}ms`),
  onSubscriptionMeasurement: (args, timing) =>
    console.log(`Operation subscription "${args.operationName}" done in ${timing.ms}ms`),
  onParsingMeasurement: (source: Source | string, timing: ResultTiming) =>
    console.log(`Parsing "${source}" done in ${timing.ms}ms`),
  onValidationMeasurement: (document: DocumentNode, timing: ResultTiming) =>
    console.log(`Validation "${getOperationAST(document)?.name?.value || '-'}" done in ${timing.ms}ms`),
  onResolverMeasurement: (info: GraphQLResolveInfo, timing: ResultTiming) =>
    console.log(`\tResolver of "${info.parentType.toString()}.${info.fieldName}" done in ${timing.ms}ms`),
  onContextBuildingMeasurement: (timing: ResultTiming) => console.log(`Context building done in ${timing.ms}ms`),
};

const deltaFrom = (hrtime: [number, number]): { ms: number; ns: number } => {
  const delta = process.hrtime(hrtime);
  const ns = delta[0] * HR_TO_NS + delta[1];

  return {
    ns,
    get ms() {
      return ns / NS_TO_MS;
    },
  };
};

type InternalPluginContext = {
  [envelopIsIntrospectionSymbol]?: true;
};

export const useTiming = (rawOptions?: TimingPluginOptions): Plugin<InternalPluginContext> => {
  const options = {
    ...DEFAULT_OPTIONS,
    ...rawOptions,
  };

  const result: Plugin<InternalPluginContext> = {};

  if (options.onContextBuildingMeasurement) {
    result.onContextBuilding = ({ context }) => {
      if (context[envelopIsIntrospectionSymbol]) {
        return;
      }

      const contextStartTime = process.hrtime();

      return () => {
        options.onContextBuildingMeasurement!(deltaFrom(contextStartTime));
      };
    };
  }

  if (options.onParsingMeasurement) {
    result.onParse = ({ params, extendContext }) => {
      if (options.skipIntrospection && isIntrospectionOperationString(params.source)) {
        extendContext({
          [envelopIsIntrospectionSymbol]: true,
        });

        return;
      }
      const parseStartTime = process.hrtime();

      return () => {
        options.onParsingMeasurement!(params.source, deltaFrom(parseStartTime));
      };
    };
  }

  if (options.onValidationMeasurement) {
    result.onValidate = ({ params, context }) => {
      if (context[envelopIsIntrospectionSymbol]) {
        return;
      }

      const validateStartTime = process.hrtime();

      return () => {
        options.onValidationMeasurement!(params.documentAST, deltaFrom(validateStartTime));
      };
    };
  }

  if (options.onExecutionMeasurement) {
    if (options.onResolverMeasurement) {
      result.onExecute = ({ args }) => {
        if (args.contextValue[envelopIsIntrospectionSymbol]) {
          return;
        }

        const executeStartTime = process.hrtime();

        return {
          onExecuteDone: () => {
            options.onExecutionMeasurement!(args, deltaFrom(executeStartTime));
          },
        };
      };

      result.onResolverCalled = ({ info }) => {
        const resolverStartTime = process.hrtime();

        return () => {
          options.onResolverMeasurement!(info, deltaFrom(resolverStartTime));
        };
      };
    } else {
      result.onExecute = ({ args }) => {
        if (args.contextValue[envelopIsIntrospectionSymbol]) {
          return;
        }

        const executeStartTime = process.hrtime();

        return {
          onExecuteDone: () => {
            options.onExecutionMeasurement!(args, deltaFrom(executeStartTime));
          },
        };
      };
    }
  }

  if (options.onSubscriptionMeasurement) {
    if (options.onResolverMeasurement) {
      result.onSubscribe = ({ args }) => {
        if (args.contextValue[envelopIsIntrospectionSymbol]) {
          return;
        }

        const subscribeStartTime = process.hrtime();

        return {
          onSubscribeResult: () => {
            options.onSubscriptionMeasurement && options.onSubscriptionMeasurement(args, deltaFrom(subscribeStartTime));
          },
        };
      };

      result.onResolverCalled = ({ info }) => {
        const resolverStartTime = process.hrtime();

        return () => {
          options.onResolverMeasurement && options.onResolverMeasurement(info, deltaFrom(resolverStartTime));
        };
      };
    } else {
      result.onSubscribe = ({ args }) => {
        if (args.contextValue[envelopIsIntrospectionSymbol]) {
          return;
        }

        const subscribeStartTime = process.hrtime();

        return {
          onSubscribeResult: () => {
            options.onSubscriptionMeasurement && options.onSubscriptionMeasurement(args, deltaFrom(subscribeStartTime));
          },
        };
      };
    }
  }

  return result;
};
