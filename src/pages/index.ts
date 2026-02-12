import { Page } from "@playwright/test";
import { LoginPage } from "./LoginPage.js";

export class Pages {
  readonly loginPage = new LoginPage(this.page, "");

  constructor(protected page: Page) {}
}
