import { Kind, NamedTypeNode, TypeNode } from 'graphql';

export function unwrap(type: TypeNode): NamedTypeNode {
  if (type.kind === Kind.LIST_TYPE || type.kind === Kind.NON_NULL_TYPE) {
    return unwrap(type.type);
  }

  return type;
}

export function buildRuleMap<RuleType extends Record<string, any>>(rules: RuleType[], fieldName: keyof RuleType): Record<string, RuleType[]> {
  return rules.reduce((prev, rule) => {
    if (!prev[rule[fieldName]]) {
      prev[rule[fieldName]] = [];
    }

    prev[rule[fieldName]].push(rule);

    return prev;
  }, {} as Record<string, RuleType[]>);
}
