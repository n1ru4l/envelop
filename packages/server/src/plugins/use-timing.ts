import { PluginFn } from '../types';
import { ExecutionArgs, print } from 'graphql';
import { inspect } from 'util';

type TimingPluginOptions = {
  execution?: boolean;
  onTiming: (executionParams: ExecutionArgs, operationId: string, timeInMs: number) => void;
};

const DEFAULT_OPTIONS: TimingPluginOptions = {
  execution: true,
  onTiming: (executionParams, operationId, timeInMs) =>
    console.log(
      `Operation "${operationId}" done in ${timeInMs}ms:\n${print(executionParams.document)}\n${inspect(
        { variables: executionParams.variableValues },
        false,
        0,
        true
      )}`
    ),
};

export const useTiming = (rawOptions: TimingPluginOptions = DEFAULT_OPTIONS): PluginFn => api => {
  const options = {
    DEFAULT_OPTIONS,
    ...rawOptions,
  };

  const timing = new Map<string, number>();

  if (options.execution) {
    api.on('beforeExecute', support => {
      timing.set(support.getOperationId(), Date.now());
    });

    api.on('afterExecute', support => {
      const now = Date.now();
      const params = support.getExecutionParams();
      const opId = support.getOperationId();
      const ms = now - timing.get(opId);
      timing.delete(opId);
      options.onTiming(params, opId, ms);
    });
  }
};
