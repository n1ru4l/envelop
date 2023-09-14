import { createTestkit } from '@envelop/testing';
import { envelop } from '../src/index.js';
import { useEnvelop } from '../src/plugins/use-envelop.js';
import { query, schema } from './common.js';

describe('plugin init', () => {
  describe('addPlugin', () => {
    it('should call plugins in the correct order', async () => {
      let callNumber = 0;
      const createPlugin = (order: number) => ({
        order,
        onExecute() {
          expect(callNumber).toBe(order);

          callNumber++;
        },
      });

      const teskit = createTestkit(
        [
          createPlugin(0),
          useEnvelop(
            envelop({
              plugins: [createPlugin(1), createPlugin(2)],
            }),
          ),
          useEnvelop(
            envelop({
              plugins: [createPlugin(3), createPlugin(4)],
            }),
          ),
          createPlugin(5),
        ],
        schema,
      );
      await teskit.execute(query, {});

      expect.assertions(6);
    });
  });
});
