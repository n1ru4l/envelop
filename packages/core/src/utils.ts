import { ASTNode, DocumentNode, Kind, OperationDefinitionNode, visit, BREAK, Source } from 'graphql';

export const envelopIsIntrospectionSymbol = Symbol('ENVELOP_IS_INTROSPECTION');

export function isOperationDefinition(def: ASTNode): def is OperationDefinitionNode {
  return def.kind === Kind.OPERATION_DEFINITION;
}

export function isIntrospectionOperation(operation: OperationDefinitionNode): boolean {
  if (operation.kind === 'OperationDefinition') {
    let hasIntrospectionField = false;

    visit(operation, {
      Field: node => {
        if (node.name.value === '__schema') {
          hasIntrospectionField = true;
          return BREAK;
        }
      },
    });

    return hasIntrospectionField;
  }

  return false;
}

export function isIntrospectionDocument(document: DocumentNode): boolean {
  const operations = document.definitions.filter(isOperationDefinition);

  return operations.some(op => isIntrospectionOperation(op));
}

export function isIntrospectionOperationString(operation: string | Source): boolean {
  return (typeof operation === 'string' ? operation : operation.body).indexOf('__schema') !== -1;
}
