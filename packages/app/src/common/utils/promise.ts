export class PLazy<ValueType> extends Promise<ValueType> {
  private _promise?: Promise<ValueType>;

  constructor(private _executor: (resolve: (value: ValueType) => void, reject: (err: unknown) => void) => void) {
    super((resolve: (v?: any) => void) => resolve());
  }

  then: Promise<ValueType>['then'] = (onFulfilled, onRejected) =>
    (this._promise ||= new Promise(this._executor)).then(onFulfilled, onRejected);

  catch: Promise<ValueType>['catch'] = onRejected => (this._promise ||= new Promise(this._executor)).catch(onRejected);

  finally: Promise<ValueType>['finally'] = onFinally => (this._promise ||= new Promise(this._executor)).finally(onFinally);
}

export function LazyPromise<Value>(fn: () => Value | Promise<Value>): Promise<Value> {
  return new PLazy((resolve, reject) => {
    try {
      Promise.resolve(fn()).then(resolve, err => {
        if (err instanceof Error) Error.captureStackTrace(err, LazyPromise);

        reject(err);
      });
    } catch (err) {
      if (err instanceof Error) Error.captureStackTrace(err, LazyPromise);

      reject(err);
    }
  });
}

export interface DeferredPromise<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}

export function createDeferredPromise<T = void>(): DeferredPromise<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;

  // eslint-disable-next-line promise/param-names
  const promise = new Promise<T>((resolveFn, rejectFn) => {
    resolve = resolveFn;
    reject = rejectFn;
  });

  return {
    promise,
    resolve,
    reject,
  };
}
