/*
 * @Author: 喜闻乐见 529324308@qq.com
 * @Date: 2024-12-16 11:27:51
 * @LastEditors: 喜闻乐见 529324308@qq.com
 * @LastEditTime: 2025-09-08 18:47:12
 * @FilePath: /donglicun/vite.config.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import cesium from 'vite-plugin-cesium';
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const cesiumPackageDir = path.dirname(require.resolve('cesium/package.json'));
const cesiumBuildRootPath = path.join(cesiumPackageDir, 'Build');
const cesiumBuildPath = path.join(cesiumBuildRootPath, 'Cesium');
const appBase = '/';
const httpsPfxPath = path.resolve('certs/localhost.pfx');
const localHttpsOptions = fs.existsSync(httpsPfxPath)
  ? {
      pfx: fs.readFileSync(httpsPfxPath),
      passphrase: 'szkj-local-https',
    }
  : undefined;

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.wasm': 'application/wasm',
};

function serveCesiumForPreview() {
  return {
    name: 'serve-cesium-for-preview',
    configurePreviewServer(server) {
      const baseDir = appBase.replace(/^\/|\/$/g, '');
      const cesiumPublicPath = path.posix.join(appBase, 'cesium/');
      const cesiumDistDir = path.resolve('dist', baseDir, 'cesium');

      server.middlewares.use((req, res, next) => {
        if (!req.url || (req.method !== 'GET' && req.method !== 'HEAD')) {
          next();
          return;
        }

        const requestPath = decodeURIComponent(new URL(req.url, 'https://local.preview').pathname);
        if (!requestPath.startsWith(cesiumPublicPath)) {
          next();
          return;
        }

        const relativePath = requestPath.slice(cesiumPublicPath.length);
        const filePath = path.resolve(cesiumDistDir, relativePath);
        if (!filePath.startsWith(cesiumDistDir) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
          next();
          return;
        }

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream');
        if (req.method === 'HEAD') {
          res.end();
          return;
        }

        fs.createReadStream(filePath).pipe(res);
      });
    },
  };
}

export default defineConfig({
  plugins: [
    vue(),
    cesium({
      cesiumBuildRootPath,
      cesiumBuildPath,
    }), // 添加 Cesium 插件
    serveCesiumForPreview(),
  ],
  resolve: {
    alias: {
      '@': '/src', // 设置 @ 为 src 路径别名
    },
  },
  build: {
    rollupOptions: {
      output: {
        sourcePrefix: '', // 解决 Cesium 源代码空格问题
      },
    },
  },
  server: {
    host: '0.0.0.0', // 允许通过本地网络访问
    https: localHttpsOptions,
  },
  preview: {
    host: '0.0.0.0',
    https: localHttpsOptions,
  },
  base: appBase,
});
