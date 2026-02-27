import { expect, Locator } from "@playwright/test";
import { step } from "@src/utils/decorators/index.js";
import { Page } from "@playwright/test";
import { log } from "@src/utils/logger.js";

class PopupHandler {
  private locator: Locator;
  private elementMessage: string;

  constructor() {
    this.locator = {} as Locator;
  }

  private getElementMessage(): string {
    return `Found element ${this.locator["_selector"]} visible and clicking it`;
  }

  @step("Clicking on Popup element after it found Visible: _$")
  private async logClickContext(context: string) {
    log.info(`[${context}]: ${this.elementMessage}`);
  }

  public async performClick(locator: Locator, context: string) {
    this.locator = locator.first();
    this.elementMessage = this.getElementMessage();
    await this.logClickContext(context);
    await this.locator.click({ force: true });
    try {
      await expect(locator).toBeHidden({ timeout: 5000 });
      log.info(`[${context}]: Element is hidden after click`);
    } catch (err) {
      log.warn(
        `[${context}]: Element is still visible after click - ${err.message}`,
      );
      // Try clicking again if element is still visible
      try {
        if (await locator.isVisible()) {
          await this.locator.click({ force: true });
          await expect(locator).toBeHidden({ timeout: 4000 });
          log.info(`[${context}]: Element is hidden after second click`);
        }
      } catch (secondErr) {
        log.warn(
          `[${context}]: Failed to hide element after second attempt - ${secondErr.message}`,
        );
      }
    }
  }
}

