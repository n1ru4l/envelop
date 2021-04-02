import { DocumentNode, GraphQLSchema, TypeInfo } from 'graphql';

export type OutFunction<TOriginalResult, TModifiedResult> = (originalResult: TOriginalResult) => TModifiedResult;

export type OperationMigration<TOriginalResult = unknown, TModifiedResult = TOriginalResult> = {
  migrateAst?(
    document: DocumentNode,
    schema: GraphQLSchema,
    typeInfo: TypeInfo
  ): {
    document: DocumentNode;
  };
  migrateVariables?(
    document: DocumentNode,
    variablesValue: Record<string, any>,
    schema: GraphQLSchema,
    typeInfo: TypeInfo
  ): {
    variablesValue: Record<string, any>;
  };
  migrateResult?(
    document: DocumentNode,
    result: TOriginalResult,
    schema: GraphQLSchema,
    typeInfo: TypeInfo
  ): {
    result: TModifiedResult;
  };
};
