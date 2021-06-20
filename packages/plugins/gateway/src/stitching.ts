import { print, GraphQLSchema } from 'graphql';
import { SchemaChangeCallback, GatewayOrchestrator } from './types';
import { stitchSchemas } from '@graphql-tools/stitch';
import { introspectSchema, makeRemoteExecutableSchema } from '@graphql-tools/wrap';
import { fetch } from 'cross-fetch';
import { AsyncExecutor } from '@graphql-tools/utils';

export type SchemaLoader = {
  loadSchema(): Promise<GraphQLSchema>;
};

export type NotifyChangedFn = () => void;
export type ReloadProbe = (reload: NotifyChangedFn) => void;

export type Service = {
  name: string;
  loader: SchemaLoader;
  reloadProbe?: ReloadProbe;
};

export function pollingProbe(options: { interval: number }): ReloadProbe {
  return runFn => {
    setTimeout(() => {
      console.log('INTERVAL');
      runFn();
    }, options.interval);
  };
}

export function endpoint(config: { url: string }): SchemaLoader {
  const executor: AsyncExecutor = async function remoteExecutor({ document, variables }) {
    const query = print(document);
    const fetchResult = await fetch(config.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    });

    return fetchResult.json();
  };

  return {
    loadSchema: async () => {
      const schema = await introspectSchema(executor);

      return makeRemoteExecutableSchema({
        schema,
        executor,
      });
    },
  };
}

export type StitchingOrchestratorOptions = {
  services: Service[];
};

export function createStitchingOrchestrator(
  config: StitchingOrchestratorOptions
): GatewayOrchestrator & { start: () => Promise<void> } {
  let notifySchemaChange: SchemaChangeCallback | undefined;

  async function loadAll(): Promise<GraphQLSchema[]> {
    return await Promise.all(config.services.map(service => service.loader.loadSchema()));
  }

  return {
    onSchemaChange(cb: SchemaChangeCallback): void {
      notifySchemaChange = cb;
    },
    async start() {
      const schemas = await loadAll();

      function buildAndNotifySchema() {
        const initialStitchedSchema = stitchSchemas({
          subschemas: schemas,
        });

        notifySchemaChange && notifySchemaChange(initialStitchedSchema);
      }

      buildAndNotifySchema();

      for (const [index, service] of config.services.entries()) {
        if (service.reloadProbe) {
          service.reloadProbe(async () => {
            const schema = await service.loader.loadSchema();
            schemas[index] = schema;
            buildAndNotifySchema();
          });
        }
      }
    },
  };
}
