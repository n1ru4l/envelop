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
  UseInngestExecuteOptions,
  UseInngestEventOptions,
  UseInngestDataOptions,
  UseInngestEntityRecord,
} from './types';

export const sendOperation = (options: UseInngestEventOptions): boolean => {
  if (!options.sendOperations === undefined) {
    options.logger.warn('No operations are allowed.');
  }
  const ops = new Set(options.sendOperations);

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

export const extractOperationName = (options: Pick<UseInngestExecuteOptions, 'params'>): string => {
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

export const buildTypeIdentifiers = async (options: UseInngestDataOptions) => {
  const idFields: Array<string> = ['id'];

  const documentChanged = false; // todo?

  const identifierSet = new Map<string, UseInngestEntityRecord>();
  const typeSet = new Set<string>();

  visitResult(
    options.result,
    {
      document: options.params.args.document,
      variables: options.params.args.variableValues as any,
      operationName: extractOperationName(options),
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

              if (idFields.includes(fieldName)) {
                return (id: string) => {
                  identifierSet.set(`${typename}:${id}`, { typename, id });
                  typeSet.add(typename);
                  return id;
                };
              }

              return undefined;
            },
          });
        },
      }
    )
  );

  const identifiers = Array.from(identifierSet.values());
  const types = Array.from(typeSet.values());

  return { types, identifiers };
};

export const denyType = (options: UseInngestDataOptions) => {
  const typeInfo = new TypeInfo(options.params?.args?.schema);
  let hasType = false;
  const typeDenyList = options.denylist?.types ?? [];

  visit(
    options.params.args.document,
    visitWithTypeInfo(typeInfo, {
      Field() {
        const type = getNamedType(typeInfo.getType());
        if (type && typeDenyList.includes(type?.name)) {
          hasType = true;
          return BREAK;
        }
      },
    })
  );

  return hasType;

  return false;
};

export const denySchemaCoordinate = (options: UseInngestDataOptions) => {
  let hasSchemaCoordinate = false;
  const typeInfo = new TypeInfo(options.params.args.schema);
  const schemaCoordinateDenyList = options.denylist?.schemaCoordinates ?? [];

  visit(
    options.params.args.document,
    visitWithTypeInfo(typeInfo, {
      Field(fieldNode) {
        const parentType = typeInfo.getParentType();
        if (parentType) {
          const schemaCoordinate = `${parentType.name}.${fieldNode.name.value}`;
          if (schemaCoordinateDenyList.includes(schemaCoordinate)) {
            hasSchemaCoordinate = true;
            return BREAK;
          }
        }
      },
    })
  );

  return hasSchemaCoordinate;
};
