import { PluginFn } from '@guildql/types';
import { ExecutionArgs, print } from 'graphql';
import { inspect } from 'util';

type TimingPluginOptions = {
  execution?: boolean;
  ignoreIntrospection?: boolean;
  onTiming: (executionParams: ExecutionArgs, operationId: string, timeInMs: number) => void;
};

const DEFAULT_OPTIONS: TimingPluginOptions = {
  execution: true,
  ignoreIntrospection: true,
  onTiming: (executionParams, operationId, timeInMs) =>
    // eslint-disable-next-line no-console
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
      const params = support.getExecutionParams();

      if (options.ignoreIntrospection && params.isIntrospection) {
        return;
      }

      timing.set(support.getOperationId(), Date.now());
    });

    api.on('afterExecute', support => {
      const params = support.getExecutionParams();

      if (options.ignoreIntrospection && params.isIntrospection) {
        return;
      }

      const now = Date.now();
      const opId = support.getOperationId();
      const ms = now - timing.get(opId);
      timing.delete(opId);
      options.onTiming(params, opId, ms);
    });
  }
};
