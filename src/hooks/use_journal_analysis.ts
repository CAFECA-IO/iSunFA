import { useState } from "react";
import { request } from "@/lib/utils/request";
import { IApiResponse } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { IOrderPayload } from "@/hooks/use_order_transaction";
import { getAnalysisCost } from "@/lib/analysis/pricing";
import { AuthenticationJSON } from "@passwordless-id/webauthn/dist/esm/types";
import { ANALYSIS_CATEGORY } from "@/constants/price";
import { ORDER_TYPE } from "@/constants/status";

export type UploadedFileData = {
  id: string;
  file: File;
  previewUrl: string | null;
  hash: string;
  base64: string;
};

interface IUseJournalAnalysisProps {
  accountBookId: string;
  /**
   * Info: (20260813 - Luphia) 付款函式由呼叫端注入（現為統一的 useAnalysisPayment）。
   * transactionHash 與簽章欄位改為選填：團隊額度付款是離鏈扣抵，沒有鏈上交易，
   * 硬性要求這些欄位會讓這條路徑在型別上就過不去（設計書 §5.6）。
   */
  executeOrderTransaction: (
    payload: IOrderPayload,
    calculatedCost: number,
    onPaymentSuccess: (
      authData: {
        orderId: string;
        transactionHash?: string;
        reportId?: string;
      } & Partial<AuthenticationJSON>,
    ) => Promise<void> | void,
  ) => Promise<boolean>;
  itemName: string;
  onComplete?: () => void;
}

export function useJournalAnalysis({
  accountBookId,
  executeOrderTransaction,
  itemName,
  onComplete,
}: IUseJournalAnalysisProps) {
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analyzedCount, setAnalyzedCount] = useState<number>(0);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

  const handleAnalyzeAll = async (files: UploadedFileData[]) => {
    if (files.length === 0) return;

    const analysisParams = {
      category: ANALYSIS_CATEGORY.CERTIFICATE_ANALYSIS,
      accountBookId: accountBookId,
      files: [],
    };
    const unitPrice = getAnalysisCost(analysisParams);
    const totalPrice = unitPrice * files.length;

    const payload: IOrderPayload = {
      type: ORDER_TYPE.ANALYSIS,
      items: [
        {
          name: itemName,
          unitPrice: unitPrice,
          quantity: files.length,
        },
      ],
      data: {
        category: ANALYSIS_CATEGORY.CERTIFICATE_ANALYSIS,
        accountBookId,
        files: files.map((f) => ({ hash: f.hash, name: f.file.name })),
      },
    };

    await executeOrderTransaction(payload, totalPrice, async (authData) => {
      setShowConfirmModal(false);
      setIsAnalyzing(true);
      setAnalyzedCount(0);

      const formattedFiles = files.map((fileData) => ({
        id: fileData.id,
        file: { name: fileData.file.name, type: fileData.file.type },
        previewUrl: fileData.previewUrl,
        hash: fileData.hash,
        base64: fileData.base64,
      }));

      const response = await request<IApiResponse<object>>(
        `/api/v1/user/account_book/${accountBookId}/ai_analysis`,
        {
          method: "POST",
          body: JSON.stringify({
            files: formattedFiles,
            authentication: authData,
          }),
        },
      );

      if (response.code === ApiCode.SUCCESS) {
        setAnalyzedCount(files.length);
      }

      onComplete?.();
    });

    setIsAnalyzing(false);
  };

  return {
    isAnalyzing,
    analyzedCount,
    showConfirmModal,
    setShowConfirmModal,
    handleAnalyzeAll,
  };
}
