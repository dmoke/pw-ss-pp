import { APIRequestContext, APIResponse, Cookie } from "@playwright/test";
import { XMLParser } from "fast-xml-parser";
import { RequestOptions } from "@src/types/api.js";
import { Methods } from "./methods.enum.js";
import { log } from "@src/utils/logger.js";
import { APILogger, getTestExecutionFilePath } from "./APILogger.js";

export interface ApiParsedResponse<T> {
  body: T;
  status: number;
  originalResponse: APIResponse;
}

export class APIManager {
  constructor(private request: APIRequestContext) {}

  //eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async post<T = any>(url: string, options?: RequestOptions) {
    return this.sendRequest<T>({
      url,
      method: Methods.POST,
      executionPath: getTestExecutionFilePath(),
      options,
    });
  }

  //eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async get<T = any>(url: string, options?: RequestOptions) {
    return this.sendRequest<T>({
      url,
      method: Methods.GET,
      executionPath: getTestExecutionFilePath(),
      options,
    });
  }

  //eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async put<T = any>(url: string, options?: RequestOptions) {
    return this.sendRequest<T>({
      url,
      method: Methods.PUT,
      executionPath: getTestExecutionFilePath(),
      options,
    });
  }

  //eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async delete<T = any>(url: string, options?: RequestOptions) {
    return this.sendRequest<T>({
      url,
      method: Methods.DELETE,
      executionPath: getTestExecutionFilePath(),
      options,
    });
  }

  //eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async fetch<T = any>(url: string, options?: RequestOptions) {
    return this.sendRequest<T>({
      url,
      method: Methods.FETCH,
      executionPath: getTestExecutionFilePath(),
      options,
    });
  }

  //eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async head<T = any>(url: string, options?: RequestOptions) {
    return this.sendRequest<T>({
      url,
      method: Methods.HEAD,
      executionPath: getTestExecutionFilePath(),
      options,
    });
  }

  //eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async patch<T = any>(url: string, options?: RequestOptions) {
    return this.sendRequest<T>({
      url,
      method: Methods.PATCH,
      executionPath: getTestExecutionFilePath(),
      options,
    });
  }

  public async storageState(options?: { path?: string }): Promise<{
    cookies: Cookie[];
    origins: {
      origin: string;
      localStorage: { name: string; value: string }[];
    }[];
  }> {
    return await this.request.storageState(options);
  }

  public async dispose(): Promise<void> {
    return await this.request.dispose();
  }

  [Symbol.asyncDispose](): Promise<void> {
    return this.dispose();
  }

  /**
   * Parses the API response and returns an ApiParsedResponse object.
   * @param response The API response to parse.
   * @returns A Promise that resolves to an ApiParsedResponse object.
   */
  private async parseResponse<T>(
    response: APIResponse,
  ): Promise<ApiParsedResponse<T>> {
    let responseBody;
    const responseContentType = response.headers()["content-type"];

    try {
      if (
        responseContentType?.includes &&
        (responseContentType.includes("application/xml") ||
          responseContentType.includes("text/xml"))
      ) {
        responseBody = new XMLParser({ ignoreAttributes: false }).parse(
          await response.text(),
        );
      } else {
        responseBody = await response.json();
      }
    } catch (error) {
      responseBody = await response.text();
    }

    const apiResponse: ApiParsedResponse<T> = {
      status: response.status(),
      body: responseBody,
      originalResponse: response,
    };

    return apiResponse;
  }

  private async sendRequest<T>({
    url,
    method,
    executionPath,
    options,
  }: {
    url: string;
    method: Methods;
    executionPath: string | undefined;
    options?: RequestOptions;
  }) {
    let response: APIResponse | undefined;

    const storageStateOnRequest = await this.request.storageState();
    const startTime = Date.now();

    try {
      response = await this.request[method](url, options);
      return await this.parseResponse<T>(response);
    } catch (e) {
      log.error(e);
      throw e;
    } finally {
      const endTime = Date.now();
      const duration = endTime - startTime;
      await APILogger.logRequestResponseInfo({
        url,
        method: method.toUpperCase(),
        request: this.request,
        response,
        options,
        executionPath,
        storageStateOnRequest,
        duration,
      });
    }
  }
}
