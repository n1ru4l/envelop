import { Plugin } from '@envelop/types';
import { GraphQLSchema, TypeInfo } from 'graphql';
import { OperationMigration } from './types';

export type OperationMigrationOptions = {
  migrations: OperationMigration[];
};

export const useOperationMigration = (pluginOptions: OperationMigrationOptions): Plugin => {
  let currentSchema: GraphQLSchema;
  let typeInfo: TypeInfo;
  const migrateAstFns = pluginOptions.migrations.filter(p => p.migrateAst);
  const migrateVariablesFns = pluginOptions.migrations.filter(p => p.migrateVariables);
  const migrateResultFns = pluginOptions.migrations.filter(p => p.migrateResult);

  return {
    onSchemaChange({ schema }) {
      currentSchema = schema;
      typeInfo = new TypeInfo(currentSchema);
    },
    onParse({ setParsedDocument }) {
      return ({ result }) => {
        if (result instanceof Error) {
          return;
        }

        let document = result;

        if (document) {
          for (const migration of migrateAstFns) {
            const out = migration.migrateAst!(document, currentSchema, typeInfo);
            document = out.document;
          }

          setParsedDocument(document);
        }
      };
    },
    onExecute({ args, setVariables }) {
      let variables = args.variableValues;

      if (!variables) {
        return;
      }

      for (const migration of migrateVariablesFns) {
        const out = migration.migrateVariables!(args.document, variables, args.schema, typeInfo);
        variables = out.variablesValue;
      }

      setVariables(variables);

      return {
        onExecuteDone: ({ result, setResult }) => {
          let modifiedResult = result;

          for (const migration of migrateResultFns) {
            const out = migration.migrateResult!(args.document, modifiedResult, args.schema, typeInfo);
            modifiedResult = out.result;
          }

          setResult(modifiedResult);
        },
      };
    },
  };
};
