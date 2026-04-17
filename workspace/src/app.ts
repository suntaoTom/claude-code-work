/**
 * @description 运行时配置: request 拦截器 (Authorization 注入 + 40103 静默 refresh + 40104 清空登录态) + getInitialState
 * @module src
 * @dependencies @umijs/max, antd message, features/auth/api/authApi, features/auth/utils/tokenStorage, features/auth/constants
 * @prd docs/prds/login.md#功能点-4-路由守卫与角色权限
 * @task docs/tasks/tasks-login-2026-04-15.json#T008
 * @rules
 *   - 页面加载时, getInitialState 调用 getCurrentUser 获取当前用户; 未登录 (40101 / 40104) 视为无登录态
 *   - 访问令牌 (access token) 过期时, 全局 request 拦截器自动调用 refreshToken 续期一次; 失败则清空登录态并跳 /login
 *   - 登录成功后, 全局可访问当前用户信息 (至少包含 userId / username / role)
 */
import { getIntl, history, request as umiRequest } from '@umijs/max';
import type { AxiosRequestConfig, AxiosResponse, RequestConfig, RunTimeLayoutConfig } from '@umijs/max';
import { message } from 'antd';
import {
  AUTH_ERROR_CODE,
  FORBIDDEN_PATH,
  LOGIN_PATH,
  REGISTER_PATH,
} from '@/features/auth/constants';
import {
  getCurrentUser,
  refreshToken,
  type CurrentUser,
} from '@/features/auth/api/authApi';
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setAccessToken,
} from '@/features/auth/utils/tokenStorage';

const RETRY_FLAG = '__authRetried';
const PUBLIC_PATHS: readonly string[] = [LOGIN_PATH, REGISTER_PATH, FORBIDDEN_PATH];

interface InitialState {
  currentUser: CurrentUser | null;
  fetchUserInfo: () => Promise<CurrentUser | null>;
}

interface BodyWithCode {
  code?: number;
  data?: unknown;
  message?: string;
}

const isPublicPath = (path: string): boolean =>
  PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));

const redirectToLogin = (): void => {
  if (typeof window === 'undefined') return;
  if (isPublicPath(window.location.pathname)) return;
  const redirect = encodeURIComponent(window.location.pathname + window.location.search);
  history.push(`${LOGIN_PATH}?redirect=${redirect}`);
};

const errorMessageByCode = (code: number): string | null => {
  const intl = getIntl();
  switch (code) {
    case AUTH_ERROR_CODE.SERVER_ERROR:
      return intl.formatMessage({ id: 'auth.error.serverError' });
    case AUTH_ERROR_CODE.WEAK_PASSWORD:
      return intl.formatMessage({ id: 'auth.error.weakPassword' });
    default:
      return null;
  }
};

async function trySilentRefresh(): Promise<boolean> {
  const refresh = getRefreshToken();
  if (!refresh) return false;
  try {
    const res = await refreshToken({ refreshToken: refresh });
    if (res.code === 0 && res.data?.accessToken) {
      setAccessToken(res.data.accessToken);
      return true;
    }
  } catch {
    // fall through
  }
  return false;
}

/**
 * 全局初始化数据: 启动时拉一次 currentUser, 失败视为未登录
 */
export async function getInitialState(): Promise<InitialState> {
  const fetchUserInfo = async (): Promise<CurrentUser | null> => {
    try {
      const res = await getCurrentUser();
      if (res.code === 0 && res.data) return res.data;
    } catch {
      // network error: treat as no login
    }
    return null;
  };

  const currentUser = await fetchUserInfo();
  return { currentUser, fetchUserInfo };
}

export const layout: RunTimeLayoutConfig = ({ initialState }) => {
  const user = (initialState as InitialState | undefined)?.currentUser;
  return {
    title: 'AI Frontend',
    logout: undefined,
    avatarProps: user
      ? {
          src: user.avatar,
          title: user.username,
        }
      : undefined,
  };
};

type RetryAxiosRequestConfig = AxiosRequestConfig & { [RETRY_FLAG]?: boolean };

export const request: RequestConfig = {
  timeout: 10000,
  requestInterceptors: [
    (config: AxiosRequestConfig) => {
      const token = getAccessToken();
      const headers: Record<string, string> = {
        ...(config.headers as Record<string, string> | undefined),
        'Content-Type': 'application/json',
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      return { ...config, headers };
    },
  ],
  responseInterceptors: [
    async (response: AxiosResponse<BodyWithCode>) => {
      const config = response.config as RetryAxiosRequestConfig;
      const code = response.data?.code;

      if (code === undefined || code === 0) return response;

      // 40103: silent refresh + retry once
      if (code === AUTH_ERROR_CODE.ACCESS_TOKEN_EXPIRED && !config[RETRY_FLAG]) {
        const ok = await trySilentRefresh();
        if (ok && config.url) {
          const retryConfig: RetryAxiosRequestConfig = {
            method: config.method,
            data: config.data,
            params: config.params,
            [RETRY_FLAG]: true,
          };
          const newData = await umiRequest<BodyWithCode>(config.url, retryConfig);
          return { ...response, data: newData };
        }
        clearTokens();
        redirectToLogin();
        return response;
      }

      // 40104: clear login state + redirect
      if (code === AUTH_ERROR_CODE.REFRESH_TOKEN_EXPIRED) {
        clearTokens();
        redirectToLogin();
        return response;
      }

      // 50001 / other: toast for non-form-handled codes
      const text = errorMessageByCode(code);
      if (text) {
        message.error(text);
      }

      return response;
    },
  ],
  errorConfig: {
    errorHandler: (error: unknown) => {
      if (error instanceof Error) {
        const intl = getIntl();
        message.error(intl.formatMessage({ id: 'auth.error.network' }));
      }
    },
  },
};
