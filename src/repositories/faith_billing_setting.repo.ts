import { prisma } from "@/lib/prisma";
import { FaithBillingSetting } from "@/generated";
import { DEFAULT_FAITH_BILLING, IFaithBillingSetting } from "@/constants/llm";

/**
 * Info: (20260809 - Luphia) 費思計費設定 Repository（系統設定，DB 為準）。
 * 費率屬營運設定而非部署參數，故存 DB 不用 env；查無設定列時以程式碼預設值
 * fail-safe（絕不因設定缺漏而以 0 或無限額計費）。
 */

// Info: (20260809 - Luphia) 單列設定的固定主鍵
export const FAITH_BILLING_SETTING_KEY = "default";

export class FaithBillingSettingRepository {
  async getSetting(): Promise<FaithBillingSetting | null> {
    return prisma.faithBillingSetting.findUnique({
      where: { key: FAITH_BILLING_SETTING_KEY },
    });
  }

  async resolveSetting(): Promise<IFaithBillingSetting> {
    const row = await this.getSetting();
    if (!row) return DEFAULT_FAITH_BILLING;
    return {
      tokensPerCredit: row.tokensPerCredit,
      maxOutputTokens: row.maxOutputTokens,
      imageInputTokenEstimate: row.imageInputTokenEstimate,
    };
  }

  // Info: (20260809 - Luphia) 後台調整費率用（設定變更留 updatedAt 軌跡）
  async upsertSetting(
    setting: IFaithBillingSetting,
  ): Promise<FaithBillingSetting> {
    return prisma.faithBillingSetting.upsert({
      where: { key: FAITH_BILLING_SETTING_KEY },
      update: setting,
      create: { key: FAITH_BILLING_SETTING_KEY, ...setting },
    });
  }
}

export const faithBillingSettingRepo = new FaithBillingSettingRepository();
