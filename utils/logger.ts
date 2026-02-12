import { Logger as TsLogger } from 'tslog';

enum LogLevel {
  SILLY = 0,
  TRACE = 1,
  DEBUG = 2,
  INFO = 3,
  WARN = 4,
  ERROR = 5,
  FATAL = 6,
}

const logDateTime = !process.env.LOGGER_DISABLE_DATETIME;
const time = logDateTime ? '{{dateIsoStr}} ' : '';
const logFileName = !process.env.LOGGER_DISABLE_FILENAME;
const file = logFileName ? ' [{{filePathWithLine}}{{name}}]' : '';

export const log = new TsLogger({
  prettyLogTemplate: `\n{{logLevelName}}\t${time}${file}\n`,
  prettyErrorTemplate: '\n{{errorName}} {{errorMessage}}\nerror stack:\n{{errorStack}}',
  prettyErrorStackTemplate: '\n  • {{fileName}}\t{{method}}\n\t{{filePathWithLine}}',
  prettyErrorParentNamesSeparator: ':',
  prettyErrorLoggerNameDelimiter: '\t',
  stylePrettyLogs: true,
  prettyLogTimeZone: 'local',
  prettyLogStyles: {
    logLevelName: {
      '*': ['bold', 'black', 'bgWhiteBright', 'dim'],
      SILLY: ['bold', 'bgWhite'],
      TRACE: ['bold', 'bgWhiteBright'],
      DEBUG: ['bold', 'bgBlue'],
      INFO: ['bold', 'bgGreen'],
      WARN: ['bold', 'bgYellow'],
      ERROR: ['bold', 'bgRedBright'],
      FATAL: ['bold', 'redBright'],
    },
    dateIsoStr: ['white', 'dim'],
    errorName: ['bold', 'bgRedBright', 'whiteBright'],
    fileName: ['yellow'],
    filePathWithLine: ['white', 'dim'],
    name: ['white', 'bold'],
    nameWithDelimiterPrefix: ['white', 'bold'],
    nameWithDelimiterSuffix: ['white', 'bold'],
  },
  minLevel: LogLevel[(process.env.LOG_LEVEL as keyof typeof LogLevel) || 'INFO'],
});
