import { buildApp } from '../../api/app';

const EnvelopApp = buildApp({
  async prepare() {
    await import('../../api/modules');
  },
});

export default EnvelopApp.handler;
