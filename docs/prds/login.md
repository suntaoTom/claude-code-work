# User Login PRD

> Core PRD writing principle: **section headings are anchors** — all `@prd docs/prds/login.md#<anchor>` references rely on these headings for navigation.

## Metadata

| Field        | Value      |
| ------------ | ---------- |
| Module code  | `login`    |
| Owner        | [TBD]      |
| Created      | 2026-04-15 |
| Last updated | 2026-04-15 |
| Status       | draft      |

## Background & Goals

Provide a unified authentication entry point for the admin system. Users log in with a username and password to gain access; the system controls accessible resources by role (admin / user). Unauthenticated users attempting to access any protected page are intercepted and redirected to the login page, then forwarded to the home page upon successful login. Registration and forgot-password entry points are included to reduce the support cost of self-service account recovery.

## Glossary

| Term            | Definition                                                                                        |
| --------------- | ------------------------------------------------------------------------------------------------- |
| access token    | Short-lived authentication token carried on every request                                         |
| refresh token   | Long-lived token used to obtain a new access token after the access token expires                 |
| admin           | Role with full system permissions                                                                 |
| user            | Role with restricted permissions                                                                  |

---

## Feature 1: Username / Password Login

### User Story

As a registered user, I want to log into the admin system with my username and password so that I can use the features available to my role.

### Field Definitions

| Field              | Type    | Required | Validation                                              | Default |
| ------------------ | ------- | -------- | ------------------------------------------------------- | ------- |
| username           | string  | Yes      | [assumption] 4–32 chars, letters / digits / underscores | —       |
| password           | string  | Yes      | [assumption] 8–32 chars, must contain letters and digits | —       |
| remember me        | boolean | No       | —                                                       | false   |

### Business Rules

1. Login button is disabled when username or password is empty
2. When username or password format is invalid, the form displays inline errors and the login button is disabled
3. When credentials are incorrect, display "Incorrect username or password" — do not distinguish which field is wrong (prevents username enumeration)
4. After successful login, always redirect to the home page `/`
5. [assumption] When "remember me" is checked, the refresh token validity period is extended (e.g. 7 days → 30 days); unchecked uses the default validity
6. After login, current user info is accessible globally (must include at least `userId` / `username` / `role`)
7. No CAPTCHA verification
8. No consecutive-failure lockout

### Data Contract (referencing OpenAPI)

> Field details are governed by OpenAPI. The login-related endpoints do not yet exist in `workspace/api-spec/openapi.json`; the following is a frontend proposal based on the PRD.

#### Endpoints Used

| Operation          | operationId      | Method | Path                | Status              |
| ------------------ | ---------------- | ------ | ------------------- | ------------------- |
| Login              | `login`          | POST   | `/api/auth/login`   | 🆕 pending backend |
| Get current user   | `getCurrentUser` | GET    | `/api/auth/me`      | 🆕 pending backend |
| Refresh token      | `refreshToken`   | POST   | `/api/auth/refresh` | 🆕 pending backend |
| Logout             | `logout`         | POST   | `/api/auth/logout`  | 🆕 pending backend |

#### Error Code Mapping

| code  | Meaning                    | Frontend handling                                                                               |
| ----- | -------------------------- | ----------------------------------------------------------------------------------------------- |
| 0     | Success                    | —                                                                                               |
| 40101 | Incorrect username/password | Display "Incorrect username or password" above the form                                        |
| 40102 | Account disabled           | Display "Your account has been disabled. Please contact an admin." above the form              |
| 40103 | Access token expired       | Silently call `refreshToken`; if successful, retry the original request; if failed, clear auth state and redirect to `/login` |
| 40104 | Refresh token expired      | Clear auth state and redirect to `/login`                                                      |
| 50001 | Server error               | Toast "Service error, please try again later"                                                  |

#### Mock Data Convention

- Provide mock handlers for `/api/auth/login`, `/api/auth/me`, `/api/auth/refresh`, and `/api/auth/logout` in `workspace/mock/auth.ts`
- Include two built-in test accounts: `admin/admin123` (role=admin) and `user/user123` (role=user)
- Mock response structures must import `paths` types from `@/types/api` to stay aligned with OpenAPI

