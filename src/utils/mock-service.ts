import { Route, Page, Request } from "@playwright/test";
import { MockRulesLogger } from "./mock-logger.js";
import { log } from "./logger.js";
import { step } from "./decorators/index.js";

export type MockRule = {
  id?: string;
  description?: string;
  condition: (url: string, request: Request) => boolean;
  action: (route: Route) => Promise<void>;
  priority?: number;
};

export class MockService {
  private rules: MockRule[] = [];
  private isActive = false;
  private logger: MockRulesLogger | null = null;

  constructor(private page: Page, private baseURL: string) {
    this.initializeRoute();
  }

  private initializeRoute() {
    this.page.route(new RegExp(this.baseURL), async (route) => {
      await this.handleRoute(route);
    });
    this.isActive = true;
  }

  private async handleRoute(route: Route) {
    const url = route.request().url();
    const request = route.request();
    
    const sortedRules = [...this.rules].sort(
      (a, b) => (b.priority || 0) - (a.priority || 0)
    );

    for (const rule of sortedRules) {
      if (!rule.condition(url, request)) {
        continue;
      }

      try {
        if (this.logger) {
          this.logger.markRuleUsed(this.rules.indexOf(rule), url);
        }
        await rule.action(route);
        return;
      } catch (error) {
        log.error(
          `[MockService] Error in rule: ${rule.description || rule.id}`,
          error
        );
        continue;
      }
    }

    await route.continue();
  }

  private updateLogger() {
    this.logger = new MockRulesLogger(this.rules as any);
  }

  addRule(rule: MockRule) {
    this.rules.push(rule);
    this.updateLogger();
  }

  addRules(rules: MockRule[]) {
    this.rules.push(...rules);
    this.updateLogger();
  }

  removeRule(identifier: string) {
    this.rules = this.rules.filter(
      (r) => r.id !== identifier && r.description !== identifier
    );
    this.updateLogger();
  }

  clearRules() {
    this.rules = [];
    this.logger = null;
  }

  getRules(): MockRule[] {
    return [...this.rules];
  }

  @step("Apply mock rules")
  async applyMocks() {
    if (!this.isActive) {
      this.initializeRoute();
    }
  }

  async stopMocks() {
    await this.page.unroute(new RegExp(this.baseURL));
    this.isActive = false;
  }

  isRouteActive(): boolean {
    return this.isActive;
  }

  async generateAndAttachReport() {
    if (this.rules.length > 0 && this.logger) {
      await this.logger.attachToTest();
    }
  }
}