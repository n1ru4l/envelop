import { GraphQLSchema } from 'graphql';

export type SchemaChangeCallback = (schema: GraphQLSchema) => void;

export type GatewayOrchestrator = {
  onSchemaChange: (cb: SchemaChangeCallback) => void;
};

export type GatewayPluginOptions = {
  orchestrator: GatewayOrchestrator;
};
