import { GraphQLSchema, validate } from 'graphql';
import { DefaultContext, Maybe, Plugin, PromiseOrValue } from '@envelop/types';
import { isPromise } from '../utils';

export const useSchema = (schema: GraphQLSchema): Plugin => {
  return {
    onPluginInit({ setSchema }) {
      setSchema(schema);
    },
  };
};

const VALIDATE_FN = Symbol('VALIDATE_FN');

export const useLazyLoadedSchema = (schemaLoader: (context: Maybe<DefaultContext>) => PromiseOrValue<GraphQLSchema>): Plugin => {
  let schemaSet$: PromiseOrValue<void>;
  return {
    onEnveloped({ setSchema, context }) {
      const schema$ = schemaLoader(context);
      if (isPromise(schema$)) {
        schemaSet$ = schema$.then(schemaObj => {
          setSchema(schemaObj);
        });
      } else {
        setSchema(schema$);
      }
    },
    onValidate({ validateFn, setValidationFn, extendContext }) {
      if (schemaSet$) {
        extendContext({
          [VALIDATE_FN]: validateFn,
        });
        setValidationFn(() => []);
      }
    },
    onExecute({ args: { schema, document, contextValue }, setResultAndStopExecution }) {
      if (schemaSet$) {
        const validateFn: typeof validate = contextValue[VALIDATE_FN];
        const errors = validateFn(schema, document);
        if (errors?.length) {
          setResultAndStopExecution({
            errors,
          });
        } else {
          return schemaSet$;
        }
      }
      return undefined;
    },
  };
};

export const useAsyncSchema = (schema$: PromiseOrValue<GraphQLSchema>): Plugin => {
  let schemaSet$: PromiseOrValue<void>;
  return {
    onPluginInit({ setSchema }) {
      if (isPromise(schema$)) {
        schemaSet$ = schema$.then(schemaObj => {
          setSchema(schemaObj);
        });
      } else {
        setSchema(schema$);
      }
    },
    onValidate({ validateFn, setValidationFn, extendContext }) {
      if (schemaSet$) {
        extendContext({
          [VALIDATE_FN]: validateFn,
        });
        setValidationFn(() => []);
      }
    },
    onExecute({ args: { schema, document, contextValue }, setResultAndStopExecution }) {
      if (schemaSet$) {
        const validateFn: typeof validate = contextValue[VALIDATE_FN];
        const errors = validateFn(schema, document);
        if (errors?.length) {
          setResultAndStopExecution({
            errors,
          });
        } else {
          return schemaSet$;
        }
      }
      return undefined;
    },
  };
};
