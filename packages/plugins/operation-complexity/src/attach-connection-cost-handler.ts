import { GraphQLFieldConfig, GraphQLInt, GraphQLSchema, GraphQLType, isNonNullType, isObjectType } from 'graphql';
import { mapSchema, MapperKind } from '@graphql-tools/utils';
import type { FieldCountHandler } from './operation-complexity-validation-rule';

type ArgumentValues = Record<string, unknown>;

type ConnectionFieldConfig = { hasFirst: boolean; hasLast: boolean };

export type IsConnectionFieldFunction = (field: GraphQLFieldConfig<unknown, unknown>) => boolean;
export type IsEdgeFieldFunction = (field: GraphQLFieldConfig<unknown, unknown>) => boolean;
export type AttachConnectionCostHandlerConfig = {
  isConnectionField?: IsConnectionFieldFunction;
  connectionFieldCountHandler?: FieldCountHandler;
};

/**
 * Attach count functions to a GraphQL schema for estimating the amount of edges returned from connection fields.
 * This allows calculating a more precise query complexity cost.
 */
export function attachConnectionCostHandler(schema: GraphQLSchema): GraphQLSchema {
  return mapSchema(schema, {
    [MapperKind.OBJECT_FIELD](field) {
      if (isConnectionField(field)) {
        return {
          ...field,
          extensions: {
            ...field.extensions,
            queryComplexity: {
              ...field.extensions?.queryComplexity,
              count: connectionFieldCountHandler,
              countOn: 'edges',
              // connection get an additional cost of 1 on top of the default object type cost
              additionalCost: 2,
            },
          },
        };
      }

      return field;
    },
  });
}

const getConnectionFieldConfig = (field: GraphQLFieldConfig<any, any>): ConnectionFieldConfig => {
  let hasFirst = false;
  let hasLast = false;
  // eslint-disable-next-line dot-notation
  if (field.args?.['first'] && field.args['first'].type === GraphQLInt) {
    hasFirst = true;
  }
  // eslint-disable-next-line dot-notation
  if (field.args?.['last'] && field.args['last'].type === GraphQLInt) {
    hasLast = true;
  }
  return { hasFirst, hasLast };
};

const isConnectionField: IsConnectionFieldFunction = field => {
  const wrappedType = unwrapNonNullableGraphQLType(field.type);
  let hasConnectionReturnType = false;

  if ('name' in wrappedType) {
    hasConnectionReturnType = wrappedType.name.endsWith('Connection');
  }

  if (hasConnectionReturnType === false) {
    return false;
  }

  // eslint-disable-next-line dot-notation
  if (!isObjectType(wrappedType) || wrappedType.getFields()['edges'] === undefined) {
    return false;
  }

  const config = getConnectionFieldConfig(field);
  if (config.hasFirst === false && config.hasLast === false) {
    // eslint-disable-next-line no-console
    console.warn(
      '[ConnectionCostHandler] Encountered paginated field without pagination arguments. It is recommended to always have a last and first argument specified on fields that return a Connection.'
    );
    return false;
  }
  return true;
};

const connectionFieldCountHandler: FieldCountHandler = (argumentValues: ArgumentValues): number => {
  // eslint-disable-next-line dot-notation
  if (typeof argumentValues['first'] === 'number') {
    // eslint-disable-next-line dot-notation
    return argumentValues['first'] as number;
  }
  // eslint-disable-next-line dot-notation
  if (typeof argumentValues['last'] === 'number') {
    // eslint-disable-next-line dot-notation
    return argumentValues['first'] as number;
  }

  throw new Error(
    '[ConnectionCostHandler] Unexpected scenario encountered. It seems like the validation phase got skipped or the argumentValues where mutated after the validation phase.'
  );
};

function unwrapNonNullableGraphQLType(graphQLType: GraphQLType): GraphQLType {
  if (isNonNullType(graphQLType)) {
    return graphQLType.ofType;
  }
  return graphQLType;
}
