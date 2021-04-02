import { getNamedType, isInterfaceType, isObjectType, Kind, visit, visitWithTypeInfo } from 'graphql';
import { OperationMigration } from './types';
import { visitResult } from '@graphql-tools/utils';
import { buildRuleMap } from './utils';

export type MigrateFieldNameRile = { typeName: string; fromName: string; toName: string };

export function migrateFieldName(rawRules: MigrateFieldNameRile | MigrateFieldNameRile[]): OperationMigration {
  const rules = Array.isArray(rawRules) ? rawRules : [rawRules];
  const rulesByType = buildRuleMap(rules, 'typeName');

  return {
    migrateAst: (document, schema, typeInfo) => {
      const typeInfoVisitor = visitWithTypeInfo(typeInfo, {
        leave: {
          Field: node => {
            const type = getNamedType(typeInfo.getParentType());

            if (isObjectType(type) || isInterfaceType(type)) {
              for (const rule of rules) {
                if (type.name === rule.typeName && node.name.value === rule.fromName) {
                  return <typeof node>{
                    ...node,
                    name: {
                      kind: Kind.NAME,
                      value: rule.toName,
                      loc: node.name.loc,
                    },
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
            [typeName]: {
              __leave: value => {
                if (value && typeof value === 'object') {
                  for (const rule of rules) {
                    if (rule.toName in value) {
                      const { [rule.toName]: fieldValue, ...rest } = value;

                      return {
                        ...rest,
                        [rule.fromName]: fieldValue,
                      };
                    }
                  }
                }

                return value;
              },
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
