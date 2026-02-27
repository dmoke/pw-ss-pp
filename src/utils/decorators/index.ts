import { test } from '@playwright/test';

/**
 * A decorator to wrap a function in a test step with a custom message and options.
 *
 * The decorator allows adding arguments to the step's title at the location where "_$" appears.
 *
 * @param {string} message - The custom message to be displayed in the test step.
 * @param {{ logArgs: boolean }} [options={ logArgs: true }] - Options for the decorator.
 * @param {boolean} options.logArgs - Whether to log the arguments passed to the function.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function step<This, Args extends any[], Return>(message: string, options: { logArgs: boolean } = { logArgs: true }) {
  return function actualDecorator(
    target: (this: This, ...args: Args) => Promise<Return>,
    _context: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => Promise<Return>>,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async function replacementMethod(this: any, ...args: Args) {
      const name = `[${this.name || this.constructor.name}] ${message}`;
      const prettyName = name.includes('_$')
        ? name.replace('_$', JSON.stringify(args))
        : `${name}  ${options.logArgs && args && args.length ? JSON.stringify(args) : ''}`;

      return test.step(
        prettyName,
        async () => {
          const result = await target.call(this, ...args);
          return result;
        },
        { box: true },
      );
    }

    return replacementMethod;
  };
}
