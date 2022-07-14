import { identityFunc } from '../identityFunc';

describe('identityFunc', () => {
  it('returns the first argument it receives', () => {
    // @ts-expect-error (Expects an argument)
    expect(identityFunc()).toEqual(undefined);
    expect(identityFunc(undefined)).toEqual(undefined);
    expect(identityFunc(null)).toEqual(null);

    const obj = {};
    expect(identityFunc(obj)).toEqual(obj);
  });
});
