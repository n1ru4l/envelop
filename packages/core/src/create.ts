import { ArbitraryObject, ComposeContext, GetEnvelopedFn, Optional, Plugin } from '@envelop/types';
import { createEnvelopOrchestrator, EnvelopOrchestrator } from './orchestrator.js';
import { getTraced, getTracer } from './tracer.js';

type ExcludeFalsy<TArray extends any[]> = Exclude<TArray[0], null | undefined | false>[];

function notEmpty<T>(value: Optional<T>): value is T {
  return value != null;
}

export function envelop<PluginsType extends Optional<Plugin<any>>[]>(options: {
  plugins: PluginsType;
  enableInternalTracing?: boolean;
}): GetEnvelopedFn<ComposeContext<ExcludeFalsy<PluginsType>>> {
  const plugins = options.plugins.filter(notEmpty);
  const tracer = getTracer<ComposeContext<ExcludeFalsy<PluginsType>>>(plugins);
  const orchestrator = createEnvelopOrchestrator<ComposeContext<ExcludeFalsy<PluginsType>>>({
    plugins,
  });

  const getEnveloped = <TInitialContext extends ArbitraryObject>(
    initialContext: TInitialContext = {} as TInitialContext,
  ) => {
    const traced = getTraced(initialContext);
    const typedOrchestrator = orchestrator as EnvelopOrchestrator<
      TInitialContext,
      ComposeContext<ExcludeFalsy<PluginsType>>
    >;

    traced.sync(tracer?.init, orchestrator.init)(initialContext);

    return {
      parse: traced.sync(tracer?.parse, typedOrchestrator.parse(initialContext)),
      validate: traced.sync(tracer?.validate, typedOrchestrator.validate(initialContext)),
      contextFactory: traced.sync(
        tracer?.context,
        typedOrchestrator.contextFactory(initialContext as any),
      ),
      execute: traced.maybeAsync(tracer?.execute, typedOrchestrator.execute),
      subscribe: traced.maybeAsync(tracer?.subscribe, typedOrchestrator.subscribe),
      schema: typedOrchestrator.getCurrentSchema(),
    };
  };

  getEnveloped._plugins = plugins;

  return getEnveloped as GetEnvelopedFn<ComposeContext<ExcludeFalsy<PluginsType>>>;
}
