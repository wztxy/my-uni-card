<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <h2>{{ t('login.title') }}</h2>
        <p class="login-subtitle">{{ t('login.subtitle') }}</p>
      </div>
      
      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label for="stuNo">{{ t('login.stuNo') }}</label>
          <div class="input-wrapper">
            <input
              id="stuNo"
              v-model="form.stuNo"
              type="text"
              :placeholder="t('login.placeholderStuNo')"
              autocomplete="username"
              required
            />
          </div>
        </div>

        <div class="form-group">
          <label for="password">{{ t('login.password') }}</label>
          <div class="input-wrapper">
            <input
              id="password"
              v-model="form.password"
              type="password"
              :placeholder="t('login.placeholderPassword')"
              autocomplete="current-password"
              required
            />
          </div>
        </div>

        <div class="form-options">
          <label class="checkbox-label">
            <input type="checkbox" v-model="rememberPassword">
            <span>{{ t('login.rememberPassword') }}</span>
          </label>
          <label class="checkbox-label">
            <input type="checkbox" v-model="autoLogin">
            <span>{{ t('login.autoLogin') }}</span>
          </label>
        </div>

        <button type="submit" class="login-btn" :disabled="isLoading">
          <span v-if="isLoading" class="spinner"></span>
          {{ isLoading ? t('login.loggingIn') : t('login.loginBtn') }}
        </button>
      </form>

      <div v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>

      <div class="info-box">
        <p>{{ t('login.privacy1') }}</p>
        <p>{{ t('login.privacy2') }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const emit = defineEmits<{
  'login-success': [info: { stuNo: string; name: string; sessionId: string }];
}>();

const form = ref({
  stuNo: '',
  password: ''
});

const rememberPassword = ref(false);
const autoLogin = ref(false);

watch(rememberPassword, (newVal) => {
  if (!newVal) {
    autoLogin.value = false;
  }
});

watch(autoLogin, (newVal) => {
  if (newVal) {
    rememberPassword.value = true;
  }
});

const isLoading = ref(false);
const errorMessage = ref('');

onMounted(() => {
  const savedRemember = localStorage.getItem('login_remember') === 'true';
  const savedAuto = localStorage.getItem('login_auto') === 'true';
  
  if (savedRemember) {
    rememberPassword.value = true;
    form.value.stuNo = localStorage.getItem('login_stuNo') || '';
    try {
      const savedPwd = localStorage.getItem('login_password') || '';
      if (savedPwd) {
        form.value.password = atob(savedPwd);
      }
    } catch {
    }
    
    if (savedAuto && form.value.stuNo && form.value.password) {
      autoLogin.value = true;
      handleLogin();
    }
  }
});

const handleLogin = async () => {
  if (!form.value.stuNo || !form.value.password) {
    errorMessage.value = t('login.errorMissing');
    return;
  }

  isLoading.value = true;
  errorMessage.value = '';

  try {
    if (rememberPassword.value) {
      localStorage.setItem('login_remember', 'true');
      localStorage.setItem('login_stuNo', form.value.stuNo);
      localStorage.setItem('login_password', btoa(form.value.password));
      localStorage.setItem('login_auto', autoLogin.value ? 'true' : 'false');
    } else {
      localStorage.removeItem('login_remember');
      localStorage.removeItem('login_stuNo');
      localStorage.removeItem('login_password');
      localStorage.removeItem('login_auto');
    }

    if (window.electronAPI?.ssoLogin) {
      const result = await window.electronAPI.ssoLogin(form.value.stuNo, form.value.password);

      if (result.success) {
        let userName = result.name || form.value.stuNo;
        if (window.electronAPI.fetchUserInfo) {
          try {
            const userInfoResult = await window.electronAPI.fetchUserInfo(result.sessionId);
            if (userInfoResult.success && userInfoResult.data) {
              userName = userInfoResult.data.username || userInfoResult.data.name || userName;
            }
          } catch (e) {
            console.warn('Failed to fetch user info:', e);
          }
        }

        emit('login-success', {
          stuNo: form.value.stuNo,
          name: userName,
          sessionId: result.sessionId
        });
      } else {
        errorMessage.value = result.error ? t(result.error) : t('login.errorGeneric');
      }
    } else {
      errorMessage.value = '请在 Electron 环境中运行此应用';
    }
  } catch (error: any) {
    errorMessage.value = error.message || t('login.errorGeneric');
    console.error('Login error:', error);
  } finally {
    isLoading.value = false;
  }
};
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  padding: 20px;
}

.login-card {
  background: white;
  padding: 48px;
  border-radius: 24px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.08);
  width: 100%;
  max-width: 380px;
  border: 1px solid rgba(0, 0, 0, 0.02);
}

.login-header {
  text-align: center;
  margin-bottom: 40px;
}

.login-header h2 {
  margin: 0 0 8px;
  color: #1d1d1f;
  font-size: 24px;
  font-weight: 600;
  letter-spacing: -0.5px;
}

.login-subtitle {
  margin: 0;
  color: #86868b;
  font-size: 14px;
}

.form-group {
  margin-bottom: 24px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #1d1d1f;
  font-weight: 500;
  font-size: 13px;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-wrapper input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #d2d2d7;
  border-radius: 12px;
  font-size: 15px;
  transition: all 0.2s;
  box-sizing: border-box;
  color: #1d1d1f;
  background: #ffffff;
}

.input-wrapper input:focus {
  outline: none;
  border-color: #007aff;
  box-shadow: 0 0 0 4px rgba(0, 122, 255, 0.1);
}

.input-wrapper input::placeholder {
  color: #86868b;
}

.form-options {
  display: flex;
  justify-content: space-between;
  margin-bottom: 24px;
  padding: 0 4px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #1d1d1f;
  cursor: pointer;
  user-select: none;
}

.checkbox-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 1px solid #d2d2d7;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"]:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.login-btn {
  width: 100%;
  padding: 12px;
  background: #007aff;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 12px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
}

.login-btn:hover:not(:disabled) {
  background: #0071eb;
}

.login-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-message {
  margin-top: 24px;
  padding: 12px;
  background: #fff2f2;
  border-radius: 12px;
  color: #ff3b30;
  font-size: 13px;
  text-align: center;
}

.info-box {
  margin-top: 32px;
  text-align: center;
}

.info-box p {
  margin: 4px 0;
  font-size: 12px;
  color: #86868b;
}
</style>
