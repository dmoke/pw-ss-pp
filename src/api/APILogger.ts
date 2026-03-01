import { APIRequestContext, APIResponse, Cookie } from "@playwright/test";
import { RequestOptions } from "@src/types/api.js";
import chalk from "chalk";
import dotenv from "dotenv";
import moment from "moment";
import prettyMilliseconds from "pretty-ms";
import { formatXML } from "./XMLTools.js";

type StorageState = {
  cookies: Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
    expires: number;
    httpOnly: boolean;
    secure: boolean;
    sameSite: "Strict" | "Lax" | "None";
  }>;
  origins: Array<{
    origin: string;
    localStorage: Array<{
      name: string;
      value: string;
    }>;
  }>;
};

const { log } = console;
const envVariables = dotenv.config({ path: ".env.log" });

const apiLoggerVariables = {
  fullResponseBody: envVariables?.parsed?.LOG_FULL_RESPONSE_BODY,
  hideAll: envVariables?.parsed?.LOG_HIDE_ALL,
  logPretty: envVariables?.parsed?.LOG_PRETTY,
  requestBody: envVariables?.parsed?.LOG_REQUEST_BODY,
  requestHeaders: envVariables?.parsed?.LOG_REQUEST_HEADERS,
  requestParams: envVariables?.parsed?.LOG_REQUEST_PARAMS,
  responseBody: envVariables.parsed?.LOG_RESPONSE_BODY,
  responseHeaders: envVariables?.parsed?.LOG_RESPONSE_HEADERS,
  logFullDateTime: envVariables?.parsed?.LOG_FULL_DATETIME,
  logFullURL: envVariables?.parsed?.LOG_FULL_URL,
  logSpecificHeadersRequest: envVariables?.parsed?.LOG_SPECIFIC_HEADERS_REQUEST,
  logSpecificHeadersResponse:
    envVariables?.parsed?.LOG_SPECIFIC_HEADERS_RESPONSE,
  highLatencyThreshold:
    Number(envVariables?.parsed?.LOG_HIGH_LATENCY_RESPONSE_THRESHOLD) || 5000,
};

export const getTestExecutionFilePath = () => {
  const stack = new Error().stack?.split("\n") || [];
  const apiCallExecutingFilePath = stack.find((x) => x.includes(".ts"));
  const testPath = stack.find((x) => x.includes(".test.ts"));
  let executionPath = "";
  if (apiCallExecutingFilePath) {
    executionPath = apiCallExecutingFilePath
      ?.substring(apiCallExecutingFilePath.lastIndexOf("/") + 1)
      .replace(")", "");
  }
  if (testPath) {
    executionPath += " " + testPath?.substring(testPath.lastIndexOf("/") + 1); // todo: remove )
  }
  return executionPath || undefined;
};

const getLogDateTime = () => {
  const dateTimeFormat = apiLoggerVariables.logFullDateTime
    ? "YYYY-MM-DD HH:mm:ss"
    : "HH:mm:ss";
  return chalk(`[${moment().format(dateTimeFormat)}]`);
};

interface IApiLoggerParams {
  url: string;
  method: string;
  request?: APIRequestContext;
  response?: APIResponse;
  options?: RequestOptions;
  error?: unknown;
  executionPath: string | undefined;
  storageStateOnRequest: StorageState;
  duration: number;
}

/**
 * Class for adding static methods for log specific information about test run
 */