### Interaction Flow

```
Navigate to /login → Enter username and password → Client-side validation → Enable login button on pass
→ Click Login → Loading state → POST /api/auth/login
  ├─ Success → Save access/refresh tokens + user info → Redirect to /
  └─ Failure → Display error message above the form
```

### Error Scenarios

| Scenario                    | Expected behavior                                         |
| --------------------------- | --------------------------------------------------------- |
| Request timeout             | Display "Network error, please retry"; button re-enabled |
| Incorrect username/password | Display error above the form; password field cleared     |
| Account disabled            | Display "Your account has been disabled" above the form  |
| Server 5xx                  | Toast "Service error, please try again later"            |

---

## Feature 2: User Registration

### User Story

As an unregistered visitor, I want to create an account through the registration entry point so that I can log in and use the system.

### Field Definitions

| Field            | Type   | Required | Validation                                               | Default |
| ---------------- | ------ | -------- | -------------------------------------------------------- | ------- |
| username         | string | Yes      | [assumption] 4–32 chars, letters / digits / underscores | —       |
| password         | string | Yes      | [assumption] 8–32 chars, must contain letters and digits | —       |
| confirm password | string | Yes      | Must match password                                      | —       |

### Business Rules

1. Register button is disabled when any required field is empty
2. When password and confirm password do not match, display inline error "Passwords do not match"
3. When the username is already taken, the API returns 40201; display "This username is already registered" inline on the username field
4. [assumption] New accounts default to role=user; admin assignment is done separately in the backend
5. After successful registration, redirect to the login page and toast "Registration successful. Please log in."

### Data Contract (referencing OpenAPI)

#### Endpoints Used

| Operation  | operationId | Method | Path                 | Status              |
| ---------- | ----------- | ------ | -------------------- | ------------------- |
| Register   | `register`  | POST   | `/api/auth/register` | 🆕 pending backend |

#### Error Code Mapping

| code  | Meaning                       | Frontend handling                            |
| ----- | ----------------------------- | -------------------------------------------- |
| 0     | Success                       | Redirect to `/login` + toast                 |
| 40201 | Username already exists       | Inline error on username field               |
| 40202 | Password does not meet policy | Inline error on password field               |
| 50001 | Server error                  | Toast "Service error, please try again later"|

### Error Scenarios

| Scenario         | Expected behavior                         |
| ---------------- | ----------------------------------------- |
| Duplicate username | Inline error on username field           |
| Request timeout  | Button re-enabled; toast notification     |

---

## Feature 3: Forgot Password (next iteration — not in this release)

> 📌 This feature is scheduled for the next iteration. Before starting, confirm: credential carrier (email / phone number) / verification code strategy / email or SMS service selection.
> This feature is excluded from `/plan` breakdown in this version; detailed fields / rules / endpoints / error codes will be specified in a new PRD.

---

## Feature 4: Route Guards & Role Permissions

### User Story

As a system administrator, I want unauthenticated visitors to be blocked from any protected page, and different roles to only see features within their permission scope.

### Business Rules

1. All pages except `/login`, `/register`, and `/forgot-password` require an authenticated session
2. When an unauthenticated user accesses a protected page, redirect to `/login` with the original path preserved via `?redirect=<original-path>`
3. After successful login, redirect to the path in `redirect` if present, otherwise to `/`
4. Admin (role=admin) can access all pages
5. When a regular user (role=user) accesses an admin-only page, redirect to `/403`
6. This PRD defines only the permission framework (auth state check + role check + redirect logic); which pages are "admin-only" is declared in each feature's own PRD — not enumerated here
7. User info is initialized via `getInitialState` from `@umijs/plugin-initial-state` and accessed globally through `useModel('@@initialState')`
8. Role permissions are defined in `workspace/src/access.ts` via `@umijs/plugin-access` and enforced on pages using `wrappers` or the `Access` component

### Data Contract

