import EmailLoginHandler from '@/lib/utils/email_login';
import { EMAIL_LOGIN_ACTION } from '@/constants/email_login';
import { ICoolDown } from '@/interfaces/email';

// Info: (20250602 - Shirley) 擴展 IOneTimePasswordResult 介面以包含實際使用的屬性
interface IExtendedOneTimePasswordResult {
  isAvailable: boolean;
  email: string;
  expiredAt: number;
  coolDown: number;
  coolDownAt: number;
}

// Info: (20250612 - Shirley) Effective test case
describe('EmailLoginHandler', () => {
  const testEmail = 'test@example.com';

  beforeEach(() => {
    // Info: (20250602 - Shirley) 清理所有日誌
    EmailLoginHandler.cleanLogs(testEmail);

    // Info: (20250602 - Shirley) 清理任何其他測試郵件的日誌
    EmailLoginHandler.cleanLogs('other@test.com');
    EmailLoginHandler.cleanLogs('another@example.com');
  });

  describe('checkLoginTimes', () => {
    it('應該返回正確的冷卻資訊當沒有登入嘗試時', () => {
      const result: ICoolDown = EmailLoginHandler.checkLoginTimes(testEmail);

      expect(result.attempts).toBe(0);
      expect(result.maxAttempts).toBe(5); // Info: (20250602 - Shirley) MAX_EMIL_LOGIN_ERROR_TIMES
      expect(result.coolDown).toBe(600); // Info: (20250602 - Shirley) EMAIL_LOGIN_TOO_MANY_ATTEMPTS_COOLDOWN_IN_S
      expect(typeof result.coolDownAt).toBe('number');
    });

    it('應該正確計算登入失敗次數', () => {
      // Info: (20250602 - Shirley) 記錄兩次登入失敗
      EmailLoginHandler.log(testEmail, EMAIL_LOGIN_ACTION.VERIFY);
      EmailLoginHandler.log(testEmail, EMAIL_LOGIN_ACTION.VERIFY);

      const result = EmailLoginHandler.checkLoginTimes(testEmail);

      expect(result.attempts).toBe(2);
    });

    it('應該正確計算冷卻時間當超過最大嘗試次數時', () => {
      // Info: (20250602 - Shirley) 記錄 7 次登入失敗（超過上限 5 次）
      for (let i = 0; i < 7; i += 1) {
        EmailLoginHandler.log(testEmail, EMAIL_LOGIN_ACTION.VERIFY);
      }

      const result = EmailLoginHandler.checkLoginTimes(testEmail);

      expect(result.attempts).toBe(7);
      expect(result.maxAttempts).toBe(5);
      expect(typeof result.coolDownAt).toBe('number');
    });

    it('應該只計算 VERIFY 動作，忽略其他動作', () => {
      EmailLoginHandler.log(testEmail, EMAIL_LOGIN_ACTION.VERIFY);
      EmailLoginHandler.log(testEmail, EMAIL_LOGIN_ACTION.REGISTER);
      EmailLoginHandler.log(testEmail, EMAIL_LOGIN_ACTION.VERIFY);

      const result = EmailLoginHandler.checkLoginTimes(testEmail);

      expect(result.attempts).toBe(2); // Info: (20250602 - Shirley) 只有 VERIFY 動作被計算
    });

    it('應該為不同郵件地址分別計算', () => {
      const anotherEmail = 'another@example.com';

      EmailLoginHandler.log(testEmail, EMAIL_LOGIN_ACTION.VERIFY);
      EmailLoginHandler.log(testEmail, EMAIL_LOGIN_ACTION.VERIFY);
      EmailLoginHandler.log(anotherEmail, EMAIL_LOGIN_ACTION.VERIFY);

      const result1 = EmailLoginHandler.checkLoginTimes(testEmail);
      const result2 = EmailLoginHandler.checkLoginTimes(anotherEmail);

      expect(result1.attempts).toBe(2);
      expect(result2.attempts).toBe(1);
    });
  });

  describe('checkRegisterCooldown', () => {
    it('應該允許註冊當沒有最近的註冊記錄時', () => {
      const result = EmailLoginHandler.checkRegisterCooldown(
        testEmail
      ) as IExtendedOneTimePasswordResult;

      expect(result).toBeDefined();
      expect(result.isAvailable).toBe(true);
      expect(result.email).toBe(testEmail);
      expect(typeof result.expiredAt).toBe('number');
      expect(result.coolDown).toBe(180); // Info: (20250602 - Shirley) EMAIL_LOGIN_REGISTER_COOLDOWN_IN_S = 3 * 60
      expect(typeof result.coolDownAt).toBe('number');
    });

    it('應該拒絕註冊當在冷卻期內有註冊記錄時', () => {
      // Info: (20250602 - Shirley) 記錄一次註冊
      EmailLoginHandler.log(testEmail, EMAIL_LOGIN_ACTION.REGISTER);

      const result = EmailLoginHandler.checkRegisterCooldown(
        testEmail
      ) as IExtendedOneTimePasswordResult;

      expect(result).toBeDefined();
      expect(result.isAvailable).toBe(false);
    });

    it('應該只計算 REGISTER 動作，忽略 VERIFY 動作', () => {
      EmailLoginHandler.log(testEmail, EMAIL_LOGIN_ACTION.VERIFY);
      EmailLoginHandler.log(testEmail, EMAIL_LOGIN_ACTION.VERIFY);

      const result = EmailLoginHandler.checkRegisterCooldown(
        testEmail
      ) as IExtendedOneTimePasswordResult;

      expect(result.isAvailable).toBe(true); // Info: (20250602 - Shirley) VERIFY 動作不影響註冊冷卻
    });
  });

  describe('cleanLogs', () => {
    it('應該清理指定郵件的所有日誌', () => {
      const anotherEmail = 'another@example.com';

      // Info: (20250602 - Shirley) 為兩個不同的郵件記錄日誌
      EmailLoginHandler.log(testEmail, EMAIL_LOGIN_ACTION.VERIFY);
      EmailLoginHandler.log(testEmail, EMAIL_LOGIN_ACTION.REGISTER);
      EmailLoginHandler.log(anotherEmail, EMAIL_LOGIN_ACTION.VERIFY);

      // Info: (20250602 - Shirley) 清理測試郵件的日誌
      EmailLoginHandler.cleanLogs(testEmail);

      // Info: (20250602 - Shirley) 檢查測試郵件的日誌已被清理
      const result1 = EmailLoginHandler.checkLoginTimes(testEmail);
      expect(result1.attempts).toBe(0);

      // Info: (20250602 - Shirley) 檢查另一個郵件的日誌仍然存在
      const result2 = EmailLoginHandler.checkLoginTimes(anotherEmail);
      expect(result2.attempts).toBe(1);
    });

    it('應該能夠清理不存在的郵件而不出錯', () => {
      expect(() => {
        EmailLoginHandler.cleanLogs('nonexistent@example.com');
      }).not.toThrow();
    });
  });

  describe('log', () => {
    it('應該正確記錄郵件登入動作', () => {
      EmailLoginHandler.log(testEmail, EMAIL_LOGIN_ACTION.VERIFY);

      const result = EmailLoginHandler.checkLoginTimes(testEmail);
      expect(result.attempts).toBe(1);
    });

    it('應該正確記錄郵件註冊動作', () => {
      EmailLoginHandler.log(testEmail, EMAIL_LOGIN_ACTION.REGISTER);

      const result = EmailLoginHandler.checkRegisterCooldown(
        testEmail
      ) as IExtendedOneTimePasswordResult;
      expect(result.isAvailable).toBe(false);
    });

    it('應該能夠記錄多個動作', () => {
      EmailLoginHandler.log(testEmail, EMAIL_LOGIN_ACTION.VERIFY);
      EmailLoginHandler.log(testEmail, EMAIL_LOGIN_ACTION.REGISTER);
      EmailLoginHandler.log(testEmail, EMAIL_LOGIN_ACTION.VERIFY);

      const verifyResult = EmailLoginHandler.checkLoginTimes(testEmail);
      const registerResult = EmailLoginHandler.checkRegisterCooldown(
        testEmail
      ) as IExtendedOneTimePasswordResult;

      expect(verifyResult.attempts).toBe(2);
      expect(registerResult.isAvailable).toBe(false);
    });
  });

  describe('邊界條件測試', () => {
    it('應該處理空字串郵件地址', () => {
      expect(() => {
        EmailLoginHandler.log('', EMAIL_LOGIN_ACTION.VERIFY);
        EmailLoginHandler.checkLoginTimes('');
        EmailLoginHandler.checkRegisterCooldown('');
        EmailLoginHandler.cleanLogs('');
      }).not.toThrow();
    });

    it('應該處理特殊字符的郵件地址', () => {
      const specialEmail = 'test+special@example.com';

      EmailLoginHandler.log(specialEmail, EMAIL_LOGIN_ACTION.VERIFY);
      const result = EmailLoginHandler.checkLoginTimes(specialEmail);

      expect(result.attempts).toBe(1);
    });
  });
});
