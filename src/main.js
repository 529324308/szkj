/*
 * @Author: 喜闻乐见 529324308@qq.com
 * @Date: 2024-12-16 11:27:51
 * @LastEditors: 喜闻乐见 529324308@qq.com
 * @LastEditTime: 2024-12-17 16:59:16
 * @FilePath: /donglicun/src/main.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import 'cesium/Source/Widgets/widgets.css'; // 导入 Cesium 样式
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

createApp(App).use(ElementPlus).mount('#app')
