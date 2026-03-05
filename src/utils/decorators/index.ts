import { test } from "@playwright/test";

/**
 * A decorator to wrap a function in a test step with a custom message and options.
 *
 * The decorator allows adding arguments to the step's title at the location where "_$" appears.
 * If no message is provided the method name is used.  The name is split on
 * camel‑case boundaries (and underscores/hyphens) and lower‑cased, then
 * "()" is appended.  For example `enableTitleButtonFlag` becomes
 * "enable title button flag()". You can either call `@step()` or use
 * {@link autoStep} when you want the automatic text.
 *
 * @param {string} [message] - The custom message to be displayed in the test step.
 *                              When omitted, the method name is derived automatically.
 * @param {{ logArgs: boolean }} [options={ logArgs: true }] - Options for the decorator.
 * @param {boolean} options.logArgs - Whether to log the arguments passed to the function.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
// helper to create a readable message from a method name
// when no explicit step text is provided.  It splits camelCase (and
// underscores/hyphens) into words, lowercases everything, and appends
// "()" so the output looks like a call description.
function deriveAlias(name: string): string {
  if (!name) return "";
  // break on camel boundaries and convert separators to spaces
  const spaced = name
    .replace(/[_-]/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase();
  // collapse multiple spaces and trim
  const clean = spaced.replace(/\s+/g, " ").trim();
  return `${clean}()`;
}

export function step<This, Args extends any[], Return>(
  message?: string, // now optional – if omitted we'll fall back to the method name
  options: { logArgs: boolean } = { logArgs: true },
) {
  return function actualDecorator(
    target: (this: This, ...args: Args) => Promise<Return>,
    _context: ClassMethodDecoratorContext<
      This,
      (this: This, ...args: Args) => Promise<Return>
    >,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async function replacementMethod(this: any, ...args: Args) {
      const rawMessage = message?.trim() || deriveAlias(target.name);
      const name = `[${this.name || this.constructor.name}] ${rawMessage}`;
      const prettyName = name.includes("_$")
        ? name.replace("_$", JSON.stringify(args))
        : `${name}  ${options.logArgs && args && args.length ? JSON.stringify(args) : ""}`;

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

// a convenience decorator that simply derives the title from the method name
export function autoStep<This, Args extends any[], Return>(
  options: { logArgs: boolean } = { logArgs: true },
) {
  return function actualDecorator(
    target: (this: This, ...args: Args) => Promise<Return>,
    context: ClassMethodDecoratorContext<
      This,
      (this: This, ...args: Args) => Promise<Return>
    >,
  ) {
    // delegate to `step` using the derived alias
    return step<This, Args, Return>(deriveAlias(target.name), options)(
      target,
      context,
    );
  };
}
