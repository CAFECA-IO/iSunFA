import { IEmailLoginLog } from '@/interfaces/email';
import {
  EMAIL_LOGIN_ACTION,
  EMAIL_LOGIN_REGISTER_COOLDOWN_IN_S,
  MAX_EMIL_LOGIN_ERROR_TIMES,
} from '@/constants/email';
import { getTimestampNow } from '@/lib/utils/common';

class EmailLoginHandler {
  // Info: (20250428 - Luphia) singleton
  private static instance: EmailLoginHandler;

  private static logs: IEmailLoginLog[] = [];

  public static checkLoginTimes(email: string): boolean {
    const nowInSecond = getTimestampNow();
    const loginCount = this.logs.filter(
      (log) =>
        log.email === email &&
        log.action === EMAIL_LOGIN_ACTION.VERIFY &&
        log.createdAt > nowInSecond - 60 * 60
    ).length;
    const result = loginCount < MAX_EMIL_LOGIN_ERROR_TIMES;
    const log = {
      email,
      action: EMAIL_LOGIN_ACTION.VERIFY,
      createdAt: nowInSecond,
    };
    this.logs.push(log);
    return result;
  }

  public static checkRegisterCooldown(email: string): boolean {
    const nowInSecond = getTimestampNow();
    const cooldownTime = nowInSecond - EMAIL_LOGIN_REGISTER_COOLDOWN_IN_S;
    const registerCount = this.logs.filter(
      (log) =>
        log.email === email &&
        log.action === EMAIL_LOGIN_ACTION.REGISTER &&
        log.createdAt > cooldownTime
    ).length;
    const result = registerCount === 0;
    const log = {
      email,
      action: EMAIL_LOGIN_ACTION.REGISTER,
      createdAt: nowInSecond,
    };
    this.logs.push(log);
    return result;
  }

  public static cleanLogs(email: string): void {
    this.logs = this.logs.filter((log) => log.email !== email);
  }
}

export default EmailLoginHandler;
