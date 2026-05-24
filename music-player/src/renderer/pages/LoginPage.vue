<template>
  <div class="auth-page flow-bg">
    <div class="auth-card glass-panel-strong">
      <h2 class="title">登录</h2>

      <!-- Server error banner -->
      <el-alert v-if="serverError" :title="serverError" type="error" show-icon
        closable @close="serverError = ''" class="server-error" />

      <el-form ref="formRef" :model="form" :rules="rules" label-position="top"
        @keyup.enter="handleLogin">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="请输入用户名"
            @input="serverError = ''" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="form.password" type="password" placeholder="请输入密码"
            show-password @input="serverError = ''" />
        </el-form-item>
        <el-button class="submit-btn" :loading="loading"
          @click="handleLogin" style="width:100%;margin-top:8px">
          登 录
        </el-button>
      </el-form>
      <p class="switch-link">
        没有账号？<router-link to="/register">立即注册</router-link>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { extractError } from '../utils/error'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const loading = ref(false)
const serverError = ref('')
const formRef = ref<FormInstance>()

const form = reactive({
  username: (route.query.prefill as string) || '',
  password: '',
})

const rules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 2, max: 24, message: '用户名长度为 2-24 位', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少6位', trigger: 'blur' },
  ],
}

// Clear prefilled username when route query changes
watch(() => route.query.prefill, (val) => {
  if (val) form.username = val as string
})

async function handleLogin() {
  serverError.value = ''
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    await auth.login({
      username: form.username.trim(),
      password: form.password,
    })
    ElMessage.success('登录成功')
    const redirect = (route.query.redirect as string) || '/'
    router.push(redirect)
  } catch (e) {
    serverError.value = extractError(e, '登录失败，请检查用户名和密码')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-page {
  height: 100vh; display: flex; align-items: center; justify-content: center;
  background: var(--bg-base);
}
.auth-card { width: 380px; padding: 36px; position: relative; z-index: 1; }
.title { text-align: center; font-size: 22px; font-weight: 600; margin-bottom: 24px; }
.server-error { margin-bottom: 16px; }
.submit-btn { background: var(--accent-gradient) !important; border: none !important; color: var(--text-on-accent) !important; font-weight: 600 !important; }
.switch-link { text-align: center; margin-top: 16px; font-size: 12px; color: var(--text-secondary); }
.switch-link a { color: var(--text-accent); text-decoration: none; }
</style>
