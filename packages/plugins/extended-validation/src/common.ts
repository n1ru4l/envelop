import {
  ASTVisitor,
  DirectiveNode,
  ExecutionArgs,
  GraphQLNamedType,
  GraphQLType,
  isListType,
  isNonNullType,
  ValidationContext,
} from 'graphql';

export type ExtendedValidationRule = (context: ValidationContext, executionArgs: ExecutionArgs) => ASTVisitor;

export function getDirectiveFromAstNode(
  astNode: { directives?: ReadonlyArray<DirectiveNode> },
  name: string
): null | DirectiveNode {
  if (!astNode) {
    return null;
  }

  const directives = astNode.directives || [];
  const authDirective = directives.find(d => d.name.value === name);

  return authDirective || null;
}

export function unwrapType(type: GraphQLType): GraphQLNamedType {
  if (isNonNullType(type) || isListType(type)) {
    return unwrapType(type.ofType);
  }

  return type;
}
