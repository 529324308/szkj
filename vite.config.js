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
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const cesiumPackageDir = path.dirname(require.resolve('cesium/package.json'));
const cesiumBuildRootPath = path.join(cesiumPackageDir, 'Build');
const cesiumBuildPath = path.join(cesiumBuildRootPath, 'Cesium');

export default defineConfig({
  plugins: [
    vue(),
    cesium({
      cesiumBuildRootPath,
      cesiumBuildPath,
    }), // 添加 Cesium 插件
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
  },
  base: '/SZKJ/',
});
