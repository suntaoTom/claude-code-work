/**
 * @description auth 模块常量: 路由路径、角色枚举、错误码、token storage key
 * @module features/auth
 * @dependencies -
 * @prd docs/prds/login.md#功能点-1-账号密码登录
 * @task docs/tasks/tasks-login-2026-04-15.json#T003
 * @rules
 *   - 不做图形验证码校验
 *   - 不做连续失败锁定
 */

/** 路由路径 (匿名页 + 受保护页跳转目标) */
export const LOGIN_PATH = '/login' as const;
export const REGISTER_PATH = '/register' as const;
export const FORBIDDEN_PATH = '/403' as const;
export const HOME_PATH = '/' as const;

/** 角色枚举, 与 OpenAPI getCurrentUser.role 对齐 (admin/user) */
export const ROLE = {
  ADMIN: 'admin',
  USER: 'user',
} as const;

export type RoleValue = (typeof ROLE)[keyof typeof ROLE];

/** 角色下拉选项, label 为国际化 key */
export const ROLE_OPTIONS = [
  { label: 'auth.role.admin', value: ROLE.ADMIN },
  { label: 'auth.role.user', value: ROLE.USER },
] as const;

/** 业务错误码 (与 PRD 错误码映射表一致) */
export const AUTH_ERROR_CODE = {
  /** 账号或密码错误 */
  INVALID_CREDENTIAL: 40101,
  /** 账号已禁用 */
  ACCOUNT_DISABLED: 40102,
  /** access token 过期 */
  ACCESS_TOKEN_EXPIRED: 40103,
  /** refresh token 过期 */
  REFRESH_TOKEN_EXPIRED: 40104,
  /** 账号已存在 */
  USERNAME_EXISTS: 40201,
  /** 密码强度不符合要求 */
  WEAK_PASSWORD: 40202,
  /** 服务异常 */
  SERVER_ERROR: 50001,
} as const;

export type AuthErrorCode = (typeof AUTH_ERROR_CODE)[keyof typeof AUTH_ERROR_CODE];

/** localStorage 存储 key */
export const TOKEN_STORAGE_KEY = {
  ACCESS_TOKEN: 'auth.accessToken',
  REFRESH_TOKEN: 'auth.refreshToken',
} as const;

/** 接口路径 */
export const AUTH_API = {
  LOGIN: '/api/auth/login',
  ME: '/api/auth/me',
  REFRESH: '/api/auth/refresh',
  LOGOUT: '/api/auth/logout',
  REGISTER: '/api/auth/register',
} as const;

/** 表单校验正则 (4-32 位字母/数字/下划线; 8-32 位密码必须含字母+数字) */
export const USERNAME_REG = /^[A-Za-z0-9_]{4,32}$/;
export const PASSWORD_REG = /^(?=.*[A-Za-z])(?=.*\d)[\S]{8,32}$/;
export const USERNAME_MIN = 4;
export const USERNAME_MAX = 32;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 32;

/** redirect query 参数名 */
export const REDIRECT_QUERY_KEY = 'redirect';
