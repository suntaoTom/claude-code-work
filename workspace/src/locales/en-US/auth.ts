/**
 * @description auth module English language pack
 * @module locales/en-US
 * @prd docs/prds/login.md#功能点-1-账号密码登录
 * @task docs/tasks/tasks-login-2026-04-15.json#T007
 */
export default {
  'auth.title.login': 'Sign In',
  'auth.title.register': 'Sign Up',
  'auth.action.login': 'Sign In',
  'auth.action.register': 'Sign Up',
  'auth.action.logout': 'Sign Out',
  'auth.action.backToLogin': 'Back to Sign In',
  'auth.action.backToHome': 'Back to Home',
  'auth.link.toRegister': "Don't have an account? Sign up",
  'auth.link.toLogin': 'Already have an account? Sign in',

  'auth.field.username': 'Username',
  'auth.field.username.placeholder': 'Enter username',
  'auth.field.password': 'Password',
  'auth.field.password.placeholder': 'Enter password',
  'auth.field.confirmPassword': 'Confirm Password',
  'auth.field.confirmPassword.placeholder': 'Re-enter password',
  'auth.field.remember': 'Remember me',

  'auth.validate.username.required': 'Please enter username',
  'auth.validate.username.format':
    'Username must be 4-32 characters of letters, digits or underscore',
  'auth.validate.password.required': 'Please enter password',
  'auth.validate.password.format':
    'Password must be 8-32 characters and contain both letters and digits',
  'auth.validate.confirmPassword.required': 'Please re-enter password',
  'auth.validate.confirmPassword.mismatch': 'The two passwords do not match',

  'auth.error.invalidCredential': 'Invalid username or password',
  'auth.error.accountDisabled': 'Account disabled, please contact administrator',
  'auth.error.usernameExists': 'This username is already registered',
  'auth.error.weakPassword': 'Password does not meet strength requirements',
  'auth.error.serverError': 'Server error, please try again later',
  'auth.error.network': 'Network error, please try again',

  'auth.role.admin': 'Administrator',
  'auth.role.user': 'User',

  'auth.toast.registerSuccess': 'Registered successfully, please sign in',
  'auth.toast.logoutSuccess': 'Signed out',

  'auth.403.title': 'Access Denied',
  'auth.403.subtitle': 'Sorry, you are not authorized to access this page',
};