export class APILogger {
  public static async logRequestResponseInfo({
    method,
    url,
    options,
    response,
    error,
    executionPath,
    storageStateOnRequest,
    duration,
  }: IApiLoggerParams) {
    if ((apiLoggerVariables.hideAll || options?.logMode === "hide") && !error) {
      return;
    }

    const requestMethodColored = chalk.bold.yellow(method);

    const urls = {
      request: {
        // could be without protocol/hostname
        basic: url,
        full: url,
      },
      response: {
        basic: response?.url(),
        full: response?.url(),
      },
    };

    const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL;
    // in case url is just a path without protocol/hostname, trying to add it
    if (baseURL) {
      if (!urls.request.basic.startsWith("http")) {
        urls.request.full = baseURL + url;
      }
      if (!urls.response.basic?.startsWith("http")) {
        urls.response.full = baseURL + urls.response.basic;
      }
    }

    // in case of no response (request failed)
    if (!urls.response.basic) urls.response.basic = urls.request.basic;
    if (!urls.response.full) urls.response.full = urls.request.full;

    const isRedirectOccured = !urls.response.full.endsWith(urls.request.full);

    const requestUrlToShow = apiLoggerVariables.logFullURL
      ? urls.request.full
      : urls.request.basic;
    const responseUrlToShow = apiLoggerVariables.logFullURL
      ? urls.response.full
      : urls.response.basic;
    const urlColored = chalk.blue(
      isRedirectOccured
        ? requestUrlToShow + " > " + responseUrlToShow
        : responseUrlToShow,
    );

    let requestCombinedLog = `\n${getLogDateTime()} 🌐 ${requestMethodColored} ${urlColored}`;
    if (response) requestCombinedLog += ` ${this.status(response)}`;
    requestCombinedLog +=
      duration > apiLoggerVariables.highLatencyThreshold
        ? chalk.yellow(` (${prettyMilliseconds(duration)})`)
        : chalk.gray(` (${prettyMilliseconds(duration)})`);

    if (executionPath) {
      const colorExecutionPath = chalk.gray(executionPath);
      requestCombinedLog += `  [${colorExecutionPath}]`;
    }

    // Log only url and status in case of exception
    if (options?.logMode === "short") {
      log(requestCombinedLog);
      return;
    }

    if (apiLoggerVariables.requestParams && options?.params) {
      const requestParams = JSON.stringify(
        options?.params,
        null,
        apiLoggerVariables.logPretty ? 2 : 0,
      );
      const colorRequestParams = chalk.gray(
        `  ${chalk.gray.bold("↑REQUEST PARAMS:")} ${chalk.gray(requestParams)}`,
      );

      requestCombinedLog += `\n${colorRequestParams}`;
    }

    if (apiLoggerVariables.requestHeaders) {
      storageStateOnRequest;
      const headers = { ...storageStateOnRequest, ...options?.headers };
      const requestHeaders = JSON.stringify(
        headers,
        null,
        apiLoggerVariables.logPretty ? 2 : 0,
      );

      const requestHeadersAreEmpty =
        requestHeaders === "{}" || !doesHeadersHaveAnyNonEmptyKeys(headers);
      const requestHeadersTitle = requestHeadersAreEmpty
        ? chalk.strikethrough("REQUEST HEADERS")
        : "REQUEST HEADERS: ";

      if (!requestHeadersAreEmpty) {
        const colorRequestHeaders = chalk.gray(
          `  ${chalk.gray.bold(`↑${requestHeadersTitle}`)} ${chalk.gray(requestHeaders)}`,
        );

        requestCombinedLog += `\n${colorRequestHeaders}`;
      }
    } else if (apiLoggerVariables.logSpecificHeadersRequest) {
      const keysToLog = apiLoggerVariables.logSpecificHeadersRequest.split(",");
      const rawHeaders = { ...storageStateOnRequest, ...options?.headers };
      const headers = Object.fromEntries(
        Object.entries(rawHeaders).filter((header) =>
          keysToLog.includes(header[0]),
        ),
      );

      const headersAsString = JSON.stringify(
        headers,
        null,
        apiLoggerVariables.logPretty ? 2 : 0,
      );
      const requestHeadersAreEmpty =
        headersAsString === "{}" || !doesHeadersHaveAnyNonEmptyKeys(rawHeaders);

      if (!requestHeadersAreEmpty) {
        const requestHeadersTitle = "REQUEST HEADERS: ";

        const colorRequestHeaders = chalk.gray(
          ` ${chalk.gray.bold(`↑${requestHeadersTitle}`)} ${chalk.gray(headersAsString)} ...(other headers are hidden)`,
        );

        requestCombinedLog += `\n${colorRequestHeaders}`;
      }
    }

    if (options?.form && apiLoggerVariables.requestBody) {
      const colorRequestFormTitle = `  ${chalk.gray.bold("↑REQUEST FORM: ")}`;

      const colorRequestForm = `${colorRequestFormTitle}${chalk.gray(
        JSON.stringify(
          options?.form,
          null,
          apiLoggerVariables.logPretty ? 2 : 0,
        ),
      )}`;

      requestCombinedLog = `${requestCombinedLog}\n${colorRequestForm}`;
    }

    if (apiLoggerVariables.requestBody) {
      const requestBodyTitle = options?.data
        ? "REQUEST BODY: "
        : chalk.strikethrough("REQUEST BODY");

      let colorRequestBody = `  ${chalk.gray.bold(`↑${requestBodyTitle}`)}`;
      if (options?.data)
        colorRequestBody += `${chalk.gray(JSON.stringify(options?.data, null, apiLoggerVariables.logPretty ? 2 : 0))}`;

      requestCombinedLog = `${requestCombinedLog}\n${colorRequestBody}`;
      // Log only request in case of error
      if (error) {
        log(requestCombinedLog);
        return;
      }
    }

    if (options?.logMode === "req") {
      log(requestCombinedLog);
      return;
    }

    // Log Response if it exists
    if (response) {
      let responseCombinedLog = "";
      if (apiLoggerVariables.responseHeaders || apiLoggerVariables.responseBody)
        responseCombinedLog += chalk.grey.bold(`  ${"- ".repeat(33)}`);

      const responseHeaders = response?.headers();
      if (responseHeaders) {
        if (apiLoggerVariables.responseHeaders) {
          const responseHeadersAsString = JSON.stringify(
            responseHeaders,
            null,
            apiLoggerVariables.logPretty ? 2 : 0,
          );

          const colorResponseHeaders = `  ${chalk.gray.bold("↓RESPONSE HEADERS:")} ${chalk.gray(
            responseHeadersAsString,
          )}`;

          responseCombinedLog += `\n${colorResponseHeaders}`;
        } else if (apiLoggerVariables.logSpecificHeadersResponse) {
          const keysToLog =
            apiLoggerVariables.logSpecificHeadersResponse.split(",");

          const headers = Object.fromEntries(
            Object.entries(responseHeaders).filter((header) =>
              keysToLog.includes(header[0]),
            ),
          );

          if (!(Object.keys(headers).length === 0)) {
            const colorResponseHeaders = chalk.gray(
              ` ${chalk.gray.bold(`↓${"RESPONSE HEADERS: "}`)} ${chalk.gray(
                JSON.stringify(
                  headers,
                  null,
                  apiLoggerVariables.logPretty ? 2 : 0,
                ),
              )} ...(other headers are hidden)`,
            );

            responseCombinedLog += `\n${colorResponseHeaders}`;
          }
        }
      }

      if (apiLoggerVariables.responseBody) {
        const responseBody = await this.responseBody(response);
        const responseBodyTitle = responseBody
          ? "RESPONSE BODY: "
          : chalk.strikethrough("RESPONSE BODY");

        let coloredResponseBody = `\n  ${chalk.gray.bold(`↓${responseBodyTitle}`)}`;
        if (responseBody) {
          coloredResponseBody += `${chalk.gray(
            typeof responseBody === "string"
              ? responseBody
              : JSON.stringify(
                  responseBody,
                  null,
                  apiLoggerVariables.logPretty ? 2 : 0,
                ),
          )}`;
        }

        if (coloredResponseBody.length > 1000)
          coloredResponseBody = this.cutResponseBody(
            coloredResponseBody,
            response,
          );

        responseCombinedLog += coloredResponseBody;
      }
      log(`${requestCombinedLog}\n${responseCombinedLog}`);
    }
  }

