"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog } from "@headlessui/react";
import { X } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import {
  ALLOCATION_DIRECTION,
  AllocationDirection,
} from "@/constants/subscription_quota";

/**
 * Info: (20260809 - Luphia) 點數分配 / 收回確認視窗（產品調整 20260809）：
 * 由成員卡片上的操作按鈕開啟，輸入點數後確認送出；
 * 實際 API 呼叫由呼叫端（團隊管理頁）處理，本元件僅負責輸入、上限驗證與確認。
 *
 * 上限來源（呼叫端傳入）：分配時為團隊未分配池餘額、收回時為該成員已分配餘額。
 * 前端上限僅為 UX 防呆，最終仍以後端條件扣款為準（併發下餘額可能已變動）。
 */

interface IAllocationModalProps {
  isOpen: boolean;
  direction: AllocationDirection;
  memberName: string;
  // Info: (20260809 - Luphia) BigInt 字串：餘額可能超出 Number 安全整數範圍
  max: string;
  submitting: boolean;
  onClose: () => void;
  onConfirm: (amount: string) => void;
}

export default function AllocationModal({
  isOpen,
  direction,
  memberName,
  max,
  submitting,
  onClose,
  onConfirm,
}: IAllocationModalProps) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState("0");

  // Info: (20260809 - Luphia) 每次開啟時重設為 0，避免殘留上一次的數字
  useEffect(() => {
    if (isOpen) setAmount("0");
  }, [isOpen]);

  const isValid = useMemo(() => {
    if (!/^\d+$/.test(amount)) return false;
    const value = BigInt(amount);
    const limit = /^\d+$/.test(max) ? BigInt(max) : BigInt(0);
    return value > BigInt(0) && value <= limit;
  }, [amount, max]);

  const title =
    direction === ALLOCATION_DIRECTION.ALLOCATE
      ? t("team_management.wallet.allocate_to", { name: memberName })
      : t("team_management.wallet.revoke_from", { name: memberName });

  return (
    <Dialog
      open={isOpen}
      onClose={() => !submitting && onClose()}
      className="relative z-50"
    >
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4 text-center">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                {title}
              </h3>
              <button
                onClick={onClose}
                disabled={submitting}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="size-5 shrink-0" />
              </button>
            </div>
            <label
              htmlFor="allocation-amount"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              {t("team_management.wallet.amount_label")}
            </label>
            <input
              id="allocation-amount"
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && isValid && !submitting) {
                  onConfirm(amount);
                }
              }}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 tabular-nums focus:border-orange-500 focus:ring-orange-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-gray-500 tabular-nums">
              {t("team_management.wallet.amount_limit", { max })}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={onClose}
                disabled={submitting}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={() => onConfirm(amount)}
                disabled={submitting || !isValid}
                className="rounded-lg bg-orange-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("common.confirm")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
