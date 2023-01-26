// import { decamelize } from 'humps';

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
import { visitResult } from '@graphql-tools/utils';
import type { OnExecuteEventPayload } from '@envelop/core';
import type {
  ContextType,
  InngestEventExecuteOptions,
  InngestEventOptions,
  InngestDataOptions,
  UseInngestEntityRecord,
} from './types';

export const allowOperation = (options: InngestEventOptions): boolean => {
  if (!options.allowedOperations === undefined) {
    options.logger.warn('No operations are allowed.');
  }
  const ops = new Set(options.allowedOperations);

  const operation = getOperation(options.params);

  if (operation === 'unknown') {
    options.logger.warn('Unknown operation');
    return false;
  }

  const allow = ops.has(operation);

  if (!allow) {
    const operationName = extractOperationName(options);
    options.logger.warn(`Operation ${operation} named ${operationName} is not allowed`);
  }

  return allow;
};

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

export const buildTypeIds = async (options: InngestDataOptions) => {
  // options.logger.debug({ custom: options.result }, '>>>>>>> buildTypeIds');

  const idFields: Array<string> = ['id'];

  const documentChanged = false; // todo?

  const identifier = new Map<string, UseInngestEntityRecord>();
  const types = new Set<string>();

  visitResult(
    options.result,
    {
      document: options.params.args.document,
      variables: options.params.args.variableValues as any,
      operationName: extractOperationName(options), // options.params.args.operationName ?? undefined,
      rootValue: options.params.args.rootValue,
      context: options.params.args.contextValue,
    },
    options.params.args.schema,
    new Proxy(
      {},
      {
        get(_, typename: string) {
          let typenameCalled = 0;
          return new Proxy((val: any) => val, {
            // Needed for leaf values such as scalars, enums etc
            // They don't have fields so visitResult expects functions for those
            apply(_, __, [val]) {
              return val;
            },
            get(_, fieldName: string) {
              if (documentChanged) {
                if (fieldName === '__typename') {
                  typenameCalled++;
                }
                if (
                  fieldName === '__leave' &&
                  /**
                   * The visitResult function is called for each field in the selection set.
                   * But visitResult function looks for __typename field visitor even if it is not there in the document
                   * So it calls __typename field visitor twice if it is also in the selection set.
                   * That's why we need to count the number of times it is called.
                   *
                   * Default call of __typename https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/visitResult.ts#L277
                   * Call for the field node https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/visitResult.ts#L272
                   */ typenameCalled < 2
                ) {
                  return (root: any) => {
                    delete root.__typename;
                    return root;
                  };
                }
              }
              options.logger.debug({ custom: fieldName }, '>>>>>>> buildTypeIds >> fieldName');

              if (idFields.includes(fieldName)) {
                options.logger.debug({ custom: fieldName }, '>>>>>>> buildTypeIds >> fieldName INCLUDED!');

                return (id: string) => {
                  options.logger.debug(
                    { custom: { typename, id } },
                    '>>>>>>> buildTypeIds >> SETTING IDENTIFIER AD TYPE INCLUDED!'
                  );

                  identifier.set(`${typename}:${id}`, { typename, id });
                  types.add(typename);
                  return id;
                };
              }

              options.logger.debug({ custom: fieldName }, '>>>>>>> buildTypeIds >> fieldName NOT FOUND in IDS!');
              return undefined;
            },
          });
        },
      }
    )
  );

  const identifiers = Array.from(identifier.values());

  options.logger.debug({ custom: { idFields } }, 'buildTypeIds >> idFields >>');
  options.logger.debug({ custom: { types } }, 'buildTypeIds >> types >>');
  options.logger.debug({ custom: { identifiers: Array.from(identifier.values()) } }, 'buildTypeIds >> identifier >>');

  return { types, identifiers };
};
