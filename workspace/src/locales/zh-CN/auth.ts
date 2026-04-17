/**
 * @description auth 模块中文语言包: 登录/注册/登出/路由守卫所有展示文案
 * @module locales/zh-CN
 * @prd docs/prds/login.md#功能点-1-账号密码登录
 * @task docs/tasks/tasks-login-2026-04-15.json#T007
 * @rules
 *   - 账号或密码错误时, 显示「账号或密码错误」, 不区分具体是哪一项错误 (防止账号枚举)
 *   - 账号已被占用时, 接口返回 40201, 表单在账号字段显示「该账号已被注册」
 *   - 注册成功后, 跳转到登录页并 toast「注册成功, 请登录」
 */
export default {
  // 通用
  'auth.title.login': '登录',
  'auth.title.register': '注册',
  'auth.action.login': '登录',
  'auth.action.register': '注册',
  'auth.action.logout': '登出',
  'auth.action.backToLogin': '返回登录',
  'auth.action.backToHome': '返回首页',
  'auth.link.toRegister': '没有账号? 立即注册',
  'auth.link.toLogin': '已有账号? 直接登录',

  // 字段 label / placeholder
  'auth.field.username': '账号',
  'auth.field.username.placeholder': '请输入账号',
  'auth.field.password': '密码',
  'auth.field.password.placeholder': '请输入密码',
  'auth.field.confirmPassword': '确认密码',
  'auth.field.confirmPassword.placeholder': '请再次输入密码',
  'auth.field.remember': '记住我',

  // 校验失败
  'auth.validate.username.required': '请输入账号',
  'auth.validate.username.format': '账号需为 4-32 位字母、数字或下划线',
  'auth.validate.password.required': '请输入密码',
  'auth.validate.password.format': '密码需为 8-32 位, 必须含字母和数字',
  'auth.validate.confirmPassword.required': '请再次输入密码',
  'auth.validate.confirmPassword.mismatch': '两次密码输入不一致',

  // 错误码对应文案
  'auth.error.invalidCredential': '账号或密码错误',
  'auth.error.accountDisabled': '账号已被禁用, 请联系管理员',
  'auth.error.usernameExists': '该账号已被注册',
  'auth.error.weakPassword': '密码强度不符合要求',
  'auth.error.serverError': '服务异常, 请稍后重试',
  'auth.error.network': '网络异常, 请重试',

  // 角色
  'auth.role.admin': '管理员',
  'auth.role.user': '普通用户',

  // toast
  'auth.toast.registerSuccess': '注册成功, 请登录',
  'auth.toast.logoutSuccess': '已退出登录',

  // 403
  'auth.403.title': '无访问权限',
  'auth.403.subtitle': '抱歉, 你没有权限访问此页面',
};
