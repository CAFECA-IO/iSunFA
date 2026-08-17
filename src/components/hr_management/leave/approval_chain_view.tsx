"use client";

import { FC } from "react";
import { Check, ChevronRight, CircleDot, X } from "lucide-react";
import {
  LeaveApprovalNodeKind,
  LeaveApprovalStepStatus,
} from "@/constants/leave_policy";
import { useTranslation } from "@/i18n/i18n_context";

export interface IChainStepView {
  order: number;
  nodeKind: LeaveApprovalNodeKind;
  approverName: string;
  approverJobTitle: string | null;
  status: LeaveApprovalStepStatus;
  mergedFromKinds: LeaveApprovalNodeKind[];
  escalatedReason: string | null;
}

const NODE_KIND_I18N_KEY: Readonly<Record<LeaveApprovalNodeKind, string>> = {
  [LeaveApprovalNodeKind.DIRECT_MANAGER]: "hr_management.leave.node_direct",
  [LeaveApprovalNodeKind.DEPARTMENT_MANAGER]:
    "hr_management.leave.node_department",
  [LeaveApprovalNodeKind.HR]: "hr_management.leave.node_hr",
  [LeaveApprovalNodeKind.SPECIFIC_EMPLOYEE]:
    "hr_management.leave.node_specific",
};

/**
 * Info: (20260817 - Julian) 簽核鏈的可視化。
 *
 * ## 為什麼要把「被併掉的節點」畫出來
 *
 * 直屬主管恰好就是部門經理時，相鄰去重會把兩關併成一關（計畫書 §7.3）。
 * 不說的話，一張「3 天以上要簽兩關」的單子只顯示一關 ——
 * 看起來像少簽了，而查起來要翻規則表才知道是合併。
 * `mergedFromKinds` 就是為了這一刻存在的，這裡把它印出來。
 *
 * ## 為什麼要把「自動上升的理由」畫出來
 *
 * 節點解析出申請人本人時會自動往上找（老闆也要能請假）。
 * 那一關的簽核者與規則寫的不一樣，不說明就是一個沒有解釋的意外。
 */
const ApprovalChainView: FC<{ steps: IChainStepView[] }> = ({ steps }) => {
  const { t } = useTranslation();

  if (steps.length === 0) {
    return (
      <p className="text-sm text-gray-400">
        {t("hr_management.leave.chain_empty")}
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-2">
      {steps.map((step) => {
        const decided = step.status !== LeaveApprovalStepStatus.PENDING;
        const rejected = step.status === LeaveApprovalStepStatus.REJECTED;

        return (
          <li
            key={step.order}
            className="flex items-start gap-2.5 rounded-xl bg-gray-50 px-3 py-2"
          >
            <span
              className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full ${
                rejected
                  ? "bg-rose-100 text-rose-600"
                  : decided
                    ? "bg-emerald-100 text-emerald-600"
                    : "bg-sky-100 text-sky-600"
              }`}
            >
              {rejected ? (
                <X className="size-3" />
              ) : decided ? (
                <Check className="size-3" />
              ) : (
                <CircleDot className="size-3" />
              )}
            </span>

            <div className="min-w-0">
              <div className="text-sm text-gray-800">
                <span className="font-medium">{step.approverName}</span>
                {step.approverJobTitle && (
                  <span className="ml-1.5 text-xs text-gray-500">
                    {step.approverJobTitle}
                  </span>
                )}
              </div>

              <div className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-gray-500">
                <span>{t(NODE_KIND_I18N_KEY[step.nodeKind])}</span>

                {/* Info: (20260817 - Julian) 合併：說出「這一關同時是哪幾關」 */}
                {step.mergedFromKinds.map((kind) => (
                  <span key={kind} className="flex items-center gap-1">
                    <ChevronRight className="size-3" />
                    {t(NODE_KIND_I18N_KEY[kind])}
                  </span>
                ))}
              </div>

              {step.escalatedReason && (
                <div className="mt-1 text-xs text-amber-600">
                  {t("hr_management.leave.chain_escalated", {
                    reason: step.escalatedReason,
                  })}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
};

export default ApprovalChainView;