- On page load, `getInitialState` calls `getCurrentUser` to retrieve the current user; responses of 40101 / 40104 are treated as unauthenticated
- When the access token expires, the global request interceptor automatically calls `refreshToken` once; on failure it clears auth state and redirects to `/login`

---

## Feature 5: Logout

### User Story

As a logged-in user, I want to log out proactively to protect my account on shared devices.

### Business Rules

1. On logout, call `/api/auth/logout` to invalidate the server-side token
2. Regardless of the API result, the frontend always clears the local access/refresh tokens and user info
3. After logout, redirect to `/login`

### Data Contract

| Operation | operationId | Method | Path               | Status              |
| --------- | ----------- | ------ | ------------------ | ------------------- |
| Logout    | `logout`    | POST   | `/api/auth/logout` | 🆕 pending backend |

---

## API Proposal (OpenAPI stub)

> The following is a frontend-drafted OpenAPI proposal inferred from this PRD. After review, the backend will merge it into `workspace/api-spec/openapi.json` (or temporarily into `workspace/api-spec/openapi.local.json`). Field types are pending final backend confirmation.

```yaml
paths:
  /api/auth/login:
    post:
      operationId: login
      summary: Username / password login
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [username, password]
              properties:
                username: { type: string }
                password: { type: string, format: password }
                remember: { type: boolean }
      responses:
        "200":
          content:
            application/json:
              schema:
                type: object
                properties:
                  code: { type: integer }
                  data:
                    type: object
                    properties:
                      accessToken: { type: string }
                      refreshToken: { type: string }
                      expiresIn:
                        { type: integer, description: access token validity in seconds }

  /api/auth/me:
    get:
      operationId: getCurrentUser
      summary: Get the currently logged-in user
      responses:
        "200":
          content:
            application/json:
              schema:
                type: object
                properties:
                  userId: { type: string }
                  username: { type: string }
                  role: { type: string, enum: [admin, user] }
                  avatar: { type: string }

  /api/auth/refresh:
    post:
      operationId: refreshToken
      summary: Exchange refresh token for a new access token
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [refreshToken]
              properties:
                refreshToken: { type: string }
      responses:
        "200":
          content:
            application/json:
              schema:
                type: object
                properties:
                  accessToken: { type: string }
                  expiresIn: { type: integer }

  /api/auth/logout:
    post:
      operationId: logout
      summary: Logout and invalidate the server-side token
      responses:
        "200": { description: Success }

  /api/auth/register:
    post:
      operationId: register
      summary: User registration
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [username, password]
              properties:
                username: { type: string }
                password: { type: string, format: password }
                email: { type: string, format: email }
                phone: { type: string }
      responses:
        "200": { description: Success }
```

---

## Acceptance Checklist

- [ ] Accessing any protected page while unauthenticated → redirect to `/login?redirect=<original-path>`
- [ ] Successful login → redirect to `redirect` or `/`
- [ ] Logout → tokens cleared + redirect to `/login`
- [ ] Access token expired → silent refresh; transparent to the user
- [ ] Refresh token expired → clear auth state + redirect to `/login`
- [ ] Admin can access admin-only pages; regular users are blocked to `/403`
- [ ] All forms disable the submit button or show inline errors when empty / invalid
- [ ] Login and registration pages behave consistently in Chrome and Safari
- [ ] All copy is introduced via i18n — no hardcoded strings

## Default Assumptions Summary (to confirm in review)

> The following are AI-generated defaults based on common patterns. Confirm or revise each item in the review meeting. Once approved they become official rules; no need to mark them in the body text.

- Username: 4–32 chars, letters / digits / underscores
- Password: 8–32 chars, must contain both letters and digits
- New accounts default to role=user; admin is assigned separately in the backend
- "Remember me" affects refresh token validity (7 days → 30 days)
- Unauthenticated users always redirect to `/login` with `?redirect=<original-path>`
- When access token expires, the global request interceptor silently refreshes once; on failure, clears auth state and redirects to `/login`

## Change Log

| Date       | Changes                                           | Author  |
| ---------- | ------------------------------------------------- | ------- |
| 2026-04-15 | Initial version; forgot password deferred to next iteration | [TBD] |