  static isSuccess(response: APIResponse) {
    return response.ok();
  }

  public static status(response: APIResponse) {
    const status = `${response.status()} ${response.statusText()}`;
    return this.isSuccess(response) ? chalk.green(status) : chalk.red(status);
  }

  public static async responseBody(
    response: APIResponse,
  ): Promise<string | object | undefined> {
    const responseBody = await this.getResponseContent(response);

    if (typeof responseBody === "string") {
      if (/^<html|^<!DOCTYPE/.test(responseBody))
        return `HTML >>> ${responseBody}`;
      if (responseBody.startsWith("<?xml")) return formatXML(responseBody);
    }

    return responseBody;
  }

  private static cutResponseBody(responseBody: string, response: APIResponse) {
    if (apiLoggerVariables.fullResponseBody === "failsOnly") {
      // Show full body for failed responses, cut for successful ones
      if (this.isSuccess(response))
        return (
          responseBody.slice(0, 1000) + chalk.white(" <<< printed partly ")
        );
      return responseBody;
    } else if (!apiLoggerVariables.fullResponseBody) {
      // If not set, cut all response bodies
      return responseBody.slice(0, 1000) + chalk.white(" <<< printed partly ");
    } else {
      // If set to any other truthy value, don't cut any response bodies
      return responseBody;
    }
  }

  public static async requestHeaders(
    request: APIRequestContext,
    options?: RequestOptions,
  ) {
    const headers = options?.headers ?? {};
    headers.Cookie =
      headers.Cookie +
      "; " +
      (await request.storageState()).cookies
        .map((cookie: Cookie) => `${cookie.name}=${cookie.value}`)
        .join("; ");
    return headers;
  }

  public static async responseHeaders(response: APIResponse) {
    const headers = response.headers();
    return headers;
  }

  private static async getResponseContent(response: APIResponse) {
    try {
      return await response.json();
    } catch (e) {
      return await response.text();
    }
  }
}

function doesHeadersHaveAnyNonEmptyKeys(headers: StorageState) {
  // these keys are always present but could be empty
  if (headers.cookies.length > 0 || headers.origins.length > 0) return true;

  // check if any other keys are present
  for (const key in headers) {
    if (key !== "cookies" && key !== "origins") {
      return true;
    }
  }
  return false;
}
