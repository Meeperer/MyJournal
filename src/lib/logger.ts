/**
 * Thin structured logger: levels and optional request ID for tracing.
 * In production, set LOG_LEVEL (debug | info | warn | error). Default: info.
 * Use meta.requestId in API routes for tracing.
 */

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 } as const;
type Level = keyof typeof LEVELS;

function currentLevel(): Level {
  const env = process.env.LOG_LEVEL?.toLowerCase();
  if (env && env in LEVELS) return env as Level;
  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

const levelNum = (): number => LEVELS[currentLevel()];

function shouldLog(level: Level): boolean {
  return levelNum() <= LEVELS[level];
}

export type LogMeta = Record<string, unknown> & { requestId?: string };

function formatMessage(level: Level, message: string, meta?: LogMeta): string {
  if (process.env.NODE_ENV === "production") {
    return JSON.stringify({
      level,
      message,
      ...(meta && Object.keys(meta).length > 0 ? meta : {}),
      timestamp: new Date().toISOString(),
    });
  }
  const prefix = meta?.requestId ? `[${meta.requestId}] ` : "";
  const metaStr = meta && Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : "";
  return `${prefix}[${level}] ${message}${metaStr}`;
}

export const logger = {
  debug(message: string, meta?: LogMeta): void {
    if (shouldLog("debug")) console.debug(formatMessage("debug", message, meta));
  },
  info(message: string, meta?: LogMeta): void {
    if (shouldLog("info")) console.info(formatMessage("info", message, meta));
  },
  warn(message: string, meta?: LogMeta): void {
    if (shouldLog("warn")) console.warn(formatMessage("warn", message, meta));
  },
  error(message: string, meta?: LogMeta): void {
    if (shouldLog("error")) console.error(formatMessage("error", message, meta));
  },
};