export async function setupLoaderHandlersHook(page: Page) {
  const popupHandler = new PopupHandler();

  // locators for sale event banner; other banner handlers have been commented out for clarity
  // const cookieBanner = page.locator('#cookieNotification');
  // const cookieModal = page.locator('[class*=CookieManagementModal]').first();
  // const cookieModalAcceptBtn = cookieModal.locator('[class*=allowAllButton]').first();
  // const cookieBotAllowAllBtn = page.locator('#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll');

  // const mobileAppBannerCloseBtn = page.locator('[data-role="mobile-app-banner-close"]');
  // const iconNotificationClose = page.locator('[data-role="icon-notification-close"]:not([class*=VerificationStatusNotification])');
  // const favbetBannerCloseBtn = page.locator('div[class*=AppBanner] svg');

  // const internalPopupCloseBtn = page.locator('[class="ao-close ao-text-white"]');
  // const animazePopupCloseBtn = internalPopupCloseBtn;
  // const animazePopupCancelBtn = page.locator('a.ao-btn-red-darken[href="dp:close"][data-ao-hide-popup="true"]');

  // //FIXME: HARDCODED FOR NOW: request new locator for updates popup close button
  // const updatesPopupCloseBtn = page.locator('span:has-text("Updates") + svg[viewBox="0 0 16 16"]').first();
  // const ludomanNotificationCloseBtn = page.locator('#notifications [data-role="icon-notification-close"]');

  // const termsAndConditionsAcceptBtn = page.locator('[class*=ModalDialog_acceptBtn]');
  // const notificationBannerCloseBtn = page.locator('[class*=NotificationBanner_closeButton]');
  // const maintenanceNotificationCloseBtn = page.locator('[class*=NotificationBanner_notification] [data-testid="close-button"]');
  // const notificationPopupCloseBtn = page.locator('[class*=NotificationPopup_close]');
  // const verificationIconBtn = page.locator('[class*=VerificationStatusNotification_general] [class*=icon]');
  // const ludomanNotificationIcon = page.locator('[class*=Notification_notification] svg');
  // const randomGamePopupCloseBtn = page.locator('[class*=RandomGamePicker_modalHeader] svg');

  // our sale banner locator (not present by default)
  const saleBanner = page.locator("#saleBanner");

  // other locators disabled while focusing on sale banner
  // await page.addLocatorHandler(cookieModalAcceptBtn, async () => {
  //   await popupHandler.performClick(cookieModalAcceptBtn, 'Cookie Modal Accept All');
  // });

  // await page.addLocatorHandler(cookieBotAllowAllBtn, async () => {
  //   await popupHandler.performClick(cookieBotAllowAllBtn, 'CookieBot Allow All');
  // });

  // await page.addLocatorHandler(
  //   iconNotificationClose,
  //   async () => {
  //     await popupHandler.performClick(iconNotificationClose, 'iconNotificationClose');
  //   },
  //   { times: 1 },
  // );

  // await page.addLocatorHandler(mobileAppBannerCloseBtn, async () => {
  //   await popupHandler.performClick(mobileAppBannerCloseBtn, 'Mobile App Banner Close');
  // });

  // await page.addLocatorHandler(cookieBanner, async () => {
  //   await popupHandler.performClick(cookieBanner.locator('span').last(), 'Cookie Banner Accept');
  // });

  // await page.addLocatorHandler(animazePopupCloseBtn, async () => {
  //   await popupHandler.performClick(animazePopupCloseBtn.locator('span').last(), 'Animaze Internal Popup Close');
  // });

  // await page.addLocatorHandler(animazePopupCancelBtn, async () => {
  //   await popupHandler.performClick(animazePopupCancelBtn, 'Animaze Popup Cancel');
  // });

  // await page.addLocatorHandler(internalPopupCloseBtn, async () => {
  //   await popupHandler.performClick(internalPopupCloseBtn, 'Internal Popup Close');
  // });

  // await page.addLocatorHandler(favbetBannerCloseBtn, async () => {
  //   await popupHandler.performClick(favbetBannerCloseBtn, 'Favbet Banner Close');
  // });

  // await page.addLocatorHandler(termsAndConditionsAcceptBtn, async () => {
  //   await popupHandler.performClick(termsAndConditionsAcceptBtn, 'Accept Terms & Conditions');
  // });

  // await page.addLocatorHandler(notificationBannerCloseBtn, async () => {
  //   await popupHandler.performClick(notificationBannerCloseBtn, 'Notification Banner Close');
  // });

  // await page.addLocatorHandler(maintenanceNotificationCloseBtn, async () => {
  //   await popupHandler.performClick(maintenanceNotificationCloseBtn, 'Maintenance Notification Close');
  // });

  // await page.addLocatorHandler(notificationPopupCloseBtn, async () => {
  //   await popupHandler.performClick(notificationPopupCloseBtn, 'Notification Popup Close');
  // });

  // await page.addLocatorHandler(
  //   verificationIconBtn,
  //   async () => {
  //     await popupHandler.performClick(verificationIconBtn, 'Non-Verified Notification');
  //   },
  //   { times: 1, noWaitAfter: true },
  // );

  // await page.addLocatorHandler(ludomanNotificationIcon, async () => {
  //   await popupHandler.performClick(ludomanNotificationIcon, 'Ludoman Notification');
  // });

  // await page.addLocatorHandler(updatesPopupCloseBtn, async () => {
  //   await popupHandler.performClick(updatesPopupCloseBtn, 'Updates Popup Close');
  // });

  // await page.addLocatorHandler(ludomanNotificationCloseBtn, async () => {
  //   await popupHandler.performClick(ludomanNotificationCloseBtn, 'Ludoman Notification Close');
  // });

  // await page.addLocatorHandler(randomGamePopupCloseBtn, async () => {
  //   await popupHandler.performClick(randomGamePopupCloseBtn, 'Random Game Popup Close');
  // });

  // add handler for our sale event banner; click the internal action button if available
  await page.addLocatorHandler(saleBanner, async () => {
    const actionBtn = saleBanner.locator(".sale-banner-action");
    if (await actionBtn.count()) {
      await popupHandler.performClick(actionBtn, "Sale Banner Action");
    } else {
      await popupHandler.performClick(saleBanner, "Sale Banner");
    }
  });
}

export async function setupSkeletonLoaderHandlersHook(page: Page) {
  const firstSkeleton = page.locator('[data-role="game-skelet-block"]').first();

  await page.addLocatorHandler(firstSkeleton, async () => {
    const startTime = Date.now();

    try {
      await firstSkeleton.waitFor({ state: "hidden", timeout: 40_000 });
      const duration = Date.now() - startTime;
      log.info(
        `[SkeletonLoaderHandler]: Skeleton hidden successfully (took ${duration}ms)`,
      );
    } catch {
      const duration = Date.now() - startTime;
      throw new Error(
        `[SkeletonLoaderHandler]: Skeleton did not disappear within 40s (elapsed ${duration}ms)`,
      );
    }
  });
}
