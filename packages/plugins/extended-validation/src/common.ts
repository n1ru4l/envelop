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
  const directives = astNode.directives || [];

  return directives.find(d => d.name.value === name) || null;
}

export function extractDirectives(astNode: { directives?: ReadonlyArray<DirectiveNode> }, names: string[]): DirectiveNode[] {
  const directives = astNode.directives || [];

  return directives.filter(d => names.includes(d.name.value));
}

export function unwrapType(type: GraphQLType): GraphQLNamedType {
  if (isNonNullType(type) || isListType(type)) {
    return unwrapType(type.ofType);
  }

  return type;
}
