import { defineConfig, devices, ReporterDescription } from "@playwright/test";
import dotenv from "dotenv";

if (!process.env.CI) dotenv.config({ path: ".env", override: true });

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 5, // One worker per test account
  reporter: [
    ["html", { open: "never", outputFolder: "pw-report-html" }],
    [
      "junit",
      { outputFile: "report/generatedReports/desktop/combined-desktop.xml" },
    ],
    ["json", { outputFile: "pw-report-json/results.json" }],
    ...(process.env.CI
      ? [["blob", { outputDir: "blob-report" }] as ReporterDescription]
      : []),
  ],
  timeout: 60 * 10 * 1_000 /* 10 min */,
  use: {
    baseURL: process.env.WEB_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    headless: process.env.HEADLESS === "true",
    actionTimeout: 25_000,
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: "node server.js",
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
});

// import { ReporterDescription, defineConfig, devices } from '@playwright/test';
// import { ENVS } from '@src/utils/envs.enum.js';
// import dotenv from 'dotenv';

// if (!process.env.CI) dotenv.config({ path: '.env' });

// dotenv.config({ path: `./config_env/${process.env.ENVIRONMENT || ENVS.PREV_PROD_DE1}.env` });

// const config = defineConfig({
//   globalSetup: 'hooks/global/setup.global.ts',
//   use: {
//     timezoneId: 'Etc/UTC',
//     headless: !process.env.HEADLESS,
//     screenshot: 'only-on-failure',
//     baseURL: process.env.WEB_URL,
//     trace: process.env.CI ? 'off' : 'retain-on-failure',
//     actionTimeout: 25_000,
//   },

//   testDir: 'tests',
//   timeout: 60 * 10 * 1_000 /* 10 min */,
//   fullyParallel: false,
//   forbidOnly: false,
//   snapshotPathTemplate: '{testDir}/{testFilePath}-snapshots/{arg}-{projectName}{ext}',
//   retries: process.env.CI ? 1 : 0,
//   reportSlowTests: null,
//   workers: process.env.CI ? 2 : 4,
//   projects: [
//     {
//       name: 'FE Desktop',
//       testDir: 'tests/desktop',
//       testMatch: process.env.TEST_MATCH || 'tests/desktop/**/*.test.ts',
//       testIgnore: '**/experimental/**',
//       use: {
//         actionTimeout
//         ...devices['Desktop Chrome'],
//         viewport: { width: 1280, height: 720 },
//       },
//     },
//     {
//       name: 'FE mobile',
//       testDir: 'tests/mobile',
//       testMatch: process.env.TEST_MATCH || 'tests/mobile/**/*.test.ts',
//       testIgnore: '**/experimental/**',
//       use: {
//         ...devices['iPhone SE'],
//         viewport: { width: 375, height: 667 },
//       },
//     },
//     {
//       name: 'FE mobile - Pixel 5',
//       testDir: 'tests/mobile',
//       testMatch: process.env.TEST_MATCH || 'tests/mobile/**/*.test.ts',
//       testIgnore: '**/experimental/**',
//       use: {
//         ...devices['Pixel 5'],
//         viewport: { width: 393, height: 851 },
//       },
//     },
//     {
//       name: 'FE mobile - Galaxy S21',
//       testDir: 'tests/mobile',
//       testMatch: process.env.TEST_MATCH || 'tests/mobile/**/*.test.ts',
//       testIgnore: '**/experimental/**',
//       use: {
//         ...devices['Galaxy S21'],
//         viewport: { width: 360, height: 800 },
//       },
//     },
//   ],
//   reporter: [
//     ['html', { open: 'never', outputFolder: 'pw-report-html' }],
//     ['junit', { outputFile: 'report/generatedReports/desktop/combined-desktop.xml' }],
//     ['json', { outputFile: 'pw-report-json/results.json' }],
//     ...(process.env.CI ? [['blob', { outputDir: 'blob-report' }] as ReporterDescription] : []),
//   ],
// });

// if (process.env.LIST_REPORTER) {
//   (config.reporter as ReporterDescription[]).push(['list']);
// }

// if (process.env.CI) {
//   config['metadata'] = {
//     'revision.id': process.env.CI_COMMIT_SHA || 'unknown',
//     'revision.author': process.env.GITLAB_USER_NAME || 'unknown',
//     'revision.email': process.env.GITLAB_USER_EMAIL || 'unknown',
//     'revision.subject': `${process.env.ENVIRONMENT} - ${process.env.SERVICE}`,
//     'revision.timestamp': Date.now(),
//     'revision.link': process.env.CI_MERGE_REQUEST_SOURCE_BRANCH_SHA
//       ? `${process.env.CI_PROJECT_URL}/-/merge_requests/${process.env.CI_MERGE_REQUEST_IID}`
//       : `${process.env.CI_PROJECT_URL}/commit/${process.env.CI_COMMIT_SHA}`,
//     'ci.link': `${process.env.CI_PROJECT_URL}/-/pipelines/${process.env.CI_PIPELINE_ID}`,
//     timestamp: Date.now(),
//   };
// }

// export default config;
