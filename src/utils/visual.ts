import { expect, Locator, Page } from '@playwright/test';
import { scrollToCenter } from './common.js';

export async function matchScreenshot(
  page: Page,
  container: Locator,
  screenshotName: string,
  maskLocators: Locator[] = [],
  options: { animations: 'disabled' } = { animations: 'disabled' },
) {
  await page.waitForTimeout(2000);
  await scrollToCenter(container);
  await page.waitForTimeout(2000);

  for (const elem of maskLocators) {
    if (await elem.isVisible()) {
      await elem.evaluate((node) => (node.style.display = 'none'));
    }
  }

  await expect(page, '[ASSERT] Placeholder image to match screenshot').toHaveScreenshot(screenshotName, {
    clip: await container.boundingBox(),
    maxDiffPixelRatio: 0.2,
    timeout: 120_000,
    animations: options.animations,
  });
}

export async function matchFullScreenScreenshot(
  page: Page,
  screenshotName: string,
  options: { animations: 'disabled' } = { animations: 'disabled' },
) {
  await page.waitForTimeout(1000);

  await expect(page, '[ASSERT] Placeholder image to match screenshot full lobby').toHaveScreenshot(screenshotName, {
    maxDiffPixelRatio: 0.2,
    timeout: 120_000,
    animations: options.animations,
  });
}

export async function matchScreenshotByName(
  page: Page,
  snapshotName: string,
  options: { animations?: 'disabled'; screenshotBuffer?: Buffer } = {},
) {
  if (options.screenshotBuffer) {
    expect(options.screenshotBuffer, '[ASSERT] Widgets combination snapshot').toMatchSnapshot(snapshotName, {
      maxDiffPixelRatio: 0.2,
    });
  } else {
    await expect(page, '[ASSERT] Placeholder image to match screenshot').toHaveScreenshot(snapshotName, {
      maxDiffPixelRatio: 0.2,
      timeout: 120_000,
      animations: options.animations ?? 'disabled',
    });
  }
}
