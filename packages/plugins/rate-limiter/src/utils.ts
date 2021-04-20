import { DirectiveNode, GraphQLObjectType, GraphQLResolveInfo } from 'graphql';

export function getDirective(info: GraphQLResolveInfo, name: string): null | DirectiveNode {
  const { parentType, fieldName, schema } = info;
  const schemaType = schema.getType(parentType.name) as GraphQLObjectType;
  const field = schemaType.getFields()[fieldName];
  const astNode = field.astNode;
  const directives = astNode.directives;
  const rateLimitDirective = directives.find(d => d.name.value === name);

  return rateLimitDirective || null;
}
