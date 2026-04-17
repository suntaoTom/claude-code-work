/**
 * @description auth 模块 API 请求封装 (login / getCurrentUser / refreshToken / logout / register)
 * @module features/auth/api
 * @dependencies @umijs/max request, @/types/api, features/auth/constants
 * @prd docs/prds/login.md#数据契约-引用-openapi
 * @task docs/tasks/tasks-login-2026-04-15.json#T005
 * @rules
 *   - 登录成功后, 全局可访问当前用户信息 (至少包含 userId / username / role)
 *   - 页面加载时, getInitialState 调用 getCurrentUser 获取当前用户; 未登录 (40101 / 40104) 视为无登录态
 */
import { request } from '@umijs/max';
import type { paths } from '@/types/api';
import { AUTH_API } from '../constants';

type JsonRequestBody<T> = T extends { requestBody: { content: { 'application/json': infer B } } }
  ? B
  : never;

type JsonResponseBody<T> = T extends {
  responses: { 200: { content: { 'application/json': infer B } } };
}
  ? B
  : never;

type LoginOp = paths['/api/auth/login']['post'];
type GetCurrentUserOp = paths['/api/auth/me']['get'];
type RefreshTokenOp = paths['/api/auth/refresh']['post'];
type LogoutOp = paths['/api/auth/logout']['post'];
type RegisterOp = paths['/api/auth/register']['post'];

export type LoginParams = JsonRequestBody<LoginOp>;
export type LoginResponse = JsonResponseBody<LoginOp>;

export type GetCurrentUserResponse = JsonResponseBody<GetCurrentUserOp>;
export type CurrentUser = NonNullable<GetCurrentUserResponse['data']>;

export type RefreshTokenParams = JsonRequestBody<RefreshTokenOp>;
export type RefreshTokenResponse = JsonResponseBody<RefreshTokenOp>;

export type LogoutResponse = JsonResponseBody<LogoutOp>;

export type RegisterParams = JsonRequestBody<RegisterOp>;
export type RegisterResponse = JsonResponseBody<RegisterOp>;

export function login(params: LoginParams): Promise<LoginResponse> {
  return request<LoginResponse>(AUTH_API.LOGIN, {
    method: 'POST',
    data: params,
  });
}

export function getCurrentUser(): Promise<GetCurrentUserResponse> {
  return request<GetCurrentUserResponse>(AUTH_API.ME, {
    method: 'GET',
  });
}

export function refreshToken(params: RefreshTokenParams): Promise<RefreshTokenResponse> {
  return request<RefreshTokenResponse>(AUTH_API.REFRESH, {
    method: 'POST',
    data: params,
  });
}

export function logout(): Promise<LogoutResponse> {
  return request<LogoutResponse>(AUTH_API.LOGOUT, {
    method: 'POST',
  });
}

export function register(params: RegisterParams): Promise<RegisterResponse> {
  return request<RegisterResponse>(AUTH_API.REGISTER, {
    method: 'POST',
    data: params,
  });
}
