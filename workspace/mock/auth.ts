/**
 * @description auth 模块 mock: 内置 admin/admin123 与 user/user123, 错误账号返回 40101, 已禁用 40102, 重复注册 40201
 * @module mock
 * @dependencies @/types/api, src/features/auth/constants
 * @prd docs/prds/login.md#mock-数据约定
 * @task docs/tasks/tasks-login-2026-04-15.json#T006
 * @rules
 *   - 账号或密码错误时, 显示「账号或密码错误」, 不区分具体是哪一项错误 (防止账号枚举)
 *   - 账号已被占用时, 接口返回 40201, 表单在账号字段显示「该账号已被注册」
 */
import type { paths } from '../src/types/api';
import { AUTH_ERROR_CODE, ROLE } from '../src/features/auth/constants';

type LoginBody = paths['/api/auth/login']['post']['requestBody']['content']['application/json'];
type LoginResponse =
  paths['/api/auth/login']['post']['responses'][200]['content']['application/json'];
type CurrentUserResponse =
  paths['/api/auth/me']['get']['responses'][200]['content']['application/json'];
type RefreshBody =
  paths['/api/auth/refresh']['post']['requestBody']['content']['application/json'];
type RefreshResponse =
  paths['/api/auth/refresh']['post']['responses'][200]['content']['application/json'];
type LogoutResponse =
  paths['/api/auth/logout']['post']['responses'][200]['content']['application/json'];
type RegisterBody =
  paths['/api/auth/register']['post']['requestBody']['content']['application/json'];
type RegisterResponse =
  paths['/api/auth/register']['post']['responses'][200]['content']['application/json'];

interface MockReq<TBody = unknown> {
  body: TBody;
  headers: Record<string, string | undefined>;
}

interface MockRes {
  status: (code: number) => MockRes;
  json: (data: unknown) => void;
}

interface MockUser {
  userId: string;
  username: string;
  password: string;
  role: 'admin' | 'user';
  disabled?: boolean;
}

const ACCESS_TOKEN_TTL_SEC = 60 * 30;
const ACCESS_TOKEN_PREFIX = 'mock-access-token-';
const REFRESH_TOKEN_PREFIX = 'mock-refresh-token-';

const users: MockUser[] = [
  { userId: 'u-001', username: 'admin', password: 'admin123', role: ROLE.ADMIN },
  { userId: 'u-002', username: 'user', password: 'user123', role: ROLE.USER },
  { userId: 'u-003', username: 'banned', password: 'banned123', role: ROLE.USER, disabled: true },
];

const findUser = (username?: string) => users.find((u) => u.username === username);

const parseBearer = (auth?: string): string | undefined => {
  if (!auth) return undefined;
  const [scheme, value] = auth.split(' ');
  return scheme === 'Bearer' ? value : undefined;
};

const findUserByAccessToken = (token?: string) => {
  if (!token || !token.startsWith(ACCESS_TOKEN_PREFIX)) return undefined;
  const userId = token.slice(ACCESS_TOKEN_PREFIX.length);
  return users.find((u) => u.userId === userId);
};

export default {
  'POST /api/auth/login': (req: MockReq<LoginBody>, res: MockRes) => {
    const { username, password } = req.body || ({} as LoginBody);
    const user = findUser(username);

    if (!user || user.password !== password) {
      const body: LoginResponse = { code: AUTH_ERROR_CODE.INVALID_CREDENTIAL };
      return res.json(body);
    }

    if (user.disabled) {
      const body: LoginResponse = { code: AUTH_ERROR_CODE.ACCOUNT_DISABLED };
      return res.json(body);
    }

    const body: LoginResponse = {
      code: 0,
      data: {
        accessToken: `${ACCESS_TOKEN_PREFIX}${user.userId}`,
        refreshToken: `${REFRESH_TOKEN_PREFIX}${user.userId}`,
        expiresIn: ACCESS_TOKEN_TTL_SEC,
      },
    };
    return res.json(body);
  },

  'GET /api/auth/me': (req: MockReq, res: MockRes) => {
    const token = parseBearer(req.headers.authorization);
    const user = findUserByAccessToken(token);
    if (!user) {
      const body: CurrentUserResponse = { code: AUTH_ERROR_CODE.INVALID_CREDENTIAL };
      return res.json(body);
    }
    const body: CurrentUserResponse = {
      code: 0,
      data: {
        userId: user.userId,
        username: user.username,
        role: user.role,
        avatar: '',
      },
    };
    return res.json(body);
  },

  'POST /api/auth/refresh': (req: MockReq<RefreshBody>, res: MockRes) => {
    const { refreshToken } = req.body || ({} as RefreshBody);
    if (!refreshToken || !refreshToken.startsWith(REFRESH_TOKEN_PREFIX)) {
      const body: RefreshResponse = { code: AUTH_ERROR_CODE.REFRESH_TOKEN_EXPIRED };
      return res.json(body);
    }
    const userId = refreshToken.slice(REFRESH_TOKEN_PREFIX.length);
    const user = users.find((u) => u.userId === userId);
    if (!user) {
      const body: RefreshResponse = { code: AUTH_ERROR_CODE.REFRESH_TOKEN_EXPIRED };
      return res.json(body);
    }
    const body: RefreshResponse = {
      code: 0,
      data: {
        accessToken: `${ACCESS_TOKEN_PREFIX}${user.userId}`,
        expiresIn: ACCESS_TOKEN_TTL_SEC,
      },
    };
    return res.json(body);
  },

  'POST /api/auth/logout': (_req: MockReq, res: MockRes) => {
    const body: LogoutResponse = { code: 0, message: 'ok' };
    return res.json(body);
  },

  'POST /api/auth/register': (req: MockReq<RegisterBody>, res: MockRes) => {
    const { username, password } = req.body || ({} as RegisterBody);
    if (!username || !password) {
      const body: RegisterResponse = { code: AUTH_ERROR_CODE.WEAK_PASSWORD };
      return res.json(body);
    }
    if (findUser(username)) {
      const body: RegisterResponse = { code: AUTH_ERROR_CODE.USERNAME_EXISTS };
      return res.json(body);
    }
    const newUser: MockUser = {
      userId: `u-${String(users.length + 1).padStart(3, '0')}`,
      username,
      password,
      role: ROLE.USER,
    };
    users.push(newUser);
    const body: RegisterResponse = { code: 0, message: 'ok' };
    return res.json(body);
  },
};
