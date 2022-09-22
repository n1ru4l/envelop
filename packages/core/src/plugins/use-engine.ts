import { ExecuteFunction, ParseFunction, Plugin, SubscribeFunction, ValidateFunction } from '@envelop/types';

type UseEngineOptions = {
  execute?: ExecuteFunction;
  parse?: ParseFunction;
  validate?: ValidateFunction;
  subscribe?: SubscribeFunction;
};

export const useEngine = (engine: UseEngineOptions): Plugin => {
  return {
    onExecute: ({ setExecuteFn }) => {
      if (engine.execute) {
        setExecuteFn(engine.execute);
      }
    },
    onParse: ({ setParseFn }) => {
      if (engine.parse) {
        setParseFn(engine.parse);
      }
    },
    onValidate: ({ setValidationFn }) => {
      if (engine.validate) {
        setValidationFn(engine.validate);
      }
    },
    onSubscribe: ({ setSubscribeFn }) => {
      if (engine.subscribe) {
        setSubscribeFn(engine.subscribe);
      }
    },
  };
};
