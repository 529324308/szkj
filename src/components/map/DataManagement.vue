<!--
 * @Author: 喜闻乐见 529324308@qq.com
 * @Date: 2026-05-25 09:54:04
 * @LastEditors: 喜闻乐见 529324308@qq.com
 * @LastEditTime: 2026-05-25 09:59:54
 * @FilePath: /shuzhikongjian/src/components/map/DataManagement.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
<template>
	<div class="data-management" v-if="active">
		<div class="placeholder">
			<h2>数据管理</h2>
			<p>数据管理模块正在建设中...</p>
		</div>
	</div>
</template>

<script setup>
defineProps({
	active: Boolean
});
</script>

<style scoped>
.data-management {
	position: absolute;
	top: 110px;
	left: 0;
	right: 0;
	bottom: 0;
	background: #fff;
	z-index: 2;
	display: flex;
	align-items: center;
	justify-content: center;
}
.placeholder {
	text-align: center;
	color: #64748b;
}
</style>
