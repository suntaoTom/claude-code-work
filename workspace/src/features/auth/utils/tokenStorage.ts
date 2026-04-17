/**
 * @description access/refresh token 在 localStorage 的存取与清空封装
 * @module features/auth/utils
 * @dependencies features/auth/constants
 * @prd docs/prds/login.md#功能点-1-账号密码登录
 * @task docs/tasks/tasks-login-2026-04-15.json#T004
 * @rules
 *   - 登录成功后, 全局可访问当前用户信息 (至少包含 userId / username / role)
 *   - 无论接口是否成功, 前端都清空本地 access/refresh token 与用户信息
 */
import { TOKEN_STORAGE_KEY } from '../constants';

const isBrowser = (): boolean => typeof window !== 'undefined' && !!window.localStorage;

export function getAccessToken(): string | null {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(TOKEN_STORAGE_KEY.ACCESS_TOKEN);
}

export function setAccessToken(token: string): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(TOKEN_STORAGE_KEY.ACCESS_TOKEN, token);
}

export function getRefreshToken(): string | null {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(TOKEN_STORAGE_KEY.REFRESH_TOKEN);
}

export function setRefreshToken(token: string): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(TOKEN_STORAGE_KEY.REFRESH_TOKEN, token);
}

export function clearTokens(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(TOKEN_STORAGE_KEY.ACCESS_TOKEN);
  window.localStorage.removeItem(TOKEN_STORAGE_KEY.REFRESH_TOKEN);
}
