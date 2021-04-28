import { Plugin } from '@envelop/types';
import { GraphQLError, TypeInfo, ValidationContext, visit, visitInParallel, visitWithTypeInfo } from 'graphql';
import { ExtendedValidationRule } from './common';

export const useExtendedValidation = (options: { rules: ExtendedValidationRule[] }): Plugin => {
  let schemaTypeInfo: TypeInfo;

  return {
    onSchemaChange({ schema }) {
      schemaTypeInfo = new TypeInfo(schema);
    },
    onExecute({ args, setResultAndStopExecution }) {
      const errors: GraphQLError[] = [];
      const typeInfo = schemaTypeInfo || new TypeInfo(args.schema);
      const validationContext = new ValidationContext(args.schema, args.document, typeInfo, e => {
        errors.push(e);
      });

      const visitor = visitInParallel(options.rules.map(rule => rule(validationContext, args)));
      visit(args.document, visitWithTypeInfo(typeInfo, visitor));

      for (const rule of options.rules) {
        rule(validationContext, args);
      }

      if (errors.length > 0) {
        setResultAndStopExecution({
          data: null,
          errors,
        });
      }
    },
  };
};
