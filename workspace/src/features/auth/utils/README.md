# auth/utils

> auth 模块工具函数

## 文件清单

| 文件名 | 说明 | 依赖 | 最后更新 |
|--------|------|------|----------|
| tokenStorage.ts | access/refresh token 在 localStorage 的存取与清空 | features/auth/constants | 2026-04-16 |

## 模块关系

被 `app.ts` 拦截器、`useAuth` hook 共同使用; 不依赖 React/antd, 是纯函数模块。
