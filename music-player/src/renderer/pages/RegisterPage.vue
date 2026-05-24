<template>
  <div class="auth-page flow-bg">
    <div class="auth-card glass-panel-strong">
      <h2 class="title">注册</h2>

      <!-- Server error banner -->
      <el-alert v-if="serverError" :title="serverError" type="error" show-icon
        closable @close="serverError = ''" class="server-error" />

      <el-form ref="formRef" :model="form" :rules="rules" label-position="top"
        @keyup.enter="handleRegister">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="2-24位字母、数字或下划线"
            maxlength="24" show-word-limit @input="serverError = ''" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="form.email" placeholder="请输入邮箱"
            @input="serverError = ''" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="form.password" type="password" placeholder="至少6位，建议包含字母和数字"
            show-password show-word-limit maxlength="64"
            @input="serverError = ''; calcStrength()" />
          <!-- Password strength bar -->
          <div v-if="form.password" class="pw-strength">
            <div class="pw-bar" :style="{ width: strengthPercent + '%' }" :class="strengthClass" />
            <span class="pw-hint" :class="strengthClass">{{ strengthLabel }}</span>
          </div>
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input v-model="form.confirmPassword" type="password" placeholder="请再次输入密码"
            show-password @input="serverError = ''" />
        </el-form-item>
        <el-button class="submit-btn" :loading="loading"
          @click="handleRegister" style="width:100%;margin-top:8px">
          注 册
        </el-button>
      </el-form>
      <p class="switch-link">
        已有账号？<router-link to="/login">去登录</router-link>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { extractError } from '../utils/error'

const router = useRouter()
const auth = useAuthStore()
const loading = ref(false)
const serverError = ref('')
const formRef = ref<FormInstance>()

const form = reactive({
  username: '', email: '', password: '', confirmPassword: '',
})

// ---- Password strength ----
const strengthPercent = ref(0)
const strengthClass = ref('')
const strengthLabel = ref('')

function calcStrength() {
  const pw = form.password
  if (!pw) {
    strengthPercent.value = 0; strengthClass.value = ''; strengthLabel.value = ''
    return
  }
  let score = 0
  if (pw.length >= 6) score++
  if (pw.length >= 10) score++
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++
  if (/\d/.test(pw)) score++
  if (/[^a-zA-Z0-9]/.test(pw)) score++

  if (score <= 1) {
    strengthPercent.value = 20; strengthClass.value = 'weak'; strengthLabel.value = '弱'
  } else if (score === 2) {
    strengthPercent.value = 40; strengthClass.value = 'fair'; strengthLabel.value = '一般'
  } else if (score === 3) {
    strengthPercent.value = 65; strengthClass.value = 'good'; strengthLabel.value = '较好'
  } else {
    strengthPercent.value = 100; strengthClass.value = 'strong'; strengthLabel.value = '强'
  }
}

// ---- Validation ----
const validateUsername = (_rule: unknown, value: string, cb: (e?: Error) => void) => {
  if (!value) return cb(new Error('请输入用户名'))
  if (value.length < 2 || value.length > 24) return cb(new Error('用户名长度为 2-24 位'))
  if (!/^\w+$/.test(value)) return cb(new Error('用户名仅支持字母、数字、下划线'))
  cb()
}

const validatePass = (_rule: unknown, value: string, cb: (e?: Error) => void) => {
  if (value !== form.password) cb(new Error('两次密码输入不一致'))
  else cb()
}

const rules: FormRules = {
  username: [
    { required: true, validator: validateUsername, trigger: 'blur' },
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少6位', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    { validator: validatePass, trigger: 'blur' },
  ],
}

async function handleRegister() {
  serverError.value = ''
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    await auth.register({
      username: form.username.trim(),
      email: form.email.trim(),
      password: form.password,
    })
    ElMessage.success('注册成功，即将跳转到登录页...')
    router.push({ path: '/login', query: { prefill: form.username.trim() } })
  } catch (e) {
    serverError.value = extractError(e, '注册失败，请稍后重试')
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
.auth-card { width: 400px; padding: 36px; position: relative; z-index: 1; }
.title { text-align: center; font-size: 22px; font-weight: 600; margin-bottom: 24px; }
.server-error { margin-bottom: 16px; }
.submit-btn { background: var(--accent-gradient) !important; border: none !important; color: var(--text-on-accent) !important; font-weight: 600 !important; }
.switch-link { text-align: center; margin-top: 16px; font-size: 12px; color: var(--text-secondary); }
.switch-link a { color: var(--text-accent); text-decoration: none; }

/* Password strength */
.pw-strength {
  display: flex; align-items: center; gap: 8px; margin-top: 6px;
}
.pw-bar {
  height: 4px; border-radius: 2px; transition: width 0.3s, background 0.3s;
  flex: 1; background: #ddd;
}
.pw-bar.weak { background: #f56c6c; }
.pw-bar.fair { background: #e6a23c; }
.pw-bar.good { background: #409eff; }
.pw-bar.strong { background: #67c23a; }
.pw-hint { font-size: 11px; flex-shrink: 0; }
.pw-hint.weak { color: #f56c6c; }
.pw-hint.fair { color: #e6a23c; }
.pw-hint.good { color: #409eff; }
.pw-hint.strong { color: #67c23a; }
</style>
