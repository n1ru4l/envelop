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
  let schemaSet$: PromiseOrValue<void>;
  return {
    onEnveloped({ setSchema, context }) {
      const schema$ = schemaLoader(context);
      if (isPromise(schema$)) {
        schemaSet$ = schema$.then(schemaObj => {
          setSchema(schemaObj);
          schemaSet$ = undefined;
        });
      } else {
        setSchema(schema$);
      }
    },
    onValidate({ validateFn, params, setValidationFn, extendContext }) {
      if (schemaSet$) {
        if (validateSchema) {
          extendContext({
            [VALIDATE_FN]: (schema: GraphQLSchema) =>
              validateFn(schema, params.documentAST, params.rules, params.typeInfo, params.options),
          });
        }
        setValidationFn(() => []);
      }
    },
    async onContextBuilding({ context, extendContext, breakContextBuilding }) {
      if (context[VALIDATE_FN]) {
        const schema = await schemaSet$;
        const validateFn = context[VALIDATE_FN];
        const errors = validateFn?.(schema);
        if (errors?.length) {
          extendContext({
            [VALIDATION_ERRORS]: errors,
          });
          breakContextBuilding();
        }
      }
    },
    onExecute({ args: { contextValue }, setResultAndStopExecution }) {
      if (contextValue[VALIDATION_ERRORS]) {
        setResultAndStopExecution({
          errors: contextValue[VALIDATION_ERRORS],
        });
      }
    },
  };
};

export const useAsyncSchema = (schema$: PromiseOrValue<GraphQLSchema>, validateSchema = true): Plugin => {
  let schemaSet$: PromiseOrValue<GraphQLSchema> | undefined;
  return {
    onPluginInit({ setSchema }) {
      if (isPromise(schema$)) {
        schemaSet$ = schema$.then(schemaObj => {
          setSchema(schemaObj);
          // Once the schema is completely resolved, we don't need to keep the logic below.
          schemaSet$ = undefined;
          return schemaObj;
        });
      } else {
        setSchema(schema$);
      }
    },
    onValidate({ validateFn, params, setValidationFn, extendContext }) {
      // If schemaSet promise is still ongoing
      if (schemaSet$) {
        if (validateSchema) {
          extendContext({
            [VALIDATE_FN]: (schema: GraphQLSchema) =>
              validateFn(schema, params.documentAST, params.rules, params.typeInfo, params.options),
          });
        }
        setValidationFn(() => []);
      }
    },
    async onContextBuilding({ context, extendContext, breakContextBuilding }) {
      // If schemaSet promise is still ongoing
      if (schemaSet$) {
        const schema = await schemaSet$;
        const validateFn = context[VALIDATE_FN];
        const errors = validateFn?.(schema);
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
