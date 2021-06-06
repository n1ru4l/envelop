import { CreateApp } from '../../../../src/nextjs';

function buildContext(_args: import('../../../../src/nextjs').BuildContextArgs) {
  return {
    foo: 'bar',
  };
}

export const { buildApp, registerModule, gql } = CreateApp({
  buildContext,
  enableCodegen: false,
});
