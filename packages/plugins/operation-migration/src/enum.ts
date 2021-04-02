import { getNamedType, isEnumType, visit, visitWithTypeInfo } from 'graphql';
import { OperationMigration } from './types';
import { visitResult } from '@graphql-tools/utils';
import { buildRuleMap, unwrap } from './utils';

export type MigrateEnumRule = { enumName: string; fromName: string; toName: string };

export function migrateEnum(rawRules: MigrateEnumRule | MigrateEnumRule[]): OperationMigration {
  const rules = Array.isArray(rawRules) ? rawRules : [rawRules];
  const rulesByType = buildRuleMap(rules, 'enumName');

  return {
    migrateAst: (document, schema, typeInfo) => {
      const typeInfoVisitor = visitWithTypeInfo(typeInfo, {
        leave: {
          EnumValue: node => {
            const type = getNamedType(typeInfo.getArgument().type);

            if (isEnumType(type)) {
              for (const rule of rules) {
                if (type.name === rule.enumName && node.value === rule.fromName) {
                  return {
                    ...node,
                    value: rule.toName,
                  };
                }
              }
            }
          },
        },
      });

      const modifiedDocument = visit(document, typeInfoVisitor);

      return { document: modifiedDocument };
    },
    migrateVariables: (document, variables, schema) => {
      if (!variables || Object.keys(variables).length === 0) {
        return { variablesValue: variables };
      }

      visit(document, {
        VariableDefinition: node => {
          const baseType = unwrap(node.type);
          const variableName = node.variable.name.value;

          for (const rule of rules) {
            if (baseType.name.value === rule.enumName && variables[variableName] === rule.fromName) {
              variables[variableName] = rule.toName;
            }
          }
        },
      });

      return { variablesValue: variables };
    },
    migrateResult: (document, result, schema, typeInfo) => {
      const modifiedResult = visitResult(
        result,
        {
          document,
          variables: {},
        },
        schema,
        Object.keys(rulesByType).reduce((prev, typeName) => {
          return {
            ...prev,
            [typeName]: value => {
              for (const rule of rules) {
                if (rule.toName === value) {
                  return rule.fromName;
                }
              }

              return value;
            },
          };
        }, {})
      );

      return {
        result: modifiedResult,
      };
    },
  };
}
