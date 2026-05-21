"use client";

import { useState } from "react";
import { request } from "@/lib/utils/request";
import { MoneyUtil } from "@/lib/utils/money";
import { X, CheckCircle, AlertCircle, Loader2, Coins } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { getLoginOptions, fido2ClientService } from "@/lib/auth/fido2_client";

export interface IUserTarget {
  id: string;
  name: string | null;
  address: string;
}

interface IPointIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: IUserTarget | null;
  onSuccess: () => void;
}

export function PointIssueModal({
  isOpen,
  onClose,
  targetUser,
  onSuccess,
}: IPointIssueModalProps) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState<string>("0");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen || !targetUser) return null;

  const handleIssue = async () => {
    if (MoneyUtil.toDecimal(amount).lte(0)) {
      setError(t("admin_member.modal_issue.err_amount"));
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      /**
       * Info: (20260416 - Luphia) Admin FIDO2 Check before proceeding with the issue action.
       * Need to fetch from the currently logged in Admin's address!
       * Wait, we don't naturally have the admin's address here unless we fetch it from identity.
       * Wait, `getLoginOptions()` with no address triggers a Discoverable Login (Stateless)!
       * So we can just call `getLoginOptions()` without parameters.
       */
      const { challenge, token } = await getLoginOptions();
      const authentication = await fido2ClientService.startLogin({ challenge });

      const res = await request<{ success: boolean; message: string }>(
        `/api/v1/admin/user/${targetUser.id}/issue`,
        {
          method: "POST",
          body: JSON.stringify({
            amount,
            fido2Signature: {
              authentication,
              challengeToken: token,
            },
          }),
        },
      );
      if (res.success) {
        setSuccessMsg(res.message || t("admin_member.modal_issue.success_msg"));
        setTimeout(() => {
          onSuccess();
          onClose();
          setAmount("0");
          setSuccessMsg(null);
        }, 1500);
      } else {
        setError(res.message);
      }
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : t("admin_member.modal_issue.err_msg"),
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="animate-in fade-in zoom-in-95 w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl duration-200">
        <div className="flex items-center justify-between border-b border-gray-100 p-6">
          <h2 className="flex items-center gap-2 text-xl font-bold text-gray-800">
            <Coins className="h-6 w-6 text-orange-500" />
            {t("admin_member.modal_issue.title")}
          </h2>
          <button
            onClick={onClose}
            disabled={isLoading}
            aria-label="Close modal"
            className="text-gray-400 transition hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <div className="mb-1 text-sm text-gray-500">
              {t("admin_member.modal_issue.target_user")}
            </div>
            <div className="truncate font-semibold text-gray-700">
              {targetUser.name || t("admin_member.modal_issue.unnamed_user")}
            </div>
            <div className="mt-0.5 truncate font-mono text-xs text-gray-400">
              {targetUser.address}
            </div>
          </div>

          <div>
            <label
              htmlFor="points-amount-input"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              {t("admin_member.modal_issue.amount_label")}
            </label>
            <input
              id="points-amount-input"
              type="number"
              min="1"
              value={amount === "0" ? "" : amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isLoading || !!successMsg}
              aria-label={t("admin_member.modal_issue.amount_label")}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-lg font-medium text-gray-900 shadow-sm transition-all outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
              placeholder={t("admin_member.modal_issue.amount_placeholder")}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-600">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 rounded-lg bg-orange-50 p-3 text-sm font-medium text-orange-600">
              <CheckCircle className="h-4 w-4 shrink-0" />
              <p>{successMsg}</p>
            </div>
          )}
        </div>

        <div className="flex gap-3 p-6 pt-0">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 font-medium text-gray-600 transition hover:bg-gray-50"
          >
            {t("common.cancel")}
          </button>
          <button
            onClick={handleIssue}
            disabled={isLoading || !!successMsg}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 font-medium text-white shadow-lg shadow-orange-500/25 transition hover:bg-orange-600 hover:shadow-orange-500/40 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{t("admin_member.modal_issue.processing")}</span>
              </>
            ) : successMsg ? (
              <>
                <CheckCircle className="h-4 w-4" />
                <span>{t("admin_member.modal_issue.issued")}</span>
              </>
            ) : (
              <span>{t("admin_member.modal_issue.confirm_btn")}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
