import { ICoolDown, IEmailLoginLog, IOneTimePasswordResult } from '@/interfaces/email';
import {
  EMAIL_LOGIN_ACTION,
  EMAIL_LOGIN_REGISTER_COOLDOWN_IN_S,
  EMAIL_LOGIN_TOO_MANY_ATTEMPTS_COOLDOWN_IN_S,
  MAX_EMIL_LOGIN_ERROR_TIMES,
} from '@/constants/email_login';
import { getTimestampNow } from '@/lib/utils/common';
import { ONE_HOUR_IN_S } from '@/constants/time';

class EmailLoginHandler {
  private static logs: IEmailLoginLog[] = [];

  public static checkLoginTimes(email: string): ICoolDown {
    const nowInSecond = getTimestampNow();
    const loginCount = this.logs.filter(
      (log) =>
        log.email === email &&
        log.action === EMAIL_LOGIN_ACTION.VERIFY &&
        log.createdAt > nowInSecond - ONE_HOUR_IN_S
    ).length;
    // Info: (20250509 - Luphia) 一小時內登入失敗次數超過上限，每多一次登入失敗，冷卻時間增加 10 分鐘
    const coolDownAt =
      nowInSecond +
      (loginCount - MAX_EMIL_LOGIN_ERROR_TIMES) * EMAIL_LOGIN_TOO_MANY_ATTEMPTS_COOLDOWN_IN_S;
    const result = {
      coolDown: EMAIL_LOGIN_TOO_MANY_ATTEMPTS_COOLDOWN_IN_S,
      coolDownAt,
      maxAttempts: MAX_EMIL_LOGIN_ERROR_TIMES,
      attempts: loginCount,
    };
    return result;
  }

  public static checkRegisterCooldown(email: string): IOneTimePasswordResult | undefined {
    const nowInSecond = getTimestampNow();
    const cooldownTime = nowInSecond - EMAIL_LOGIN_REGISTER_COOLDOWN_IN_S;
    const registerCount = this.logs.filter(
      (log) =>
        log.email === email &&
        log.action === EMAIL_LOGIN_ACTION.REGISTER &&
        log.createdAt > cooldownTime
    ).length;
    const result = {
      isAvailable: registerCount === 0,
      email,
      expiredAt: nowInSecond + EMAIL_LOGIN_REGISTER_COOLDOWN_IN_S,
      coolDown: EMAIL_LOGIN_REGISTER_COOLDOWN_IN_S,
      coolDownAt: nowInSecond + EMAIL_LOGIN_REGISTER_COOLDOWN_IN_S,
    };
    return result;
  }

  public static cleanLogs(email: string): void {
    this.logs = this.logs.filter((log) => log.email !== email);
  }

  public static log(email: string, action: EMAIL_LOGIN_ACTION): void {
    const nowInSecond = getTimestampNow();
    const log = {
      email,
      action,
      createdAt: nowInSecond,
    };
    this.logs.push(log);
  }
}

export default EmailLoginHandler;
