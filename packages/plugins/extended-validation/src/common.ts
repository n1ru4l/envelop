import { ASTVisitor, DirectiveNode, ExecutionArgs, GraphQLNamedType, ValidationContext } from 'graphql';

export type ExtendedValidationRule = (context: ValidationContext, executionArgs: ExecutionArgs) => ASTVisitor;

export function getDirectiveFromType(type: GraphQLNamedType, name: string): null | DirectiveNode {
  const astNode = type.astNode;
  const directives = astNode.directives;
  const authDirective = directives.find(d => d.name.value === name);

  return authDirective || null;
}
