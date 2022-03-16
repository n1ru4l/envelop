import { TypedExecutionArgs } from '@envelop/core';
import { ASTVisitor, DirectiveNode, GraphQLNamedType, GraphQLType, isListType, isNonNullType, ValidationContext } from 'graphql';

export type ExtendedValidationRule<ContextType> = (
  context: ValidationContext,
  executionArgs: TypedExecutionArgs<ContextType>
) => ASTVisitor;

export function getDirectiveFromAstNode(
  astNode: { directives?: ReadonlyArray<DirectiveNode> },
  names: string | string[]
): null | DirectiveNode {
  const directives = astNode.directives || [];
  const namesArr = Array.isArray(names) ? names : [names];
  const authDirective = directives.find(d => namesArr.includes(d.name.value));

  return authDirective || null;
}

export function unwrapType(type: GraphQLType): GraphQLNamedType {
  if (isNonNullType(type) || isListType(type)) {
    return unwrapType(type.ofType);
  }

  return type;
}
