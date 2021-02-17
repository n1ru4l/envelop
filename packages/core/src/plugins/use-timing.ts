/* eslint-disable no-console */
import { Plugin } from '@envelop/types';
import { DocumentNode, ExecutionArgs, getOperationAST, GraphQLResolveInfo, Source } from 'graphql';

const HR_TO_NS = 1e9;
const NS_TO_MS = 1e6;

export type ResultTiming = { ms: number; ns: number };

export type TimingPluginOptions = {
  onContextBuildingMeasurement?: (timing: ResultTiming) => void;
  onExecutionMeasurement?: (args: ExecutionArgs, timing: ResultTiming) => void;
  onParsingMeasurement?: (source: Source | string, timing: ResultTiming) => void;
  onValidationMeasurement?: (document: DocumentNode, timing: ResultTiming) => void;
  onResolverMeasurement?: (info: GraphQLResolveInfo, timing: ResultTiming) => void;
};

const DEFAULT_OPTIONS: TimingPluginOptions = {
  onExecutionMeasurement: (args, timing) => console.log(`Operation execution "${args.operationName}" done in ${timing.ms}ms`),
  onParsingMeasurement: (source: Source | string, timing: ResultTiming) => console.log(`Parsing "${source}" done in ${timing.ms}ms`),
  onValidationMeasurement: (document: DocumentNode, timing: ResultTiming) =>
    console.log(`Validation "${getOperationAST(document).name?.value}" done in ${timing.ms}ms`),
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

export const useTiming = (rawOptions?: TimingPluginOptions): Plugin => {
  const options = {
    ...DEFAULT_OPTIONS,
    ...(rawOptions || {}),
  };

  return {
    onContextBuilding() {
      const contextStartTime = process.hrtime();

      return () => {
        options.onContextBuildingMeasurement(deltaFrom(contextStartTime));
      };
    },
    onParse({ params }) {
      const parseStartTime = process.hrtime();

      return () => {
        options.onParsingMeasurement(params.source, deltaFrom(parseStartTime));
      };
    },
    onValidate({ params }) {
      const validateStartTime = process.hrtime();

      return () => {
        options.onValidationMeasurement(params[1], deltaFrom(validateStartTime));
      };
    },
    onExecute({ args }) {
      const executeStartTime = process.hrtime();

      return {
        onExecuteDone: () => {
          options.onExecutionMeasurement(args, deltaFrom(executeStartTime));
        },
        onResolverCalled: ({ info }) => {
          const resolverStartTime = process.hrtime();

          return () => {
            options.onResolverMeasurement(info, deltaFrom(resolverStartTime));
          };
        },
      };
    },
  };
};
