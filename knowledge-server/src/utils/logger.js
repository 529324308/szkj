import { appendFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { env } from '../config/env.js';

const LOG_LEVEL_ORDER = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

const logsDir = path.join(env.storageRoot, 'logs');
const appLogFile = path.join(logsDir, 'app.log');

function ensureLogDirectory() {
  if (!existsSync(logsDir)) {
    mkdirSync(logsDir, { recursive: true });
  }
}

function shouldLog(level) {
  const configured = LOG_LEVEL_ORDER[env.logLevel] ?? LOG_LEVEL_ORDER.info;
  const current = LOG_LEVEL_ORDER[level] ?? LOG_LEVEL_ORDER.info;
  return current >= configured;
}

function write(level, message, extra) {
  if (!shouldLog(level)) {
    return;
  }

  ensureLogDirectory();
  const timestamp = new Date().toISOString();
  const suffix = extra ? ` ${JSON.stringify(extra)}` : '';
  const line = `[${timestamp}] [${level.toUpperCase()}] ${message}${suffix}`;

  console.log(line);

  try {
    appendFileSync(appLogFile, `${line}\n`, 'utf8');
  } catch (error) {
    console.error('[LOGGER] failed to write log file:', error);
  }
}

export const logger = {
  debug(message, extra) {
    write('debug', message, extra);
  },
  info(message, extra) {
    write('info', message, extra);
  },
  warn(message, extra) {
    write('warn', message, extra);
  },
  error(message, extra) {
    write('error', message, extra);
  }
};
