import { instanceOf } from '../instanceOf.js';

describe('instanceOf', () => {
  it('do not throw on values without prototype', () => {
    class Foo {
      get [Symbol.toStringTag]() {
        return 'Foo';
      }
    }

    expect(instanceOf(true, Foo)).toEqual(false);
    expect(instanceOf(null, Foo)).toEqual(false);
    expect(instanceOf(Object.create(null), Foo)).toEqual(false);
  });

  it('detect name clashes with older versions of this lib', () => {
    function oldVersion() {
      class Foo {}
      return Foo;
    }

    function newVersion() {
      class Foo {
        get [Symbol.toStringTag]() {
          return 'Foo';
        }
      }
      return Foo;
    }

    const NewClass = newVersion();
    const OldClass = oldVersion();
    expect(instanceOf(new NewClass(), NewClass)).toEqual(true);
    expect(() => instanceOf(new OldClass(), NewClass)).toThrow();
  });

  it('allows instances to have share the same constructor name', () => {
    function getMinifiedClass(tag: string) {
      class SomeNameAfterMinification {
        get [Symbol.toStringTag]() {
          return tag;
        }
      }
      return SomeNameAfterMinification;
    }

    const Foo = getMinifiedClass('Foo');
    const Bar = getMinifiedClass('Bar');
    expect(instanceOf(new Foo(), Bar)).toEqual(false);
    expect(instanceOf(new Bar(), Foo)).toEqual(false);

    const DuplicateOfFoo = getMinifiedClass('Foo');
    expect(() => instanceOf(new DuplicateOfFoo(), Foo)).toThrow();
    expect(() => instanceOf(new Foo(), DuplicateOfFoo)).toThrow();
  });

  it('fails with descriptive error message', () => {
    function getFoo() {
      class Foo {
        get [Symbol.toStringTag]() {
          return 'Foo';
        }
      }
      return Foo;
    }
    const Foo1 = getFoo();
    const Foo2 = getFoo();

    expect(() => instanceOf(new Foo1(), Foo2)).toThrow(/^Cannot use Foo "{}" from another module or realm./m);
    expect(() => instanceOf(new Foo2(), Foo1)).toThrow(/^Cannot use Foo "{}" from another module or realm./m);
  });
});
