import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { env } from '../config/env.js';

const REQUIRED_DIRECTORIES = [
  env.storageRoot,
  path.join(env.storageRoot, 'config'),
  path.join(env.storageRoot, 'raw'),
  path.join(env.storageRoot, 'markdown'),
  path.join(env.storageRoot, 'markdown', 'approved'),
  path.join(env.storageRoot, 'markdown', 'parsed'),
  path.join(env.storageRoot, 'exports'),
  path.join(env.storageRoot, 'logs')
];

export function ensureStorageLayout() {
  for (const dir of REQUIRED_DIRECTORIES) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  return {
    root: env.storageRoot,
    directories: REQUIRED_DIRECTORIES
  };
}

export function getStorageLayoutStatus() {
  return {
    root: env.storageRoot,
    directories: REQUIRED_DIRECTORIES.map((dir) => ({
      path: dir,
      exists: existsSync(dir)
    }))
  };
}
