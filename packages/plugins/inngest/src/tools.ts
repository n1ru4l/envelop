import {
  Kind,
  OperationDefinitionNode,
  visit,
  getNamedType,
  getOperationAST,
  isIntrospectionType,
  TypeInfo,
  visitWithTypeInfo,
  BREAK,
} from 'graphql';
import type { OnExecuteEventPayload } from '@envelop/core';
import type { ContextType, InngestEventExecuteOptions } from './types';

export const extractOperationName = (options: Pick<InngestEventExecuteOptions, 'params'>): string => {
  const args = options.params.args;
  const rootOperation = args.document.definitions.find(
    // @ts-expect-error TODO: not sure how we will make it dev friendly
    definitionNode => definitionNode.kind === Kind.OPERATION_DEFINITION
  ) as OperationDefinitionNode;
  const operationName = args.operationName || rootOperation.name?.value || undefined;

  return operationName;
};

export const isAnonymousOperation = (params: OnExecuteEventPayload<ContextType>) => {
  return extractOperationName({ params }) === undefined;
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
