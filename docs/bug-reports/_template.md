# UI 测试报告: <模块 / 页面名>

> **这份模板是机读的**, 字段格式固定。测试端 AI 填写时请严格遵守结构, 不要自由发挥。
> 填写规则见 [README.md](./README.md)。

## 元信息

| 项 | 值 |
|----|----|
| 报告 ID | `2026-04-16-login` (= 文件名去掉扩展名) |
| 创建日期 | 2026-04-16 |
| 测试工具 | Playwright MCP / Browser Use / Claude Computer Use / Appium / 模拟器 / 其他 |
| 测试范围 | `/login`, `/register` |
| 设备 / 浏览器 / 分辨率 | Chrome 131 / 1440x900 或 iPhone 15 Pro / Safari / 390x844 |
| 触发人 | @username (人触发) / ci (自动触发) |
| 关联 PRD | docs/prds/login.md (如涉及多个可列多行) |

## 概览 (必填)

> 所有 bug 先在这个表里汇总一遍, 下面再逐个展开。`/fix` 会优先读这个表决定分组策略。

| Bug ID | 优先级 | 模块 | 现象 (一句话) |
|--------|-------|------|--------------|
| B001 | P0 | login | 登录成功后 Dashboard 白屏 |
| B002 | P1 | login | 勾选"记住我"后 token 有效期未延长 |
| B003 | P2 | register | 提交按钮 hover 颜色与 Design Token 不符 |

**优先级定义**:
- **P0**: 阻塞主流程 (登录/支付/核心数据), 必须立即修
- **P1**: 功能异常但有绕过方式, 本迭代内修
- **P2**: 视觉/文案/次要交互, 可排期

---

## Bug B001

- **优先级**: P0
- **模块**: login
- **关联 PRD**: docs/prds/login.md#账号密码登录
- **关联任务** (可选, 测试端 AI 推断填写): docs/tasks/tasks-login-2026-04-15.json#T008
- **涉及文件** (可选, 测试端 AI 推断填写): workspace/src/pages/index.tsx

### 现象

> 一句话描述看到了什么问题。不要写"页面有 bug", 要具体。

登录成功后跳转到 `/`, 页面完全白屏, 控制台报 `TypeError: Cannot read property 'name' of undefined`

### 复现

- **URL**: `/login`
- **前置条件**: 测试账号 `admin/admin123`, 浏览器清空 localStorage
- **步骤** (编号有序, 每步一行):
  1. 打开 `/login`
  2. 账号输入框输入 `admin`
  3. 密码输入框输入 `admin123`
  4. 点击"登录"按钮
  5. 等待页面跳转完成

### 期望 vs 实际

| 期望 | 实际 |
|------|------|
| 跳转到 `/`, 显示 Dashboard 内容 | 跳转到 `/`, 页面白屏, 无任何渲染 |

### 控制台错误

> 粘贴浏览器 DevTools Console 的报错原文, 保留堆栈。无报错时写"无"。

```
TypeError: Cannot read property 'name' of undefined
    at Dashboard (workspace/src/pages/index.tsx:15:23)
    at renderWithHooks (react-dom.development.js:14985)
    ...
```

### 网络请求

> 列出相关的 API 调用及响应, 无则写"无"。

| 时机 | 请求 | 状态 | 备注 |
|------|------|------|------|
| 点击登录 | `POST /api/auth/login` | 200 | 返回 token 正常 |
| 跳转后 | `GET /api/auth/me` | 200 | response 缺少 `name` 字段, 只有 `userId` / `role` |

### 截图

> 截图放在 `docs/bug-reports/screenshots/<Bug ID>-<编号>.png`, 可多张。无则留空或删除此段。

- `docs/bug-reports/screenshots/B001-01-blank.png` — 白屏截图
- `docs/bug-reports/screenshots/B001-02-devtools.png` — Console 报错截图

### 根因推测 (可选, 测试端 AI 可留空)

> 测试端 AI 如果能读源码, 可以给一个推测, 但**不要修代码**。推测仅供 `/fix` 参考。

推测: Dashboard 组件从 `useModel('@@initialState').currentUser.name` 取数据, 但 `getCurrentUser` 接口返回的 user 对象没有 `name` 字段。需 `/fix` 进一步验证 (改接口还是改组件取字段方式)。

---

## Bug B002

- **优先级**: P1
- **模块**: login
- **关联 PRD**: docs/prds/login.md#账号密码登录

### 现象

勾选"记住我"登录后, 关闭浏览器 8 天再打开, token 已失效需要重新登录。期望 30 天内免登录。

### 复现

- **URL**: `/login`
- **前置条件**: 清空 cookie/localStorage
- **步骤**:
  1. 输入账号密码
  2. **勾选"记住我"**
  3. 点击登录
  4. 观察 `localStorage.refreshTokenExpiresAt` 的值

### 期望 vs 实际

| 期望 | 实际 |
|------|------|
| refreshTokenExpiresAt 距今 30 天 | refreshTokenExpiresAt 距今 7 天 (和不勾选"记住我"一样) |

### 控制台错误

无

### 网络请求

| 时机 | 请求 | 状态 | 备注 |
|------|------|------|------|
| 点击登录 | `POST /api/auth/login` | 200 | **request body 没带 `remember: true` 字段** |

### 截图

无

### 根因推测 (可选)

推测: `workspace/src/features/login/api/loginApi.ts` 的请求函数漏传 `remember` 参数。违反 `@rules` "勾选记住我时 refresh token 有效期延长"。

---

## Bug B003

- **优先级**: P2
- **模块**: register
- **关联 PRD**: docs/prds/login.md#用户注册

### 现象

注册页"提交"按钮 hover 时背景色为 `#1890ff`, 但 Design Token 主色已改为 `#2563eb`。

### 复现

- **URL**: `/register`
- **步骤**:
  1. 打开 `/register`
  2. 鼠标悬停在"提交"按钮上

### 期望 vs 实际

| 期望 | 实际 |
|------|------|
| 背景色 = `token.colorPrimaryHover` (= `#3b7fe8`) | 背景色 = `#1890ff` (硬编码, 违反 P0 禁止硬编码规则) |

### 控制台错误

无

### 网络请求

无

### 截图

- `docs/bug-reports/screenshots/B003-hover.png`

### 根因推测

推测是 RegisterForm 的某处 style 里写了 `backgroundColor: '#1890ff'` 而非引用 `token`。违反 `.claude/rules/no-hardcode.md`。
