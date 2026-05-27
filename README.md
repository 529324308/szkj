# Vue 3 + Vite

This template should help get you started developing with Vue 3 in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

Learn more about IDE Support for Vue in the [Vue Docs Scaling up Guide](https://vuejs.org/guide/scaling-up/tooling.html#ide-support).

## 天地图路网接入

项目已集成天地图 WMTS 路网（矢量底图 `vec_w` + 中文标注 `cva_w`）。使用前请在项目根目录创建环境变量文件，配置你的天地图密钥：

1. 在项目根目录创建 `.env.local` 文件，写入：

```
VITE_TDT_TOKEN=你的天地图密钥
```

2. 启动开发服务后，底图会切换为天地图矢量路网并显示中文标注。

3. 若未配置密钥，将继续使用默认底图，并在控制台提示：`未检测到天地图token (VITE_TDT_TOKEN)`。

密钥申请与使用说明参考天地图官网。


在首页工具栏中增加一个按钮，开启三维地形，在右侧弹出输入框，输入地址，确认和取消，如果点击确定，但是输入框里没有输入地址那么就加载网络地形，如果输入框里有 http://localhost:9004/tile/model/service/Yntvr2Mv/tileset.json 类似这样tileset.json模型地址那么就用3dTitle加载三维模型，并且加载网络地形。开启三维地形按钮改为红色背景色，文字改为关闭地形