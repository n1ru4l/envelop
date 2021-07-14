import { createSpiedPlugin } from '@envelop/testing';
import { envelop } from '../src';

describe('OnEnveloped', () => {
  it('Should not call OnEnveloped when passed with null', async () => {
    const spiedPlugin = createSpiedPlugin();
    const getEnveloped = envelop({ plugins: [spiedPlugin.plugin] });
    getEnveloped(null);
    expect(spiedPlugin.spies.onEnveloped).not.toHaveBeenCalled();
  });

  it('Should call OnEnveloped when no args is passed, fallback to {} as context', async () => {
    const spiedPlugin = createSpiedPlugin();
    const getEnveloped = envelop({ plugins: [spiedPlugin.plugin] });
    getEnveloped();
    expect(spiedPlugin.spies.onEnveloped).toHaveBeenCalledWith(
      expect.objectContaining({
        context: {},
      })
    );
  });

  it('Should call OnEnveloped when passed with initial context', async () => {
    const spiedPlugin = createSpiedPlugin();
    const getEnveloped = envelop({ plugins: [spiedPlugin.plugin] });
    getEnveloped({});
    expect(spiedPlugin.spies.onEnveloped).toHaveBeenCalled();
  });

  it('Should call OnEnveloped correct with each flow requirements', async () => {
    const spiedPlugin = createSpiedPlugin();
    const getEnveloped = envelop({ plugins: [spiedPlugin.plugin] });
    getEnveloped(null);
    expect(spiedPlugin.spies.onEnveloped).not.toHaveBeenCalled();
    getEnveloped({});
    expect(spiedPlugin.spies.onEnveloped).toHaveBeenCalledTimes(1);
  });
});
