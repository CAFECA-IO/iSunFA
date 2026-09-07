"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog } from "@headlessui/react";
import { Loader2, X } from "lucide-react";
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

export interface IAllocationCandidate {
  userId: string;
  name: string;
}

interface IAllocationModalProps {
  isOpen: boolean;
  direction: AllocationDirection;
  /**
   * Info: (20260809 - Luphia) 由成員卡片開啟時，對象已經決定，只顯示名字。
   * Info: (20260818 - Luphia) 由錢包面板開啟時對象未定，改傳 `candidates`（見下）。
   */
  memberName?: string;
  /**
   * Info: (20260818 - Luphia) 可選的成員清單（產品需求 20260818：錢包區塊的分配入口）。
   *
   * 有值時視窗多一個成員下拉；沒有值就是既有的「對象已決定」流程。
   * 刻意共用同一個元件而不是另做一個：兩者的輸入、驗證與說明文字完全相同，
   * 分成兩份只會讓「上限怎麼算」與那段收回限制的說明各自漂移。
   */
  candidates?: IAllocationCandidate[];
  // Info: (20260809 - Luphia) BigInt 字串：餘額可能超出 Number 安全整數範圍
  max: string;
  submitting: boolean;
  onClose: () => void;
  onConfirm: (amount: string, userId?: string) => void;
}

export default function AllocationModal({
  isOpen,
  direction,
  memberName = undefined,
  candidates = undefined,
  max,
  submitting,
  onClose,
  onConfirm,
}: IAllocationModalProps) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState("0");
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  // Info: (20260809 - Luphia) 每次開啟時重設為 0，避免殘留上一次的數字
  useEffect(() => {
    if (isOpen) setAmount("0");
  }, [isOpen]);

  /**
   * Info: (20260819 - Luphia) 處理中攔住「關閉分頁 / 重新整理」（產品需求 20260819）。
   *
   * 分配不是一次資料庫寫入就結束：先在交易內扣團隊池，**接著在交易外鑄到成員的
   * 鏈上錢包**，成功才回填 `txHash`、明確失敗才寫反向分錄補回池（ADR 015 修訂）。
   * 中途離開的代價很具體——請求被中斷時，那筆 `ALLOCATE` 可能停在 `txHash: null`，
   * 也就是「已扣池、尚未確認上鏈」，而那是需要人工追查的狀態。
   *
   * 畫面上的提示只能勸阻**點關閉鈕**；重新整理與關閉分頁要靠瀏覽器自己的確認對話框，
   * 而那只有 `beforeunload` 叫得出來。`preventDefault()` 與 `returnValue` 都設是
   * 為了跨瀏覽器（Chrome 早期只認後者，規範改為前者）。
   *
   * 只在 `submitting` 期間掛，處理完立刻卸下——常駐一個 beforeunload 會讓使用者
   * 在任何時候離開頁面都被問一次，那種提示很快就會被無視。
   */
  useEffect(() => {
    if (!submitting) return undefined;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
      return "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [submitting]);

  /**
   * Info: (20260818 - Luphia) 未指定對象時預選第一位，但**不預選一個不在清單裡的人**。
   * 清單換了（切團隊）而選擇留著，送出的會是另一個團隊的成員 id。
   */
  useEffect(() => {
    if (!isOpen || !candidates) return;
    setSelectedUserId((prev) =>
      candidates.some((c) => c.userId === prev)
        ? prev
        : (candidates[0]?.userId ?? ""),
    );
  }, [isOpen, candidates]);

  const isValid = useMemo(() => {
    // Info: (20260818 - Luphia) 需要選人卻沒選到，同樣不算有效
    if (candidates && !selectedUserId) return false;
    if (!/^\d+$/.test(amount)) return false;
    const value = BigInt(amount);
    const limit = /^\d+$/.test(max) ? BigInt(max) : BigInt(0);
    return value > BigInt(0) && value <= limit;
  }, [amount, max, candidates, selectedUserId]);

  const submit = () => onConfirm(amount, selectedUserId || undefined);

  const title = candidates
    ? // Info: (20260818 - Luphia) 對象未定時用通用標題，選了誰在下拉裡看得到
      t("team_management.wallet.allocate")
    : direction === ALLOCATION_DIRECTION.ALLOCATE
      ? t("team_management.wallet.allocate_to", { name: memberName ?? "" })
      : t("team_management.wallet.revoke_from", { name: memberName ?? "" });

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
            {candidates && (
              <div className="mb-4">
                <label
                  htmlFor="allocation-member"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  {t("team_management.wallet.allocate_member")}
                </label>
                <select
                  id="allocation-member"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  disabled={submitting}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-orange-500 focus:ring-orange-500 focus:outline-none"
                >
                  {candidates.map((candidate) => (
                    <option key={candidate.userId} value={candidate.userId}>
                      {candidate.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
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
                  submit();
                }
              }}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 tabular-nums focus:border-orange-500 focus:ring-orange-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-gray-500 tabular-nums">
              {t("team_management.wallet.amount_limit", { max })}
            </p>

            {/**
             * Info: (20260814 - Luphia) 說明點數的去向與收回限制（ADR 015 修訂）：
             * 分配是把點數鑄進成員自己的區塊鏈錢包，之後就是他的個人資產、
             * 在團隊之外也能用；已經花掉的部分收不回來。不說清楚，
             * 管理者會以為這只是團隊內部的一個數字。
             */}
            <p className="mt-3 rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
              {direction === ALLOCATION_DIRECTION.ALLOCATE
                ? t("team_management.wallet.allocate_onchain_note")
                : t("team_management.wallet.revoke_onchain_note")}
            </p>
            {/**
             * Info: (20260819 - Luphia) 處理中的動畫與「不要關閉」的提示（產品需求 20260819）。
             *
             * 先前處理中只是把按鈕變灰：使用者看不出系統在做事，於是會重按、
             * 重新整理，或直接關掉分頁——而這條路徑中途離開會留下
             * 「已扣池、尚未確認上鏈」的分錄。因此把**為什麼要等**也寫出來
             * （要等鏈上確認），只說「請稍候」的提示留不住人。
             */}
            {submitting && (
              <div
                className="mt-3 flex items-start gap-3 rounded-lg border border-orange-200 bg-orange-50 p-3"
                role="status"
                aria-live="assertive"
              >
                <Loader2
                  className="mt-0.5 size-4 shrink-0 animate-spin text-orange-600"
                  aria-hidden="true"
                />
                <div className="text-xs text-orange-900">
                  <p className="font-semibold">
                    {t("team_management.wallet.allocating_title")}
                  </p>
                  <p className="mt-1">
                    {t("team_management.wallet.allocating_warning")}
                  </p>
                </div>
              </div>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={onClose}
                disabled={submitting}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={submit}
                disabled={submitting || !isValid}
                className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting && (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                )}
                {submitting
                  ? t("team_management.wallet.allocating_button")
                  : t("common.confirm")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
