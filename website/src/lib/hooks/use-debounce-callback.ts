import * as React from 'react';

type TCallback<TArgs extends unknown[]> = (...args: TArgs) => void;

/**
 * Debounce the invocation of a callback (with cleanup).
 */
export const useDebounceCallback = <TArgs extends unknown[]>(callback: TCallback<TArgs>, delay: number): TCallback<TArgs> => {
  const ref = React.useRef<{
    timer: number | null;
    callback: TCallback<TArgs>;
    delay: number;
  }>({
    timer: null,
    callback,
    delay,
  });

  // update ref data
  React.useEffect(() => {
    ref.current.callback = callback;
    ref.current.delay = delay;
  });

  // cleanup on unmount
  React.useEffect(
    () => () => {
      if (ref.current.timer) {
        clearTimeout(ref.current.timer);
      }
    },
    []
  );

  return React.useCallback((...args: TArgs) => {
    if (ref.current.timer) {
      clearTimeout(ref.current.timer);
    }
    ref.current.timer = setTimeout(() => ref.current.callback(...args), ref.current.delay) as unknown as number;
  }, []);
};
