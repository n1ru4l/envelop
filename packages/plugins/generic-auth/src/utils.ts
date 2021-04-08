import { GraphQLObjectType, GraphQLResolveInfo } from 'graphql';

export function hasDirective(info: GraphQLResolveInfo, name: string): boolean {
  const { parentType, fieldName, schema } = info;
  const schemaType = schema.getType(parentType.name) as GraphQLObjectType;
  const field = schemaType.getFields()[fieldName];
  const astNode = field.astNode;
  const directives = astNode.directives;
  const authDirective = directives.find(d => d.name.value === name);

  return !!authDirective;
}
