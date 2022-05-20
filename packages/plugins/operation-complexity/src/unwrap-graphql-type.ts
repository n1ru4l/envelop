import { GraphQLNamedType, GraphQLType, isListType, isNonNullType } from 'graphql';

export function unwrapGraphQLType(graphqlType: GraphQLType): GraphQLNamedType {
  if (isNonNullType(graphqlType) || isListType(graphqlType)) {
    return unwrapGraphQLType(graphqlType.ofType);
  }
  return graphqlType;
}
