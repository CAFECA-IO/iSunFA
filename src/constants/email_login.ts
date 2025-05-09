export enum EMAIL_LOGIN_ACTION {
  REGISTER = 'register',
  VERIFY = 'verify',
}

export const MAX_EMIL_LOGIN_ERROR_TIMES = 5;
export const EMAIL_LOGIN_REGISTER_COOLDOWN_IN_S = 5 * 60;
