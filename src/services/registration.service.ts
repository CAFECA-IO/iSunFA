import {
  fido2ClientService,
  getRegisterOptions,
  registerPasskey,
} from "@/lib/auth/fido2_client";
import { RegistrationStep } from "@/constants/auth_provider";

export class RegistrationService {
  /**
   * Info: (20260116 - Tzuhan)
   * 核心註冊流程
   * @param username 用戶暱稱
   * @param onStepChange 狀態回呼，用於更新 UI
   *
   * Info: (20261015 - Luphia) 區塊鏈退役：只剩「建立 passkey → 伺服器建帳」。
   * 原本的預測 SCW 位址、算 UserOp 雜湊、第二次簽名授權部署、送 bundler、
   * 等伺服器從鏈上 lazy sync 全部移除——位址改由伺服器以 credentialId 與公鑰
   * 決定性推導（`deriveAccountAddress`），帳號在這一次請求內就寫進 DB。
   */
  public async signUp(
    username: string,
    onStepChange?: (step: RegistrationStep) => void,
  ): Promise<{ address: string }> {
    try {
      onStepChange?.(RegistrationStep.FETCHING_CHALLENGE);
      const { challenge, token } = await getRegisterOptions();

      onStepChange?.(RegistrationStep.CREATING_PASSKEY);
      const registration = await fido2ClientService.startRegistration({
        user: username,
        challenge,
        userVerification: "required",
        discoverable: "preferred",
      });

      onStepChange?.(RegistrationStep.REGISTERING);
      const { address } = await registerPasskey({
        registration,
        challengeToken: token,
        name: username,
      });

      onStepChange?.(RegistrationStep.SUCCESS);
      return { address };
    } catch (error) {
      onStepChange?.(RegistrationStep.FAILED);
      throw error;
    }
  }
}

export const registrationService = new RegistrationService();
