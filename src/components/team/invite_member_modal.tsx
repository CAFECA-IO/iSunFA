"use client";

import { useState, FormEvent } from "react";
import { Dialog } from "@headlessui/react";
import Link from "next/link";
import { X, ScanQrCode } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { useAuth } from "@/contexts/auth_context";
import { getLoginOptions } from "@/lib/auth/fido2_client";
import { requestAssertion } from "@/lib/auth/assertion_client";
import { request, ApiError } from "@/lib/utils/request";
import { TeamRole } from "@/constants/team";
import QrScannerModal from "@/components/common/qr_scanner_modal";
import { isAddress } from "viem";

/**
 * Info: (20260818 - Luphia) 免費版人數上限的錯誤（TW000017）。
 *
 * 讀 `errorCode` 而不是比對訊息字串：訊息會隨語系與文案調整而變，
 * 錯誤碼不會。
 */
function isFreePlanLimitError(err: ApiError): boolean {
  const data = err.data as { errorCode?: string } | undefined;
  return data?.errorCode === TW_FREE_PLAN_MEMBER_LIMIT_CODE;
}

// Info: (20260818 - Luphia) 與 API_ERRORS.TW_FREE_PLAN_MEMBER_LIMIT 同一個碼
const TW_FREE_PLAN_MEMBER_LIMIT_CODE = "TW000017";

interface IInviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTeamId: string;
  onSuccess: () => void;
  showAlert: (message: string, title?: string) => void;
}

