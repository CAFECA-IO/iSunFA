import { Iso14064Category } from "@/constants/esg";
import { SystemAccountNodes } from "@/constants/system_account_codes";

export const GL_TO_ISO_MAPPING: Record<string, Iso14064Category[]> = {
  // Info: (20260702 - Tzuhan) 稽核員視角：針對特定會計科目進行 ISO 14064-1 類別的強制限定 (安全結界)

  // Info: (20260703 - Tzuhan) 水電瓦斯費：可能是電力 (Category 2) 或天然氣/柴油 (Category 1)
  [SystemAccountNodes.UTILITIES_EXPENSE]: [
    Iso14064Category.CATEGORY_2,
    Iso14064Category.CATEGORY_1,
  ],

  // Info: (20260703 - Tzuhan) 交通/差旅費：差旅、通勤、物流運輸 (Category 3)
  [SystemAccountNodes.TRAVEL_EXPENSE]: [Iso14064Category.CATEGORY_3],

  // Info: (20260703 - Tzuhan) 銷貨成本 (COGS) / 原料：購買的商品與服務 (Category 4)
  [SystemAccountNodes.COGS_ROOT]: [Iso14064Category.CATEGORY_4],

  // Info: (20260703 - Tzuhan) 資本財/固定資產：機器設備等 (Category 4)
  [SystemAccountNodes.FIXED_ASSETS_ROOT]: [Iso14064Category.CATEGORY_4],

  // Info: (20260703 - Tzuhan) 管理費用：可能是購買的服務、辦公室耗材 (Category 4)
  [SystemAccountNodes.ADMIN_EXPENSE]: [Iso14064Category.CATEGORY_4],
};
