import { ITaskSkill } from "@/skills/types";
import { IPseudoTask } from "@/skills/types";
// import { ChatService } from "@/services/chat.service";
import { prepareDocumentContext } from "@/skills/utils/document_helper";
import { EsgActivityTypeKey } from "@/constants/esg_activity_type";
import { EsgIntensity } from "@/constants/esg";
import { MoneyUtil } from "@/lib/utils/money";

export class EsgIntensityEvaluationSkill implements ITaskSkill {
  name = "ESG_INTENSITY_EVALUATION";
  description =
    "Evaluate the emission intensity based on the ESG activity type and coefficient.";
  parameters = {
    type: "object",
    properties: {
      activityType: {
        type: "string",
        description: "The ESG activity type key (e.g. ELECTRICITY_USAGE).",
      },
      coefficient: {
        type: "string",
        description: "The emission coefficient value.",
      },
    },
    required: ["activityType", "coefficient"],
  };

  async execute(
    task: IPseudoTask,
    // mission: Mission,
    // fullPrompt: string,
    // chatService: ChatService,
  ): Promise<string> {
    let activityType: EsgActivityTypeKey | null = null;
    let coefficient: string = "0";

    // Info: (20250417 - Julian) 取得活動類型與係數
    const { esgRecord } = await prepareDocumentContext(task);

    try {
      if (esgRecord) {
        const record = esgRecord as unknown as Record<string, unknown>;
        activityType = record.activityType as EsgActivityTypeKey;
        const coefObj = record.coefficient as
          | Record<string, unknown>
          | undefined;
        coefficient = coefObj?.emissionFactor
          ? (coefObj.emissionFactor as string)
          : "0";
      }
    } catch (error) {
      console.warn(
        "Failed to parse task variables for ESG intensity evaluation.",
        error,
      );
    }

    // Info: (20250417 - Julian) 呼叫評估函數
    const intensity = this.evaluateIntensity(activityType, coefficient);

    // Info: (20250417 - Julian) 回傳預期的分析結果 JSON 排版
    return JSON.stringify({ intensity });
  }

  /**
   * Info: (20250417 - Julian) 根據活動類型與係數，評估排放強度
   * ToDo: (20250417 - Julian) 由於目前 DB 的基準數據不足，此處先建立函數與 Mock 簡單邏輯，未來可從 DB 撈取所有同性質紀錄比較
   *
   * @param activityType - ESG 活動分類
   * @param coefficient - 排放係數
   * @returns "HIGH" | "MEDIUM" | "LOW"
   */
  private evaluateIntensity(
    activityType: EsgActivityTypeKey | null,
    coefficient: string,
  ): EsgIntensity {
    const dec = MoneyUtil.toDecimal(coefficient);

    // Info: (20250417 - Julian) 如果缺乏重要資訊，預設給予中強度
    if (!activityType || dec.isNaN()) {
      return EsgIntensity.MEDIUM;
    }

    /**
     * TODO: (20250417 - Julian) 未來實作
     * 根據 accountBookId 條件從 DB 取出該企業（或是全站、同行業）的歷史 ESGRecords：
     * const records = await prisma.esgRecord.findMany({ where: { activityType: activityType } });
     * 計算前、後段班的 PR 級距範圍...
     */

    // Info: (20250417 - Julian) 根據排放係數判斷排放強度
    if (dec.gt(1.5)) {
      return EsgIntensity.HIGH;
    } else if (dec.gt(0.5)) {
      return EsgIntensity.MEDIUM;
    } else {
      return EsgIntensity.LOW;
    }
  }
}
