# mock

> Umi 内置 mock 数据, 提供给 dev 环境模拟后端响应

## 文件清单

| 文件名 | 说明 | 依赖 | 最后更新 |
|--------|------|------|----------|
| list.ts | 列表模块 mock (keyword/status 筛选 + 分页) | - | 2026-03-30 |
| auth.ts | auth 模块 mock (login/me/refresh/logout/register), 内置 admin/user/banned 三个测试账号 | @/types/api, src/features/auth/constants | 2026-04-16 |

## 测试账号

| 账号 | 密码 | 角色 | 备注 |
|------|------|------|------|
| admin | admin123 | admin | 管理员 |
| user | user123 | user | 普通用户 |
| banned | banned123 | user | 已禁用 (登录返回 40102) |