export default function InviteMemberModal({
  isOpen,
  onClose,
  selectedTeamId,
  onSuccess,
  showAlert,
}: IInviteMemberModalProps) {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [inviteAddress, setInviteAddress] = useState<string>("");
  const [inviteEmail, setInviteEmail] = useState<string>("");
  const [inviteRole, setInviteRole] = useState<TeamRole>(TeamRole.VIEWER);
  const [inviting, setInviting] = useState<boolean>(false);
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  /**
   * Info: (20260815 - Luphia) 兩種邀請方式（規範 §4 / P4）：
   * 位址適用於「對方已經是本站用戶」，email 適用於「對方還沒有帳號」——
   * 後者不需要邀請者先問到對方的錢包位址。
   */
  const [inviteMode, setInviteMode] = useState<"ADDRESS" | "EMAIL">("ADDRESS");
  // Info: (20260818 - Luphia) 免費版人數已滿：改顯示升級導引而不是一句英文錯誤
  const [upgradeNeeded, setUpgradeNeeded] = useState(false);

  const targetValue = inviteMode === "ADDRESS" ? inviteAddress : inviteEmail;

  const handleInvite = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedTeamId || !targetValue.trim() || !user?.address) return;

    if (inviteMode === "ADDRESS" && !isAddress(inviteAddress.trim())) {
      showAlert(t("team_management.alerts.invalid_address"));
      return;
    }

    // Info: (20260815 - Luphia) 前端只擋明顯的格式錯誤，真正的判準在服務端
    if (
      inviteMode === "EMAIL" &&
      !/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(inviteEmail.trim())
    ) {
      showAlert(t("team_management.alerts.invalid_email"));
      return;
    }

    setInviting(true);
    setUpgradeNeeded(false);
    try {
      const { challenge } = await getLoginOptions(user.address);
      // Info: (20260811 - Luphia) 走 requestAssertion，託管帳號才不會卡在永遠不會成功的系統對話框
      const authentication = await requestAssertion({
        challenge,
        custody: user.custody,
      });

      const endpoint =
        inviteMode === "ADDRESS"
          ? `/api/v1/user/team/${selectedTeamId}/invitations`
          : `/api/v1/user/team/${selectedTeamId}/invitations/email`;

      const payload =
        inviteMode === "ADDRESS"
          ? { address: inviteAddress.trim(), role: inviteRole, authentication }
          : {
              email: inviteEmail.trim(),
              role: inviteRole,
              authentication,
            };

      const json = await request<{
        success: boolean;
        message?: string;
        payload?: { seatCharge?: { reusedPaidSeat?: boolean } };
      }>(endpoint, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (json.success) {
        setInviteAddress("");
        setInviteEmail("");
        onClose();
        onSuccess();
        /**
         * Info: (20260815 - Luphia) 用到「已付費但空出來的席次」時明講（產品拍板 20260815）。
         * 前一次邀請被拒或逾期時錢沒有退，這次不再收費——不說的話，
         * 管理員只會看到帳單上少了一筆而不知道為什麼。
         */
        if (json.payload?.seatCharge?.reusedPaidSeat) {
          showAlert(t("team_management.alerts.seat_reused"));
        } else {
          showAlert(
            inviteMode === "EMAIL"
              ? t("team_management.alerts.invite_email_sent")
              : t("team_management.alerts.invite_success"),
          );
        }
      }
    } catch (err) {
      console.error(err);
      /**
       * Info: (20260818 - Luphia) 免費版人數已滿要說得出**下一步**（產品決定 20260818）。
       *
       * 後端回的是英文的 `Free plan team has reached its member limit`——
       * 直接顯示它，使用者只知道被擋下來，不知道那是方案的界線、更不知道
       * 升級就能解決。免費版上限是 1（僅擁有者），所以任何一次邀請都會撞到，
       * 這是新團隊最容易遇到的第一個阻礙。
       */
      if (err instanceof ApiError && isFreePlanLimitError(err)) {
        setUpgradeNeeded(true);
        return;
      }
      if (err instanceof ApiError) {
        showAlert(err.message);
      } else {
        showAlert(t("team_management.alerts.error_invite"));
      }
    } finally {
      setInviting(false);
    }
  };

  // Info: (20260702 - Julian) 處理掃描結果
  const handleScanSuccess = (decodedText: string) => {
    // Info: (20260702 - Julian) 整理錢包位址格式
    let address = decodedText;
    if (address.toLowerCase().startsWith("ethereum:")) {
      address = address.split(":")[1].split("@")[0];
    }

    if (isAddress(address)) {
      setInviteAddress(address);
    } else {
      showAlert(t("team_management.alerts.invalid_address"));
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={() => !inviting && onClose()}
      className="relative z-50"
    >
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4 text-center">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                {t("team_management.invite_member")}
              </h3>
              <button
                onClick={onClose}
                className="shrink-0 text-gray-400 hover:text-gray-500"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleInvite} className="space-y-4">
              {/* Info: (20260815 - Luphia) 邀請方式切換（規範 §4 / P4） */}
              <div
                role="tablist"
                aria-label={t("team_management.invite_method")}
                className="flex rounded-lg bg-gray-100 p-1"
              >
                {(["ADDRESS", "EMAIL"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    role="tab"
                    aria-selected={inviteMode === mode}
                    onClick={() => setInviteMode(mode)}
                    disabled={inviting}
                    className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
                      inviteMode === mode
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    {mode === "ADDRESS"
                      ? t("team_management.invite_by_address")
                      : t("team_management.invite_by_email")}
                  </button>
                ))}
              </div>

              {inviteMode === "ADDRESS" ? (
                <div>
                  <label
                    htmlFor="invite-address"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    {t("team_management.web3_address")}
                  </label>
                  <div className="flex w-full items-center gap-2">
                    <input
                      id="invite-address"
                      type="text"
                      required
                      value={inviteAddress}
                      onChange={(e) => setInviteAddress(e.target.value)}
                      disabled={inviting}
                      aria-label={t("team_management.web3_address")}
                      className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                      placeholder="0x123..."
                    />
                    <button
                      type="button"
                      onClick={() => setIsScannerOpen(true)}
                      disabled={inviting}
                      className="flex shrink-0 items-center justify-center rounded-lg bg-orange-300 p-2 text-slate-800 transition-colors hover:bg-orange-400 disabled:opacity-50"
                      title={t("team_management.scan_qr_code")}
                    >
                      <ScanQrCode size={24} />
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <label
                    htmlFor="invite-email"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    {t("team_management.email_address")}
                  </label>
                  <input
                    id="invite-email"
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    disabled={inviting}
                    aria-label={t("team_management.email_address")}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                    placeholder="name@example.com"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {t("team_management.invite_email_hint")}
                  </p>
                </div>
              )}
              <QrScannerModal
                isOpen={isScannerOpen}
                onClose={() => setIsScannerOpen(false)}
                onScanSuccess={handleScanSuccess}
              />
              <div>
                <label
                  htmlFor="invite-role"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  {t("team_management.role")}
                </label>
                <select
                  id="invite-role"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as TeamRole)}
                  disabled={inviting}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                >
                  <option value={TeamRole.OWNER}>
                    {t("team_management.roles.OWNER")}
                  </option>
                  <option value={TeamRole.EDITOR}>
                    {t("team_management.roles.EDITOR")}
                  </option>
                  <option value={TeamRole.VIEWER}>
                    {t("team_management.roles.VIEWER")}
                  </option>
                </select>
              </div>
              {/**
               * Info: (20260818 - Luphia) 免費版人數已滿的升級導引（產品決定 20260818）。
               *
               * 免費版上限是 1（僅擁有者），因此新團隊的第一次邀請就會撞到這裡。
               * 只說「已達上限」等於把人留在原地——要說得出下一步是什麼，
               * 而且連結帶上 `?team=`，訂閱才會套到眼前這個團隊。
               */}
              {upgradeNeeded && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="text-xs font-semibold text-amber-900">
                    {t("team_management.alerts.free_plan_limit_title")}
                  </p>
                  <p className="mt-1 text-xs text-amber-800">
                    {t("team_management.alerts.free_plan_limit_hint")}
                  </p>
                  <Link
                    href={`/pricing/subscription?team=${selectedTeamId}`}
                    className="mt-2 inline-flex rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-700"
                  >
                    {t("team_management.alerts.free_plan_limit_cta")}
                  </Link>
                </div>
              )}

              <div className="mt-2 flex items-start rounded-lg border border-orange-100 bg-orange-50 p-3">
                <div className="text-xs text-orange-800">
                  <span className="mb-1 block font-semibold">
                    {t("team_management.fido2_requirement")}
                  </span>
                  {t("team_management.fido2_requirement_text")}
                </div>
              </div>
              <div className="mt-6 flex flex-col-reverse justify-end gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={inviting}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50 sm:w-auto"
                >
                  {t("team_management.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={inviting || !targetValue.trim()}
                  className="inline-flex w-full items-center justify-center rounded-lg bg-orange-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50 sm:w-auto"
                >
                  {inviting
                    ? t("team_management.signing")
                    : t("team_management.invite_via_fido2")}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
