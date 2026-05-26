<template>
	<div class="personal-center" v-if="active">
		<div class="placeholder">
			<h2>个人中心</h2>
			<p>个人中心模块正在建设中...</p>
		</div>
	</div>
</template>

<script setup>
defineProps({
	active: Boolean
});
</script>

<style scoped>
.personal-center {
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
