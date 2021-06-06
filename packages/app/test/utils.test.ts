import { cleanObject, isObject, isPlainObject, LazyPromise, PLazy } from '@envelop/app/extend';

test('PLazy', async () => {
  let nCalled = 0;

  const p = new PLazy<number>(resolve => {
    resolve(++nCalled);
  });

  expect(nCalled).toBe(0);

  expect(await p).toBe(1);

  expect(nCalled).toBe(1);

  await p;
  expect(nCalled).toBe(1);

  const p2 = new PLazy<never>((_resolve, reject) => {
    ++nCalled;
    reject(Error('Expected!'));
  });

  expect(nCalled).toBe(1);

  await expect(p2).rejects.toThrowError('Expected!');

  expect(nCalled).toBe(2);

  const p3 = new PLazy<void>(resolve => {
    ++nCalled;
    resolve();
  });

  await p3.finally(() => {
    expect(nCalled).toBe(3);

    ++nCalled;
  });
  expect(nCalled).toBe(4);

  expect(await p2.catch(err => err)).toStrictEqual(Error('Expected!'));
});

test('LazyPromise', async () => {
  let nCalled = 0;

  const p = LazyPromise(() => {
    return ++nCalled;
  });

  expect(nCalled).toBe(0);

  expect(await p).toBe(1);
  expect(nCalled).toBe(1);

  const p2 = LazyPromise(() => {
    ++nCalled;
    throw Error('Expected!');
  });

  expect(nCalled).toBe(1);

  await expect(p2).rejects.toThrowError('Expected!');

  expect(nCalled).toBe(2);

  const p3 = LazyPromise(async () => {
    ++nCalled;
    throw Error('Expected2!');
  });

  expect(nCalled).toBe(2);

  await expect(p3).rejects.toThrowError('Expected2!');

  expect(nCalled).toBe(3);
});

test('cleanObject', () => {
  const obj = {
    a: 1,
    b: undefined,
  };

  expect('b' in obj).toBe(true);

  const obj2 = cleanObject(obj);

  expect('b' in obj2).toBe(false);

  const undefinedObj = cleanObject(undefined);

  expect(cleanObject(undefinedObj)).toStrictEqual({});
});

test('isObject', () => {
  const obj1 = [1];

  expect(isObject(obj1)).toBe(true);

  expect(isPlainObject(obj1)).toBe(false);

  expect(isObject(null)).toBe(false);
  expect(isPlainObject(null)).toBe(false);

  const obj2 = {};

  expect(isObject(obj2)).toBe(true);
  expect(isPlainObject(obj2)).toBe(true);
});
