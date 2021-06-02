import { Plugin } from '@envelop/types';
import {
  GraphQLError,
  TypeInfo,
  ValidationContext,
  visit,
  visitInParallel,
  visitWithTypeInfo,
  execute as defaultExecute,
  ExecutionArgs,
} from 'graphql';
import { ExtendedValidationRule } from './common';

type ExecuteFn = typeof defaultExecute;
type ContextObject = {
  rules: Array<ExtendedValidationRule>;
  schemaTypeInfo: TypeInfo;
};

const argumentContextMapping = new WeakMap<object, ContextObject>();

const wrapExecute = (execute: ExecuteFn, ctx: ContextObject) => (args: ExecutionArgs) => {
  const errors: GraphQLError[] = [];
  const typeInfo = ctx.schemaTypeInfo || new TypeInfo(args.schema);
  const validationContext = new ValidationContext(args.schema, args.document, typeInfo, e => {
    errors.push(e);
  });

  const visitor = visitInParallel(ctx.rules.map(rule => rule(validationContext, args)));
  visit(args.document, visitWithTypeInfo(typeInfo, visitor));

  for (const rule of ctx.rules) {
    rule(validationContext, args);
  }

  if (errors.length > 0) {
    return {
      data: null,
      errors,
    };
  }

  return execute(args);
};

export const useExtendedValidation = (options: { rules: ExtendedValidationRule[] }): Plugin => {
  let schemaTypeInfo: TypeInfo;

  return {
    onSchemaChange({ schema }) {
      schemaTypeInfo = new TypeInfo(schema);
    },
    onExecute({ args, executeFn, setExecuteFn }) {
      let contextObject = argumentContextMapping.get(args);
      if (!contextObject) {
        contextObject = {
          rules: [],
          schemaTypeInfo,
        };
        // @ts-expect-error: How to type executeFn overloading
        setExecuteFn(wrapExecute(executeFn, contextObject));
        argumentContextMapping.set(args, contextObject);
      }
      contextObject.rules.push(...options.rules);
    },
  };
};
