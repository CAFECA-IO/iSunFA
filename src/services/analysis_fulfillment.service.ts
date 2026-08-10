import { talkRepo } from "@/repositories/talk.repo";
import { analysisService } from "@/services/analysis.service";
import { ORDER_TYPE } from "@/constants/status";
import {
  ANALYSIS_CATEGORY,
  type AnalysisCategory,
  type AnalysisPeriod,
} from "@/constants/analysis";

type TPayloadFile = string | { hash: string; fileName?: string };

/**
 * Info: (20260807 - Luphia) 分析訂單「付款成功後」的統一履行邏輯，
 * 自 blockchain_payment route 抽出（原樣搬移，行為不變），
 * 供鏈上簽章付款與團隊額度付款（設計書 §5 第三層 fallback 的反向：額度內免簽章）共用。
 * 含：mission 生成（certificate 逐檔）與 AI 諮詢室討論串檔案關聯。
 */
export async function fulfillPaidAnalysisOrder(
  userId: string,
  orderId: string,
  orderDataRaw: unknown,
): Promise<{ reportId?: string }> {
  const orderData = (orderDataRaw ?? {}) as Record<string, unknown>;
  const innerData = (orderData.data || orderData) as Record<string, unknown>;
  const category = innerData.category as string;

  let resData: { reportId?: string } = {};

  // Info: (20260418 - Luphia) Automatically generate mission for ALL categories including ai_consulting, but SKIP journal_upload since it generates missions per-file manually.
  if (category !== ANALYSIS_CATEGORY.CERTIFICATE_ANALYSIS) {
    const generateParams = {
      orderId,
      type: ORDER_TYPE.ANALYSIS,
      data: {
        ...innerData,
        category: category as AnalysisCategory,
        periodType: innerData.periodType as AnalysisPeriod,
        periodValue: innerData.periodValue as string,
        year: innerData.year as number,
      },
    };

    const analysisRes = await analysisService.generateAnalysis(
      userId,
      generateParams,
    );
    resData = (analysisRes.data || {}) as { reportId?: string };
  } else {
    const files = (innerData.files as TPayloadFile[]) || [];
    const promises = files.map((file) => {
      const fileHash = typeof file === "string" ? file : file.hash;
      const documentData = {
        ...innerData,
        category: category as AnalysisCategory,
        files: [fileHash],
        accountBookId: String(innerData.accountBookId || ""),
      } as unknown as import("@/lib/analysis/pricing").IDocumentParams;

      const generateParams = {
        orderId,
        type: ORDER_TYPE.ANALYSIS,
        data: documentData,
      };
      return analysisService.generateAnalysis(userId, generateParams);
    });

    await Promise.all(promises);
  }

  // Info: (20260418 - Luphia) 建立上傳檔案並與討論串關聯 (Restore AI Talk logic)
  if (
    category === ANALYSIS_CATEGORY.AI_CONSULTING &&
    resData.reportId &&
    orderData.data
  ) {
    const payloadData = orderData.data as { files?: TPayloadFile[] };
    if (payloadData.files && payloadData.files.length > 0) {
      await talkRepo.createFiles(
        payloadData.files.map((file: TPayloadFile) => {
          const isString = typeof file === "string";
          const fileHash = isString ? file : file.hash;
          return {
            hash: fileHash,
            fileName: isString
              ? `${fileHash.substring(0, 8)}.png`
              : (file as { fileName?: string }).fileName ||
                `${fileHash.substring(0, 8)}.png`,
            analysisId: resData.reportId!,
          };
        }),
      );
    }
  }

  return resData;
}
