import { ReadStream } from "fs";

export type LogMode = "global" | "hide" | "short" | "req";

export type RequestOptions = {
  data?: string | Buffer | any;
  failOnStatusCode?: boolean;
  form?: { [key: string]: string | number | boolean };
  headers?: { [key: string]: string };
  ignoreHTTPSErrors?: boolean;
  maxRedirects?: number;
  multipart?: {
    [key: string]:
      | string
      | number
      | boolean
      | ReadStream
      | {
          name: string;
          mimeType: string;
          buffer: Buffer;
        };
  };
  params?: { [key: string]: string | number | boolean };
  timeout?: number;
  /**
   * 'global' - log according to the .env.log (default),
   * 'hide' - do not log request/response info,
   * 'short' - log only url, method and status code.
   * 'req' - 'short' + request data.
   */
  logMode?: LogMode;
};
