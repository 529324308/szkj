/*
 * @Author: 喜闻乐见 529324308@qq.com
 * @Date: 2026-05-25 13:22:29
 * @LastEditors: 喜闻乐见 529324308@qq.com
 * @LastEditTime: 2026-05-26 09:14:19
 * @FilePath: /shuzhikongjian/src/api/map.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { request } from './request';

/**
 * 地图/地价查询相关接口
 */

/**
 * 获取地价查询图层列表 (目前模拟返回)
 */
export async function getLandPriceLayers() {
  // 模拟异步请求
  return [
    { name: '标定地价', url: 'http://121.41.123.10/oss/20250911/bdqy/tileset.json', childList: [] },
    {
      name: '集体级别',
      childList: [
        { name: '集体工业级别', url: 'http://121.41.123.10/oss/20250911/jtgyjb/tileset.json' },
        { name: '集体商服、宅基地级别', url: 'http://121.41.123.10/oss/20250911/jtsfzjdjb/tileset.json' }
      ]
    },
    { name: '农用地级别', url: 'http://121.41.123.10/oss/20250911/nydjb/tileset.json', childList: [] },
  ];
}

export function getMenuTreeList() {
  return request('/api/Menu/treelist', {
    method: 'GET',
  });
}

export function getMenuTreeStartId(id) {
  const qs = new URLSearchParams({ id: String(id) }).toString();
  return request(`/api/Menu/treestartid?${qs}`, {
    method: 'GET',
  });
}

export function getFeaturesByNodeIdAsync(id) {
  return request('/api/Map/GetFeaturesByNodeIdAsync', {
    method: 'POST',
    body: JSON.stringify(String(id)),
  });
}
