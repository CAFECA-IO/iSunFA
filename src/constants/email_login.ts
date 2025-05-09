export enum EMAIL_LOGIN_ACTION {
  REGISTER = 'register',
  VERIFY = 'verify',
}

export const MAX_EMIL_LOGIN_ERROR_TIMES = 5;
export const EMAIL_LOGIN_REGISTER_COOLDOWN_IN_S = 3 * 60;
export const EMAIL_LOGIN_TOO_MANY_ATTEMPTS_COOLDOWN_IN_S = 10 * 60;
