import { createInMemoryOperationComplexityStore } from '../src/in-memory-operation-complexity-store';

describe('createQueryComplexityInMemoryStore', () => {
  jest.useFakeTimers();

  afterEach(() => {
    jest.runAllTimers();
    // @ts-ignore
    global.setTimeout.mockRestore?.();
    // @ts-ignore
    global.clearTimeout.mockRestore?.();
  });

  it('can return the correct values for set and get calls based on the elapsed time.', () => {
    const store = createInMemoryOperationComplexityStore({
      reclaimInterval: 500,
      reclaimAmountPoints: 9,
    });
    let value = store.get('1');
    expect(value).toEqual(0);
    store.add('1', 10);
    value = store.get('1');
    expect(value).toEqual(10);
    jest.advanceTimersByTime(500);
    value = store.get('1');
    expect(value).toEqual(1);
    store.add('1', 10);
    jest.advanceTimersByTime(500);
    value = store.get('1');
    expect(value).toEqual(2);
  });

  /**
   * These tests are very implementation specific with the purpose of preventing memory leaks.
   */

  it('evicts records after their consumedBudget becomes 0 via setTimeout', () => {
    jest.spyOn(global, 'setTimeout');

    const store = createInMemoryOperationComplexityStore({
      reclaimInterval: 500,
      reclaimAmountPoints: 10,
    });
    store.add('1', 10);
    jest.advanceTimersByTime(500);

    expect(setTimeout).toHaveBeenCalledTimes(1);
    expect(setTimeout).toBeCalledWith(expect.any(Function), 500);
  });

  it('expands record life time if the consumedBudget is increased with clearTimeout and setTimeout', () => {
    jest.spyOn(global, 'setTimeout');
    jest.spyOn(global, 'clearTimeout');

    const store = createInMemoryOperationComplexityStore({
      reclaimInterval: 100,
      reclaimAmountPoints: 10,
    });
    store.add('1', 10);
    expect(setTimeout).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(90);
    expect(setTimeout).toBeCalledWith(expect.any(Function), 100);
    store.add('1', 10);
    expect(clearTimeout).toHaveBeenCalledTimes(1);
    expect(setTimeout).toBeCalledWith(expect.any(Function), 200);
    jest.advanceTimersByTime(100);
    // after 100ms we should only have half the budget of 20
    let value = store.get('1');
    expect(value).toEqual(10);
    jest.advanceTimersByTime(100);
    // after another 100ms the budget should be 0
    value = store.get('1');
    expect(value).toEqual(0);
  });
});
