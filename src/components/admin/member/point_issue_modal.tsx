"use client";

import { useState } from "react";
import { request } from "@/lib/utils/request";
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

export function PointIssueModal({ isOpen, onClose, targetUser, onSuccess }: IPointIssueModalProps) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen || !targetUser) return null;

  const handleIssue = async () => {
    if (amount <= 0) {
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

      const res = await request<{ success: boolean; message: string }>(`/api/v1/admin/member/${targetUser.id}/issue`, {
        method: "POST",
        body: JSON.stringify({
          amount,
          fido2Signature: {
            authentication,
            challengeToken: token
          }
        }),
      });
      if (res.success) {
        setSuccessMsg(res.message || t("admin_member.modal_issue.success_msg"));
        setTimeout(() => {
          onSuccess();
          onClose();
          setAmount(0);
          setSuccessMsg(null);
        }, 1500);
      } else {
        setError(res.message);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("admin_member.modal_issue.err_msg"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800">
            <Coins className="w-6 h-6 text-orange-500" />
            {t("admin_member.modal_issue.title")}
          </h2>
          <button
            onClick={onClose}
            disabled={isLoading}
            aria-label="Close modal"
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
            <div className="text-sm text-gray-500 mb-1">{t("admin_member.modal_issue.target_user")}</div>
            <div className="font-semibold text-gray-700 truncate">
              {targetUser.name || t("admin_member.modal_issue.unnamed_user")}
            </div>
            <div className="text-xs text-gray-400 truncate mt-0.5 font-mono">
              {targetUser.address}
            </div>
          </div>

          <div>
            <label htmlFor="points-amount-input" className="block text-sm font-medium text-gray-700 mb-2">
              {t("admin_member.modal_issue.amount_label")}
            </label>
            <input
              id="points-amount-input"
              type="number"
              min="1"
              value={amount || ""}
              onChange={(e) => setAmount(Number(e.target.value))}
              disabled={isLoading || !!successMsg}
              aria-label={t("admin_member.modal_issue.amount_label")}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none text-lg font-medium shadow-sm"
              placeholder={t("admin_member.modal_issue.amount_placeholder")}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 text-orange-600 bg-orange-50 p-3 rounded-lg text-sm font-medium">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <p>{successMsg}</p>
            </div>
          )}
        </div>

        <div className="p-6 pt-0 flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition"
          >
            {t("common.cancel")}
          </button>
          <button
            onClick={handleIssue}
            disabled={isLoading || !!successMsg}
            className="flex-1 px-4 py-2.5 rounded-xl bg-orange-500 text-white font-medium shadow-lg shadow-orange-500/25 hover:bg-orange-600 hover:shadow-orange-500/40 active:scale-[0.98] transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t("admin_member.modal_issue.processing")}</span>
              </>
            ) : successMsg ? (
              <>
                <CheckCircle className="w-4 h-4" />
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
