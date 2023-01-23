import { visit, getNamedType, getOperationAST, isIntrospectionType, TypeInfo, visitWithTypeInfo, BREAK } from 'graphql';

import type { OnExecuteEventPayload } from '@envelop/core';
import type { ContextType } from './types';

export const isAnonymousOperation = (params: OnExecuteEventPayload<ContextType>) => {
  return params?.args?.operationName === undefined;
};

export const isIntrospectionQuery = (params: OnExecuteEventPayload<ContextType>) => {
  const typeInfo = new TypeInfo(params?.args?.schema);
  let isIntrospection = false;

  visit(
    params.args.document,
    visitWithTypeInfo(typeInfo, {
      Field() {
        const type = getNamedType(typeInfo.getType());
        if (type && isIntrospectionType(type)) {
          isIntrospection = true;
          return BREAK;
        }
      },
    })
  );

  return isIntrospection;
};

export const getOperation = (params: OnExecuteEventPayload<ContextType>) => {
  const operationAST = getOperationAST(params.args.document, params.args.operationName);
  return operationAST?.operation ?? 'unknown';
};
