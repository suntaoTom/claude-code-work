# UI Test Report: <Module / Page Name>

> **This template is machine-readable**, so the field format is fixed. Test-side AIs must follow the structure strictly and not improvise.
> See [README.md](./README.md) for filling rules.

## Metadata

| Item | Value |
|------|-------|
| Report ID | `2026-04-16-login` (= filename without extension) |
| Created | 2026-04-16 |
| Test Tool | Playwright MCP / Browser Use / Claude Computer Use / Appium / Simulator / Other |
| Test Scope | `/login`, `/register` |
| Device / Browser / Resolution | Chrome 131 / 1440x900 or iPhone 15 Pro / Safari / 390x844 |
| Triggered By | @username (human) / ci (automated) |
| Related PRD | docs/prds/login.md (list multiple lines if applicable) |

## Overview (Required)

> Summarize every bug here first, then expand each below. `/fix` prefers this table when deciding grouping strategy.

| Bug ID | Priority | Module | Symptom (one-line) |
|--------|----------|--------|--------------------|
| B001 | P0 | login | Dashboard shows blank screen after successful login |
| B002 | P1 | login | Checking "Remember me" does not extend the token lifetime |
| B003 | P2 | register | Submit button hover color does not match Design Tokens |

**Priority definitions**:
- **P0**: Blocks the main flow (login / payment / core data) — must be fixed immediately
- **P1**: Feature is broken but has a workaround — fix in the current iteration
- **P2**: Visual / copy / minor interaction — can be scheduled

---

## Bug B001

- **Priority**: P0
- **Module**: login
- **Related PRD**: docs/prds/login.md#账号密码登录
- **Related Task** (optional, test-side AI can infer): docs/tasks/tasks-login-2026-04-15.json#T008
- **Affected Files** (optional, test-side AI can infer): workspace/src/pages/index.tsx

### Symptom

> One-sentence description of what you observed. Do not write "the page has a bug" — be specific.

After a successful login, the page redirects to `/` but the screen goes completely blank, and the console throws `TypeError: Cannot read property 'name' of undefined`.

### Reproduction

- **URL**: `/login`
- **Preconditions**: Test account `admin/admin123`, browser localStorage cleared
- **Steps** (numbered, one per line):
  1. Open `/login`
  2. Enter `admin` in the username field
  3. Enter `admin123` in the password field
  4. Click the "Login" button
  5. Wait for the redirect to complete

### Expected vs. Actual

| Expected | Actual |
|----------|--------|
| Redirect to `/`, render Dashboard content | Redirect to `/`, page is blank, nothing renders |

### Console Errors

> Paste the error verbatim from DevTools Console, keeping the stack trace. Write "none" if there are no errors.

```
TypeError: Cannot read property 'name' of undefined
    at Dashboard (workspace/src/pages/index.tsx:15:23)
    at renderWithHooks (react-dom.development.js:14985)
    ...
```

### Network Requests

> List the relevant API calls and responses; "none" if irrelevant.

| Timing | Request | Status | Notes |
|--------|---------|--------|-------|
| Click login | `POST /api/auth/login` | 200 | Token returned normally |
| After redirect | `GET /api/auth/me` | 200 | Response missing `name` field; only `userId` / `role` present |

### Screenshots

> Screenshots go under `docs/bug-reports/screenshots/<Bug ID>-<sequence>.png`; can be multiple. Leave empty or delete this section if none.

- `docs/bug-reports/screenshots/B001-01-blank.png` — blank-screen screenshot
- `docs/bug-reports/screenshots/B001-02-devtools.png` — console-error screenshot

### Root-Cause Guess (optional — test-side AI may leave blank)

> If the test-side AI can read source code, it may offer a guess, but **must not change code**. The guess is just a hint for `/fix`.

Guess: Dashboard reads data via `useModel('@@initialState').currentUser.name`, but the `getCurrentUser` endpoint's response lacks a `name` field. `/fix` needs to verify (change the API or change how the component reads the field).

---

## Bug B002

- **Priority**: P1
- **Module**: login
- **Related PRD**: docs/prds/login.md#账号密码登录

### Symptom

After logging in with "Remember me" checked, closing the browser and reopening it 8 days later requires re-login. Expected: 30-day passive session.

### Reproduction

- **URL**: `/login`
- **Preconditions**: Clear cookies / localStorage
- **Steps**:
  1. Enter username and password
  2. **Check "Remember me"**
  3. Click login
  4. Inspect the value of `localStorage.refreshTokenExpiresAt`

### Expected vs. Actual

| Expected | Actual |
|----------|--------|
| refreshTokenExpiresAt is 30 days from now | refreshTokenExpiresAt is 7 days from now (same as when "Remember me" is unchecked) |

### Console Errors

None

### Network Requests

| Timing | Request | Status | Notes |
|--------|---------|--------|-------|
| Click login | `POST /api/auth/login` | 200 | **Request body omits the `remember: true` field** |

### Screenshots

None

### Root-Cause Guess (optional)

Guess: The request function in `workspace/src/features/login/api/loginApi.ts` omits the `remember` parameter, violating the `@rules` entry "when Remember me is checked, the refresh token's lifetime is extended".

---

## Bug B003

- **Priority**: P2
- **Module**: register
- **Related PRD**: docs/prds/login.md#用户注册

### Symptom

The "Submit" button on the register page shows a `#1890ff` background on hover, but the Design Token primary color was updated to `#2563eb`.

### Reproduction

- **URL**: `/register`
- **Steps**:
  1. Open `/register`
  2. Hover the mouse over the "Submit" button

### Expected vs. Actual

| Expected | Actual |
|----------|--------|
| Background = `token.colorPrimaryHover` (= `#3b7fe8`) | Background = `#1890ff` (hardcoded, violates the P0 No Hardcoding rule) |

### Console Errors

None

### Network Requests

None

### Screenshots

- `docs/bug-reports/screenshots/B003-hover.png`

### Root-Cause Guess

Guess: somewhere in RegisterForm a `backgroundColor: '#1890ff'` is written inline instead of referencing `token`. Violates `.claude/rules/no-hardcode.md`.
