<!--
 * @Author: 喜闻乐见 529324308@qq.com
 * @Date: 2025-11-11 14:45:11
 * @LastEditors: 喜闻乐见 529324308@qq.com
 * @LastEditTime: 2026-05-25 16:56:37
 * @FilePath: /shuzhikongjian/src/components/Login.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
<template>
  <div class="login-wrap">
    <div class="bg-page-logo">
      <img src="../assets/logo.png" alt="logo" />
    </div>
    <div class="login-container" :class="{ 'intro-done': introDone }">
      <!-- 左侧品牌展示 -->
      <div class="brand-section">
        <div class="brand-content">
          <h1 class="brand-title">数治空间</h1>
          <p class="brand-subtitle">Zhejiang Digital Space Technology</p>
          <div class="brand-footer">
            <span class="divider"></span>
            <span class="footer-text">数字智能 · 空间未来</span>
            <span class="divider"></span>
          </div>
        </div>
        <div class="bg-decoration" @animationend="onIntroAnimEnd">
          <img src="../assets/logo.png" alt="logo" />
        </div>
      </div>

      <!-- 右侧登录表单 -->
      <div class="form-section">
        <div class="form-header">
          <h2 class="welcome-title">欢迎登录</h2>
          <p class="welcome-subtitle">Welcome to SZKJ</p>
        </div>

        <el-form @submit.prevent="onSubmit" label-position="top">
          <el-form-item label="用户名">
            <el-input v-model="username" placeholder="请输入用户名" @keyup.enter="onSubmit" class="custom-input" />
          </el-form-item>
          <el-form-item label="密码">
            <el-input v-model="password" type="password" placeholder="请输入密码" show-password @keyup.enter="onSubmit" class="custom-input" />
          </el-form-item>
          
          <div class="form-options">
            <el-checkbox v-model="rememberMe">记住我</el-checkbox>
            <!-- <a href="#" class="forgot-link">忘记密码?</a> -->
          </div>

          <el-button type="primary" @click="onSubmit" :loading="loading" class="login-btn">
            {{ loading ? '登录中' : '登录' }}
          </el-button>

          <div class="register-footer">
            <!-- 还没有账号? <a href="#" class="register-link">立即注册</a> -->
          </div>
        </el-form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { login } from '../api/auth';

const emit = defineEmits(['success']);
const MESSAGE_OFFSET_TOP = 200;
const username = ref('');
const password = ref('');
const rememberMe = ref(false);
const loading = ref(false);
const introDone = ref(false);
let introTimer = null;

function onIntroAnimEnd(e) {
  if (e?.animationName !== 'brandLogoIn') return;
  introDone.value = true;
  if (introTimer) {
    window.clearTimeout(introTimer);
    introTimer = null;
  }
}

onMounted(() => {
  introTimer = window.setTimeout(() => {
    introDone.value = true;
    introTimer = null;
  }, 950);
});

onBeforeUnmount(() => {
  if (introTimer) window.clearTimeout(introTimer);
});

async function onSubmit() {
  if (loading.value) return;
  const u = username.value.trim();
  const p = password.value.trim();
  if (!u || !p) {
    ElMessage.error({ message: '请输入用户名和密码', offset: MESSAGE_OFFSET_TOP });
    return;
  }
  loading.value = true;
  try {
    const data = await login(u, p);

    // 登录成功
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('expiresIn', data.expiresIn);
    localStorage.setItem('userName', u);

    ElMessage.success({ message: '登录成功', offset: MESSAGE_OFFSET_TOP });
    emit('success', { username: u, ...data });
  } catch (error) {
    console.error('Login error:', error);
    ElMessage.error({ message: error.message || '登录失败，请检查用户名或密码', offset: MESSAGE_OFFSET_TOP });
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped lang="scss">
.login-wrap {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  // background: linear-gradient(to bottom right, #DFF3FE, #F0FCFA); // 浅蓝底色
  background:  #1A1B1D;// 黑色底色
  font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
  overflow: hidden;
}

.bg-page-logo {
  position: absolute;
  // left: -10%;
  // bottom: 30%;
  width: 100%;
  // height: 1200px;
  transform: rotate(-35deg);
  opacity: 0.03;
  animation: pageLogoBreath 4.8s ease-in-out infinite;
  pointer-events: none;
  user-select: none;
  filter: blur(0.2px);
}

.bg-page-logo img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.login-container {
  width: 900px;
  height: 480px;
  position: relative;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 24px;
  display: flex;
  overflow: hidden;
  box-shadow: 0 22px 70px rgba(93, 93, 93, 0.45);
  backdrop-filter: blur(18px) saturate(160%);
  -webkit-backdrop-filter: blur(18px) saturate(160%);
}

.login-container::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  background:
    radial-gradient(1100px 520px at 18% 8%, rgba(255, 255, 255, 0.28), rgba(255, 255, 255, 0) 60%),
    radial-gradient(900px 700px at 88% 105%, rgba(6, 182, 212, 0.22), rgba(6, 182, 212, 0) 62%),
    radial-gradient(650px 450px at 70% 20%, rgba(13, 148, 135, 0.12), rgba(13, 148, 135, 0) 55%);
  opacity: 0.95;
  pointer-events: none;
}

.login-container::after {
  content: '';
  position: absolute;
  inset: -60% -60%;
  z-index: 0;
  background: linear-gradient(115deg, rgba(255, 255, 255, 0) 40%, rgba(255, 255, 255, 0.26) 50%, rgba(255, 255, 255, 0) 60%);
  filter: blur(10px);
  opacity: 0.35;
  pointer-events: none;
  transform: translateX(-18%) rotate(12deg);
  animation: glassSheen 7s ease-in-out infinite;
}

// 左侧部分
.brand-section {
  flex: 1;
  // background: linear-gradient(135deg, #0ea2a0 0%, #13c2c2 100%);
  background: linear-gradient(to bottom right, #0D9487 0%, #06B6D4 100%);
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: #ffffff;

  .brand-content {
    position: relative;
    z-index: 2;
    text-align: center;
    transition: transform 0.45s ease;

    .brand-title {
      font-size: 36px;
      font-weight: 700;
      margin-bottom: 10px;
      letter-spacing: 2px;
      line-height: 1.4;
      opacity: 0;
      transform: translateY(28px);
      animation: brandTextUp 0.8s ease-out forwards;
      animation-delay: 0.08s;
    }

    .brand-subtitle {
      font-size: 16px;
      opacity: 0.9;
      margin-bottom: 40px;
      font-weight: 300;
      opacity: 0;
      transform: translateY(28px);
      animation: brandTextUp 0.8s ease-out forwards;
      animation-delay: 0.16s;
      transition: margin-bottom 0.45s ease;
    }

    .brand-footer {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 15px;
      margin-top: 60px;
      transition: margin-top 0.45s ease;

      .footer-text {
        font-size: 12px;
        opacity: 0.8;
        opacity: 0;
        transform: translateY(-28px);
        animation: brandTextDown 0.8s ease-out forwards;
        animation-delay: 0.2s;
      }

      .divider {
        width: 30px;
        height: 1px;
        background: rgba(255, 255, 255, 0.4);
      }
    }
  }

  .bg-decoration {
    position: absolute;
    width: 260px;
    height: 260px;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%) scale(1);
    pointer-events: none;
    user-select: none;
    opacity: 0.12;
    animation: brandLogoIn 0.9s ease-out;
    transition: top 0.45s ease, transform 0.45s ease, opacity 0.45s ease;

    img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      filter: brightness(0) invert(1) blur(0);
      animation: brandLogoBlur 0.9s ease-out;
    }
  }
}

