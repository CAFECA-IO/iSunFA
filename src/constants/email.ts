export enum MJML_FILE {
  FREE = 'src/email/free.mjml',
  INVITE = 'src/email/invite.mjml',
  PAY = 'src/email/pay.mjml',
  PAY_ERROR = 'src/email/pay_error.mjml',
  SUBSCRIBE = 'src/email/subscribe.mjml',
}

export enum EMAIL_LOGIN_ACTION {
  REGISTER = 'register',
  VERIFY = 'verify',
}

export const MAX_EMIL_LOGIN_ERROR_TIMES = 5;
export const EMAIL_LOGIN_REGISTER_COOLDOWN_IN_S = 5 * 60;
