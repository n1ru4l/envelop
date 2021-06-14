import { DefaultContext, Envelop, Plugin } from '@envelop/types';
import { createEnvelopOrchestrator } from './orchestrator';
import { traceOrchestrator } from './traced-orchestrator';

export function envelop(options: { plugins: Plugin[]; enableInternalTracing?: boolean }): Envelop {
  let orchestrator = createEnvelopOrchestrator(options.plugins);

  if (options.enableInternalTracing) {
    orchestrator = traceOrchestrator(orchestrator);
  }

  const getEnveloped = (initialContext: DefaultContext = {}) => {
    // DOTAN: Maybe this could be done as part of onSchemaChange instead of here?
    orchestrator.prepareSchema();

    if (options.enableInternalTracing) {
      initialContext._envelopTracing = {};
    }

    return {
      parse: orchestrator.parse(initialContext),
      validate: orchestrator.validate(initialContext),
      contextFactory: orchestrator.contextFactory(initialContext),
      execute: orchestrator.execute,
      subscribe: orchestrator.subscribe,
      schema: orchestrator.schema!,
    };
  };

  getEnveloped._plugins = options.plugins;

  return getEnveloped;
}
