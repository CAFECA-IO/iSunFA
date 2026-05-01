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
  executeOrderTransaction: (
    payload: IOrderPayload,
    calculatedCost: number,
    onPaymentSuccess: (
      authData: {
        orderId: string;
        transactionHash: string;
        reportId?: string;
      } & AuthenticationJSON,
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

      for (let i = 0; i < files.length; i++) {
        const fileData = files[i];
        const response = await request<IApiResponse<object>>(
          `/api/v1/user/account_book/${accountBookId}/ai_analysis`,
          {
            method: "POST",
            body: JSON.stringify({
              file: {
                id: fileData.id,
                file: { name: fileData.file.name, type: fileData.file.type },
                previewUrl: fileData.previewUrl,
                hash: fileData.hash,
                base64: fileData.base64,
              },
              authentication: authData,
            }),
          },
        );

        if (response.code === ApiCode.SUCCESS) {
          setAnalyzedCount((prev) => prev + 1);
        }
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
