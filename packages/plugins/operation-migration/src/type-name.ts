import { Kind, visit } from 'graphql';
import { OperationMigration } from './types';
import { visitResult } from '@graphql-tools/utils';
import { buildRuleMap } from './utils';

export type MigrateTypeNameRile = { fromName: string; toName: string };

export function migrateTypeName(rawRules: MigrateTypeNameRile | MigrateTypeNameRile[]): OperationMigration {
  const rules = Array.isArray(rawRules) ? rawRules : [rawRules];
  const rulesByType = buildRuleMap(rules, 'toName');
  console.log(rulesByType);

  return {
    migrateAst: document => {
      const visitor = {
        leave: {
          NamedType: node => {
            for (const rule of rules) {
              if (node.name.value === rule.fromName) {
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
          },
        },
      };

      const modifiedDocument = visit(document, visitor);

      return { document: modifiedDocument };
    },
    migrateResult: (document, result, schema) => {
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
            // [typeName]: {
            //   __leave: value => {
            //     if (value && typeof value === 'object') {
            //       for (const rule of rules) {
            //         if ('__typename' in value && value.__typename === rule.toName) {
            //           return {
            //             ...value,
            //             __typename: rule.fromName,
            //           };
            //         }
            //       }
            //     }

            //     return value;
            //   },
            // },
          };
        }, {})
      );

      return {
        result: modifiedResult,
      };
    },
  };
}
