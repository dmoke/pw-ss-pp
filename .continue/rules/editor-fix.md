# TypeScript Auto-Fix Rules (tsc)

These rules apply whenever TypeScript compilation is executed and errors are fixed automatically.

---

## 1. Scope Rules (MANDATORY)

- Only files that produced TypeScript errors may be modified
- Only files explicitly provided in the prompt may be edited
- No new files may be created
- No files may be deleted
- `tsconfig.json` must NOT be modified
- No changes outside `.ts` / `.tsx` files

---

## 2. Fix Strategy

- Fix only the reported TypeScript errors
- Prefer minimal, local changes
- Do not refactor unrelated code
- Do not change runtime behavior unless required by the error
- Preserve existing public APIs when possible

---

## 3. Type Safety Rules

- Do NOT use `any` unless no other valid solution exists
- Prefer type narrowing, guards, and generics
- Avoid unsafe type assertions (`as unknown as`)
- Do NOT disable strictness
- Do NOT silence errors with `// @ts-ignore` or `// @ts-expect-error`

---

## 4. Import & Module Rules

- Do not add new dependencies
- Do not change module resolution
- Do not change import style unless required for correctness
- Do not modify path aliases

---

## 5. Retry & Abort Conditions

The fix process MUST abort if any of the following occur:

- The total number of TypeScript errors increases
- The same error appears unchanged twice
- The same file is modified more than 3 times
- More than 200 lines are changed in a single attempt
- More than 5 fix attempts are made

---

## 6. Output Format (STRICT)

- Output unified diff only
- One diff per file
- Do not include explanations or comments
- Do not include markdown formatting
