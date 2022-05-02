import { GraphQLSchema } from 'graphql';
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
const VALIDATION_ERRORS = Symbol('VALIDATION_ERRORS');

export const useLazyLoadedSchema = (
  schemaLoader: (context: Maybe<DefaultContext>) => PromiseOrValue<GraphQLSchema>,
  validateSchema = true
): Plugin => {
  let schemaSet$: Promise<GraphQLSchema>;
  return {
    onEnveloped({ setSchema, context }) {
      const schema$ = schemaLoader(context);
      if (isPromise(schema$)) {
        schemaSet$ = schema$.then(schemaObj => {
          setSchema(schemaObj);
          return schemaObj;
        });
      } else {
        setSchema(schema$);
      }
    },
    onValidate({ validateFn, params, setValidationFn, extendContext }) {
      // If schemaSet promise is still ongoing
      if (schemaSet$ != null) {
        if (validateSchema) {
          extendContext({
            [VALIDATE_FN]: () =>
              schemaSet$.then(schema => validateFn(schema, params.documentAST, params.rules, params.typeInfo, params.options)),
          });
        }
        setValidationFn(() => []);
      }
    },
    async onContextBuilding({ context, extendContext, breakContextBuilding }) {
      // If schemaSet promise is still ongoing
      if (context[VALIDATE_FN]) {
        const validateFn = context[VALIDATE_FN];
        const errors = validateFn?.();
        if (errors?.length) {
          extendContext({
            [VALIDATION_ERRORS]: errors,
          });
          breakContextBuilding();
        }
      }
    },
    onExecute({ args: { contextValue }, setResultAndStopExecution }) {
      // If validation errors are set in context
      if (contextValue[VALIDATION_ERRORS]) {
        setResultAndStopExecution({
          errors: contextValue[VALIDATION_ERRORS],
        });
      }
    },
  };
};

export const useAsyncSchema = (schema$: PromiseOrValue<GraphQLSchema>, validateSchema = true): Plugin => {
  let schemaSet$: Promise<GraphQLSchema>;
  return {
    onPluginInit({ setSchema }) {
      if (isPromise(schema$)) {
        schemaSet$ = schema$.then(schemaObj => {
          setSchema(schemaObj);
          return schemaObj;
        });
      } else {
        setSchema(schema$);
      }
    },
    onValidate({ validateFn, params, setValidationFn, extendContext }) {
      if (schemaSet$ != null) {
        if (validateSchema) {
          extendContext({
            [VALIDATE_FN]: () =>
              schemaSet$.then(schema => validateFn(schema, params.documentAST, params.rules, params.typeInfo, params.options)),
          });
        }
        setValidationFn(() => []);
      }
    },
    async onContextBuilding({ context, extendContext, breakContextBuilding }) {
      // If schemaSet promise is still ongoing
      if (context[VALIDATE_FN]) {
        const validateFn = context[VALIDATE_FN];
        const errors = validateFn?.();
        if (errors?.length) {
          extendContext({
            [VALIDATION_ERRORS]: errors,
          });
          breakContextBuilding();
        }
      }
    },
    onExecute({ args: { contextValue }, setResultAndStopExecution }) {
      // If validation errors are set in context
      if (contextValue[VALIDATION_ERRORS]) {
        setResultAndStopExecution({
          errors: contextValue[VALIDATION_ERRORS],
        });
      }
    },
  };
};
