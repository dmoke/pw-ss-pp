import { Locator, Page, expect, TestInfo } from "@playwright/test";
import { ENVS } from "./envs.enum.js";

export const uniqueId = () =>
  parseInt(
    Math.floor(Math.random() * 10000) + Date.now().toString().substring(8, 13),
  );

export const scrollToCenter = async (
  locator: Locator,
  { timeout }: { timeout?: number } = {},
) => {
  await expect(locator, "Scroll to center: element is not visible").toBeVisible(
    { timeout },
  );
  await locator.evaluate((node) =>
    node.scrollIntoView({ block: "center", behavior: "smooth" }),
  );
};

export async function softAssertWithScreenshot(
  page: Page,
  testInfo: TestInfo,
  fn: (() => void) | (() => Promise<void>),
) {
  await fn();

  if (testInfo.status === "failed") {
    const screenshotPath = testInfo.outputPath(`failure-${uniqueId()}.png`);
    testInfo.attachments.push({
      name: "screenshot",
      path: screenshotPath,
      contentType: "image/png",
    });
    await page.screenshot({ path: screenshotPath, timeout: 5000 });
    testInfo["errorsCount"] = testInfo.errors.length;
  }
}


const { ENVIRONMENT } = process.env;

export const isProd = ENVIRONMENT.includes('prod') && ENVIRONMENT.includes('preprod');

type ValueByEnv<T, U> = Partial<Record<ENVS, T>> & { default?: U };

export const getValueByEnv = <T, U = ENVS>(value: ValueByEnv<T, U>, env: ENVS = ENVIRONMENT as ENVS): T | U | undefined => {
  if (env && env in value) {
    return value[env] as T;
  }

  return value.default as U;
};
