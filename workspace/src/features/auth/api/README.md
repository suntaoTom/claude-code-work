# auth/api

> auth 模块后端接口请求封装

## 文件清单

| 文件名 | 说明 | 依赖 | 最后更新 |
|--------|------|------|----------|
| authApi.ts | 5 个 auth 接口封装: login / getCurrentUser / refreshToken / logout / register | @umijs/max request, @/types/api, ../constants | 2026-04-16 |

## 模块关系

入参/出参类型一律从 `@/types/api` 的 `paths` 提取, 禁止手写 interface。错误统一交给 `app.ts` 的 errorHandler。
