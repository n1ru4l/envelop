import type { useGraphQlJit } from '@envelop/graphql-jit';
import type { Plugin } from '@envelop/types';

export interface WithJit {
  /**
   * Enable JIT Compilation using [graphql-jit](https://github.com/zalando-incubator/graphql-jit)
   *
   * @default false
   */
  jit?: boolean | Parameters<typeof useGraphQlJit>;
}

export async function handleJit({ jit = false }: WithJit, plugins: Plugin[]): Promise<void> {
  if (!jit) return;

  await import('@envelop/graphql-jit').then(({ useGraphQlJit }) => {
    plugins.push(typeof jit === 'object' ? useGraphQlJit(...jit) : useGraphQlJit());
  });
}
