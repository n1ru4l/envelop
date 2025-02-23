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
    context: TInitialContext = {} as TInitialContext,
  ) => {
    const traced = getTraced<{ context: any }>({ context });
    const typedOrchestrator = orchestrator as EnvelopOrchestrator<
      TInitialContext,
      ComposeContext<ExcludeFalsy<PluginsType>>
    >;

    traced.fn(tracer?.init, orchestrator.init)(context);

    return {
      parse: traced.fn(tracer?.parse, typedOrchestrator.parse(context)),
      validate: traced.fn(tracer?.validate, typedOrchestrator.validate(context)),
      contextFactory: traced.fn(tracer?.context, typedOrchestrator.contextFactory(context as any)),
      execute: traced.asyncFn(tracer?.execute, typedOrchestrator.execute),
      subscribe: traced.asyncFn(tracer?.subscribe, typedOrchestrator.subscribe),
      schema: typedOrchestrator.getCurrentSchema(),
    };
  };

  getEnveloped._plugins = plugins;

  return getEnveloped as GetEnvelopedFn<ComposeContext<ExcludeFalsy<PluginsType>>>;
}
