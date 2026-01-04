const axios = require('axios');
const { CookieJar } = require('tough-cookie');

function createCampusCardService({ log } = {}) {
  const writeLog = typeof log === 'function' ? log : () => undefined;

  const sessionStore = new Map();

  function createSession(stuNo) {
    const sessionId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    sessionStore.set(sessionId, {
      jar: new CookieJar(),
      stuNo,
      createdAt: Date.now()
    });
    return sessionId;
  }

  function getSession(sessionId) {
    if (!sessionId) return null;
    return sessionStore.get(sessionId) || null;
  }

  function getCookieString(jar, url) {
    return new Promise((resolve) => {
      jar.getCookieString(url, (err, cookies) => {
        if (err) return resolve('');
        resolve(cookies || '');
      });
    });
  }

  function setCookiesFromResponse(jar, url, response) {
    const setCookie = response && response.headers ? response.headers['set-cookie'] : undefined;
    if (!setCookie) return Promise.resolve();

    const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
    return Promise.all(
      cookies.map(
        (cookieStr) =>
          new Promise((resolve) => {
            jar.setCookie(cookieStr, url, { ignoreError: true }, () => resolve());
          })
      )
    ).then(() => undefined);
  }

  function resolveRedirectUrl(currentUrl, location) {
    try {
      return new URL(location, currentUrl).toString();
    } catch {
      return location;
    }
  }

  function coerceToEpochMs(value) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const asNumber = Number(value);
      if (Number.isFinite(asNumber) && value.trim() !== '') return asNumber;
    }
    return value;
  }

  function extractTradeRecords(payload) {
    if (!payload || typeof payload !== 'object') return null;

    const candidates = [
      payload?.data?.data,
      payload?.data?.list,
      payload?.data?.records,
      payload?.data,
      payload?.result?.data,
      payload?.result
    ];

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) return candidate;
      if (candidate && Array.isArray(candidate.data)) return candidate.data;
      if (candidate && candidate.data && Array.isArray(candidate.data.data)) return candidate.data.data;
    }

    return null;
  }

  async function requestFollowRedirects(client, jar, initialConfig, maxHops = 10) {
    let config = { ...initialConfig };
    let currentUrl = config.url;
    let method = (config.method || 'GET').toUpperCase();

    for (let hop = 0; hop <= maxHops; hop++) {
      const cookieHeader = await getCookieString(jar, currentUrl);
      const headers = {
        ...(config.headers || {}),
        ...(cookieHeader ? { Cookie: cookieHeader } : {})
      };

      writeLog(`[Main] Request: ${method} ${currentUrl}`);

      const response = await client.request({
        ...config,
        url: currentUrl,
        method,
        headers,
        maxRedirects: 0
      });

      writeLog(`[Main] Response: ${response.status} ${currentUrl}`);

      await setCookiesFromResponse(jar, currentUrl, response);

      const status = response.status;
      const location = response.headers ? response.headers.location : undefined;
      const isRedirect = status >= 300 && status < 400 && location;

      if (!isRedirect) {
        return response;
      }

      const nextUrl = resolveRedirectUrl(currentUrl, location);
      writeLog(`[Main] Redirecting to: ${nextUrl}`);

      if (status === 303 || ((status === 301 || status === 302) && method === 'POST')) {
        method = 'GET';
        delete config.data;
      }

      currentUrl = nextUrl;
    }

    throw new Error('Too many redirects, login flow failed');
  }

  async function ssoLogin(stuNo, password) {
    try {
      const SSO_LOGIN_URL = 'https://sso.buaa.edu.cn/login';
      const PASS_SERVICE_URL = 'https://pass.cc-pay.cn/login';
      const MALL_URL = 'https://mall.cc-pay.cn';

      const sessionId = createSession(stuNo);
      const session = getSession(sessionId);

      const client = axios.create({
        timeout: 30000,
        validateStatus: (status) => (status >= 200 && status < 400) || status === 401
      });

      const loginPageUrl = `${SSO_LOGIN_URL}?service=${encodeURIComponent(PASS_SERVICE_URL)}`;
      const loginPageResponse = await requestFollowRedirects(client, session.jar, {
        url: loginPageUrl,
        method: 'GET'
      });

      if (loginPageResponse.status !== 200) {
        return { success: false, error: '无法访问登录页面' };
      }

      const html = loginPageResponse.data;

      const executionMatch =
        html.match(/name=['"]execution['"][^>]*value=['"]([^'"]+)['"]/i) ||
        html.match(/value=['"]([^'"]+)['"][^>]*name=['"]execution['"]/i);
      const ltMatch =
        html.match(/name=['"]lt['"][^>]*value=['"]([^'"]+)['"]/i) ||
        html.match(/value=['"]([^'"]+)['"][^>]*name=['"]lt['"]/i);

      const execution = executionMatch ? executionMatch[1] : '';
      const lt = ltMatch ? ltMatch[1] : '';

      const formData = new URLSearchParams();
      formData.append('username', stuNo);
      formData.append('password', password);
      formData.append('execution', execution);
      formData.append('_eventId', 'submit');
      if (lt) {
        formData.append('lt', lt);
      }

      const loginResponse = await requestFollowRedirects(client, session.jar, {
        url: loginPageUrl,
        method: 'POST',
        data: formData.toString(),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Origin: 'https://sso.buaa.edu.cn',
          Referer: loginPageUrl
        }
      });

      const responseUrl = loginResponse.request?.responseURL || loginResponse.config?.url || '';
      const responseData = loginResponse.data || '';

      if (loginResponse.status === 401) {
        if (String(responseData).includes('Invalid credentials')) {
          return { success: false, error: '密码错误' };
        }
        return { success: false, error: '登录失败（401），请检查学号和密码' };
      }

      if (
        responseUrl.includes('pass.cc-pay.cn') ||
        responseUrl.includes('mall.cc-pay.cn') ||
        loginResponse.status === 302 ||
        (loginResponse.status === 200 && !responseData.includes('密码错误') && !responseData.includes('用户不存在'))
      ) {
        await requestFollowRedirects(client, session.jar, {
          url: `${MALL_URL}/cardInquiry?stuNo=${stuNo}&linkfrom=pass`,
          method: 'GET'
        });
        return {
          success: true,
          name: stuNo,
          sessionId
        };
      }

      if (responseData.includes('Invalid credentials')) {
        return { success: false, error: '密码错误' };
      }
      if (responseData.includes('密码错误') || responseData.includes('密码有误')) {
        return { success: false, error: '密码错误' };
      }
      if (responseData.includes('用户不存在') || responseData.includes('用户名不存在')) {
        return { success: false, error: '用户不存在' };
      }
      if (responseData.includes('验证码')) {
        return { success: false, error: '需要验证码，请稍后重试' };
      }

      return { success: false, error: '登录失败，请检查学号和密码' };
    } catch (error) {
      console.error('SSO Auth Error:', {
        message: error?.message,
        code: error?.code,
        status: error?.response?.status
      });

      if (error?.code === 'ECONNREFUSED') {
        return { success: false, error: '无法连接到服务器' };
      }
      if (error?.code === 'ETIMEDOUT' || error?.message?.includes('timeout')) {
        return { success: false, error: '连接超时，请检查网络' };
      }

      return { success: false, error: '认证过程出错：' + (error?.message || '未知错误') };
    }
  }

  async function fetchCardData(minDate, maxDate, stuNo, sessionId) {
    try {
      const API_BASE_URL = 'https://mall.cc-pay.cn/api/campus_card/trades';
      const CARD_INQUIRY_URL = `https://mall.cc-pay.cn/cardInquiry?stuNo=${encodeURIComponent(stuNo)}&linkfrom=pass`;

      const session = getSession(sessionId);
      if (!session) {
        return { success: false, error: '登录已过期，请重新登录' };
      }

      if (session.stuNo && stuNo && String(session.stuNo) !== String(stuNo)) {
        return { success: false, error: '会话与学号不匹配，请重新登录' };
      }

      const client = axios.create({
        timeout: 60000,
        validateStatus: (status) => (status >= 200 && status < 400) || status === 401
      });

      const response = await requestFollowRedirects(client, session.jar, {
        url: API_BASE_URL,
        method: 'GET',
        headers: {
          Referer: CARD_INQUIRY_URL,
          Accept: 'application/json, text/plain, */*'
        },
        params: {
          t: Date.now(),
          pageSize: 100000,
          pageNum: 1,
          minTsCreation: coerceToEpochMs(minDate),
          maxTsCreation: coerceToEpochMs(maxDate),
          tradeType: 'all',
          stuNo: stuNo
        }
      });

      if (response.status === 401) {
        return { success: false, error: '登录已过期，请重新登录' };
      }

      const payload = response.data;
      const records = extractTradeRecords(payload);
      const code = payload?.code;
      const message = payload?.message || payload?.msg;

      if (Array.isArray(records)) {
        return { success: true, data: records };
      }

      if (String(message || '').includes('正常完成')) {
        return { success: true, data: [] };
      }

      return {
        success: false,
        error: message || (code != null ? `获取数据失败（code=${code}）` : '获取数据失败')
      };
    } catch (error) {
      console.error('Data fetching error:', {
        message: error?.message,
        code: error?.code,
        status: error?.response?.status
      });

      if (error?.response?.status === 401) {
        return { success: false, error: '登录已过期，请重新登录' };
      }
      if (error?.code === 'ETIMEDOUT') {
        return { success: false, error: '请求超时，请检查网络连接' };
      }

      return { success: false, error: error?.message || '获取流水失败，请稍后重试' };
    }
  }

  async function fetchUserInfo(sessionId) {
    try {
      const USER_API_URL = 'https://pass.cc-pay.cn/api/user';
      const session = getSession(sessionId);

      if (!session) {
        return { success: false, error: '登录已过期' };
      }

      const client = axios.create({
        timeout: 10000,
        validateStatus: (status) => status >= 200 && status < 500
      });

      const response = await requestFollowRedirects(client, session.jar, {
        url: USER_API_URL,
        method: 'GET',
        params: { t: Date.now() }
      });

      if (response.status === 200 && response.data && response.data.success) {
        return { success: true, data: response.data.data };
      }

      return { success: false, error: '获取用户信息失败' };
    } catch (error) {
      console.error('Fetch user info error:', error);
      return { success: false, error: error?.message };
    }
  }

  return {
    ssoLogin,
    fetchCardData,
    fetchUserInfo
  };
}

module.exports = {
  createCampusCardService
};