.login-container.intro-done:hover .brand-section .brand-content {
  transform: translateY(70px);
}

.login-container.intro-done:hover .brand-section .brand-subtitle {
  margin-bottom: 18px;
}

.login-container.intro-done:hover .brand-section .brand-footer {
  margin-top: 18px;
}

.login-container.intro-done:hover .brand-section .bg-decoration {
  top: 32%;
  transform: translate(-50%, -50%) scale(0.65);
  opacity: 1;
}

// 右侧部分
.form-section {
  width: 440px;
  padding: 50px 60px;
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;

  .form-header {
    margin-bottom: 30px;

    .welcome-title {
      font-size: 28px;
      font-weight: 700;
      color: rgba(255, 255, 255, 0.95);
      margin-bottom: 4px;
    }

    .welcome-subtitle {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.65);
    }
  }

  :deep(.el-form-item__label) {
    font-weight: 600;
    color: rgba(255, 255, 255, 0.9);
    padding-bottom: 4px;
    font-size: 13px;
  }

  .custom-input {
    :deep(.el-input__wrapper) {
      background-color: rgba(255, 255, 255, 0.10);
      box-shadow: none !important;
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 8px;
      padding: 4px 12px;
      transition: all 0.3s;

      &.is-focus {
        background-color: rgba(255, 255, 255, 0.16);
        border-color: rgba(255, 255, 255, 0.35);
      }
    }
  }

  .form-options {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;

    .forgot-link {
      font-size: 13px;
      color: #13c2c2;
      text-decoration: none;
      &:hover {
        opacity: 0.8;
      }
    }

    :deep(.el-checkbox__label) {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.75);
    }
    
    :deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
      background-color: #13c2c2;
      border-color: #13c2c2;
    }
  }

  :deep(.el-input__inner) {
    color: rgba(255, 255, 255, 0.95);
  }

  :deep(.el-input__inner::placeholder) {
    color: rgba(255, 255, 255, 0.45);
  }

  .login-btn {
    width: 100%;
    height: 44px;
    background-image: linear-gradient(to right, #0D9487 0%, #06B6D4 100%);
    border-color: #ffffff00;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 20px;
    transition: all 0.3s ease;
    
    &:hover {
      transform: scale(1.02);
      box-shadow: 0 8px 16px rgba(13, 148, 135, 0.3);
    }
  }

  .register-footer {
    text-align: center;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.6);

    .register-link {
      color: #13c2c2;
      text-decoration: none;
      font-weight: 600;
      margin-left: 4px;
      &:hover {
        opacity: 0.8;
      }
    }
  }
}

@keyframes brandTextUp {
  from {
    opacity: 0;
    transform: translateY(28px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes brandTextDown {
  from {
    opacity: 0;
    transform: translateY(-28px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes brandLogoIn {
  from {
    opacity: 0;
    transform: translate(-50%, -50%) scale(1.35);
  }
  to {
    opacity: 0.12;
    transform: translate(-50%, -50%) scale(1);
  }
}

@keyframes brandLogoBlur {
  from {
    filter: brightness(0) invert(1) blur(10px);
  }
  to {
    filter: brightness(0) invert(1) blur(0);
  }
}

@keyframes pageLogoBreath {
  0% {
    opacity: 0.018;
  }
  50% {
    opacity: 0.05;
  }
  100% {
    opacity: 0.018;
  }
}

@keyframes glassSheen {
  0% {
    transform: translateX(-18%) rotate(12deg);
  }
  50% {
    transform: translateX(18%) rotate(12deg);
  }
  100% {
    transform: translateX(-18%) rotate(12deg);
  }
}
</style>
