import { test } from '@playwright/test';

export class MockRulesLogger {
  private ruleUsage = new Map<number, { used: boolean; description: string; urlPattern: string; urls: Set<string> }>();
  private rules: Array<{ condition: (url: string) => boolean; description?: string }>;

  constructor(rules: Array<{ condition: (url: string) => boolean; description?: string }>) {
    this.rules = rules;
    this.initializeTracking();
  }

  private initializeTracking() {
    this.rules.forEach((rule, index) => {
      this.ruleUsage.set(index, {
        used: false,
        description: rule.description || `Custom rule #${index}`,
        urlPattern: this.extractUrlPattern(rule.condition, index),
        urls: new Set<string>(),
      });
    });
  }

  private extractUrlPattern(condition: (url: string) => boolean, index: number): string {
    if (condition && typeof condition === 'function') {
      const fnStr = condition.toString();
      const match = fnStr.match(/=>\s*(.*)/);
      if (match && match[1]) {
        return match[1].replace(/\s*{.*}/, '').trim();
      }
      return fnStr;
    }
    return `Custom condition #${index}`;
  }

  markRuleUsed(index: number, url: string) {
    const usage = this.ruleUsage.get(index);
    if (usage) {
      usage.used = true;
      usage.urls.add(url);
    }
  }

  getUnusedRules(): string[] {
    const unused: string[] = [];
    this.ruleUsage.forEach((usage, index) => {
      if (!usage.used) {
        unused.push(`[Rule ${index}] ${usage.description}\n  Pattern: ${usage.urlPattern}\n`);
      }
    });
    return unused;
  }

  getUsedRules(): string[] {
    const used: string[] = [];
    this.ruleUsage.forEach((usage, index) => {
      if (usage.used) {
        const urlList = Array.from(usage.urls).join('\n    - ');
        used.push(`[Rule ${index}] ${usage.description}\n  Pattern: ${usage.urlPattern}\n  Matched URLs:\n    - ${urlList}\n`);
      }
    });
    return used;
  }

  getUsageStats() {
    let usedCount = 0;
    this.ruleUsage.forEach((usage) => {
      if (usage.used) usedCount++;
    });

    return {
      total: this.rules.length,
      used: usedCount,
      unused: this.rules.length - usedCount,
      tracking: true,
    };
  }

  getDetailedReport(): {
    summary: { total: number; used: number; unused: number };
    usedRules: Array<{ index: number; description: string; urlPattern: string; matchedUrls: string[] }>;
    unusedRules: Array<{ index: number; description: string; urlPattern: string }>;
  } {
    const usedRules: Array<{ index: number; description: string; urlPattern: string; matchedUrls: string[] }> = [];
    const unusedRules: Array<{ index: number; description: string; urlPattern: string }> = [];

    this.ruleUsage.forEach((usage, index) => {
      if (usage.used) {
        usedRules.push({
          index,
          description: usage.description,
          urlPattern: usage.urlPattern,
          matchedUrls: Array.from(usage.urls),
        });
      } else {
        unusedRules.push({
          index,
          description: usage.description,
          urlPattern: usage.urlPattern,
        });
      }
    });

    return {
      summary: this.getUsageStats(),
      usedRules,
      unusedRules,
    };
  }

  async attachToTest() {
    const testInfo = test.info();
    const report = this.getDetailedReport();
    const sections: string[] = [];

    // Summary section (always included)
    sections.push('=== MOCK RULES SUMMARY ===');
    sections.push(`Total Rules: ${report.summary.total}`);
    sections.push(`Used: ${report.summary.used}`);
    sections.push(`Unused: ${report.summary.unused}`);
    sections.push('');

    // Unused rules section
    sections.push('=== UNUSED MOCK RULES ===');
    if (report.unusedRules.length > 0) {
      const unusedContent = report.unusedRules
        .map((rule) => `[Rule ${rule.index}] ${rule.description}\n  Pattern: ${rule.urlPattern}`)
        .join('\n\n');
      sections.push(unusedContent);
    } else {
      sections.push('No unused rules');
    }
    sections.push('');

    // Used rules section
    sections.push('=== USED MOCK RULES ===');
    if (report.usedRules.length > 0) {
      const usedContent = report.usedRules
        .map((rule) => {
          const urls = rule.matchedUrls.join('\n    - ');
          return `[Rule ${rule.index}] ${rule.description}\n  Pattern: ${rule.urlPattern}\n  Matched URLs:\n    - ${urls}`;
        })
        .join('\n\n');
      sections.push(usedContent);
    } else {
      sections.push('No used rules');
    }

    await testInfo.attach('mock-rules-report', {
      body: sections.join('\n'),
      contentType: 'text/plain',
    });
  }
}
