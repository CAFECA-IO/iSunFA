"use client";

import { useCallback, useEffect, useState, FormEvent } from "react";
import { Dialog } from "@headlessui/react";
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
 * Info: (20260819 - Luphia) 免費版人數上限已取消（產品決定 20260819），
 * 因此這裡不再需要「已達上限 → 升級導引」那一段：那個錯誤碼不會再被丟出。
 * 免費方案的額度改為全隊共用一份，加人不再產生額度。
 */

/**
 * Info: (20260818 - Luphia) 加席試算（`GET .../seat_quote`，產品回報 20260818）。
 *
 * 在此之前，付費團隊按下「邀請」的那一刻就會以 merchant-initiated 交易刷訂閱那張卡，
 * 而畫面事前沒有揭露任何金額——使用者的原話是「我在邀請時完全不知道會被加收多少錢」。
 *
 * 這裡的型別刻意與服務端的 `ISeatQuote` 對齊（同一組 `kind`），
 * 而金額由服務端算，前端**不自己算**：算兩次就會有兩個答案。
 */
// Info: (20260819 - Luphia) 與 API_ERRORS.TW_INVITE_COOLDOWN 同一個碼
const TW_INVITE_COOLDOWN_CODE = "TW000027";

type SeatQuoteKind =
  | "FREE_PLAN"
  | "REUSE_PAID_SEAT"
  | "NO_CHARGE_PERIOD_END"
  | "CHARGE"
  | "BLOCKED";

interface ISeatQuote {
  kind: SeatQuoteKind;
  amount: number;
  currency: string;
  seats: number;
  seatsToCharge: number;
  remainingDays?: number;
  blocked?: { code: string; message: string };
}

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
  /**
   * Info: (20260819 - Luphia) 邀請冷卻的倒數（產品決定 20260819）。
   *
   * 冷卻剩餘秒數在**對話框開啟時**就讀一次，讓「還要等 43 秒」在按下去之前
   * 就看得到——只在按下去之後才說「請稍後再試」的話，使用者只能一直按，
   * 而每一次按都是一次請求（也就是說，那個設計會製造它想擋的流量）。
   */
  const [cooldown, setCooldown] = useState(0);
  // Info: (20260818 - Luphia) 加席費用的事前揭露（見上方 ISeatQuote）
  const [quote, setQuote] = useState<ISeatQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteFailed, setQuoteFailed] = useState(false);

  const loadQuote = useCallback(async () => {
    if (!selectedTeamId) return;
    setQuoteLoading(true);
    setQuoteFailed(false);
    try {
      const json = await request<{ success: boolean; payload?: ISeatQuote }>(
        `/api/v1/user/team/${selectedTeamId}/seat_quote?seats=1`,
      );
      if (json.success && json.payload) {
        setQuote(json.payload);
      } else {
        setQuoteFailed(true);
      }
    } catch {
      /**
       * Info: (20260818 - Luphia) 試算失敗就**不讓送出**（下方按鈕的 disabled 條件）。
       *
       * 「試算掛了但照樣可以邀請」等於回到原本的行為：在沒有揭露金額的情況下扣款。
       * 寧可讓使用者按一次「重新試算」，也不要讓他在不知道金額的情況下付錢。
       */
      setQuoteFailed(true);
    } finally {
      setQuoteLoading(false);
    }
  }, [selectedTeamId]);

  const loadInviteLimits = useCallback(async () => {
    if (!selectedTeamId) return;
    try {
      const json = await request<{
        success: boolean;
        payload?: { cooldownSecondsRemaining?: number };
      }>(`/api/v1/user/team/${selectedTeamId}/invite_limits`);
      setCooldown(json.payload?.cooldownSecondsRemaining ?? 0);
    } catch {
      /**
       * Info: (20260819 - Luphia) 讀不到就當作沒有冷卻。
       *
       * 與試算不同：試算失敗會擋住送出（不知道金額就不該扣款），而冷卻的真正
       * 防線在服務端——這裡只是「先告訴使用者」。讀不到就擋住送出，等於把一個
       * 顯示用的請求變成第二道會誤擋的閘。
       */
      setCooldown(0);
    }
  }, [selectedTeamId]);

  // Info: (20260818 - Luphia) 開啟時試算一次；關閉時清掉，避免下次開啟閃到上一團的金額
  useEffect(() => {
    if (!isOpen) {
      setQuote(null);
      setQuoteFailed(false);
      setCooldown(0);
      return;
    }
    void loadQuote();
    void loadInviteLimits();
  }, [isOpen, loadQuote, loadInviteLimits]);

  /**
   * Info: (20260819 - Luphia) 每秒遞減到 0 為止。
   *
   * 只在 `cooldown > 0` 時掛計時器，歸零就自己清掉——常駐一個每秒醒來的計時器
   * 是這種倒數最常見的多餘成本，而它在對話框關閉後還會繼續跑。
   */
  useEffect(() => {
    if (!isOpen || cooldown <= 0) return undefined;
    const timer = setInterval(() => {
      setCooldown((seconds) => (seconds > 1 ? seconds - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, cooldown]);

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

      /**
       * Info: (20260819 - Luphia) 把**畫面上顯示過的金額**一起送出（review #6682 高）。
       *
       * 試算是在對話框開啟時算的，而這裡已經隔了填表與一次 FIDO2 簽章。中間席次
       * 佔用可能被別人用掉、計費週期也可能滾動——服務端會以新的時間重算，於是
       * 「顯示不收費、實際被刷 420」是做得到的事，而且事後看不出來。
       *
       * 服務端拿這個值比對，不符就擋下並要求重新試算（`TW000025`）。
       * `?? -1` 是刻意的：沒有試算結果時送一個必然不符的值，讓服務端擋下來，
       * 而不是靜靜地以「沒帶」通過（送出按鈕本來就 disabled，這是第二道）。
       */
      const expectedAmount = quote ? quote.amount : -1;

      const payload =
        inviteMode === "ADDRESS"
          ? {
              address: inviteAddress.trim(),
              role: inviteRole,
              authentication,
              expectedAmount,
            }
          : {
              email: inviteEmail.trim(),
              role: inviteRole,
              authentication,
              expectedAmount,
            };

      const json = await request<{
        success: boolean;
        message?: string;
        payload?: {
          seatCharge?: {
            reusedPaidSeat?: boolean;
            charged?: boolean;
            amount?: number;
          };
        };
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
        /**
         * Info: (20260819 - Luphia) 真的收費時，把金額講出來（review #6682 高）。
         *
         * 先前這裡只讀 `reusedPaidSeat`，於是「實際扣了多少」在整個流程裡
         * **從頭到尾沒有出現過**——事前只有試算、事後一句「已送出邀請」，
         * 分岔（若發生）只會在下期帳單被發現。
         */
        const charge = json.payload?.seatCharge;
        if (charge?.reusedPaidSeat) {
          showAlert(t("team_management.alerts.seat_reused"));
        } else if (charge?.charged && charge.amount) {
          showAlert(
            t("team_management.alerts.seat_charged", {
              amount: `TWD ${charge.amount.toLocaleString()}`,
            }),
          );
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
       * Info: (20260819 - Luphia) 冷卻中：改成倒數，而不是丟一句錯誤訊息。
       * 服務端的 payload 帶著剩餘秒數（`TW000027`）。
       */
      if (err instanceof ApiError) {
        const data = err.data as
          | { errorCode?: string; payload?: { retryAfterSeconds?: number } }
          | undefined;
        if (data?.errorCode === TW_INVITE_COOLDOWN_CODE) {
          setCooldown(data?.payload?.retryAfterSeconds ?? 60);
          return;
        }
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
                  <option value={TeamRole.ADMIN}>
                    {t("team_management.roles.ADMIN")}
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
               * Info: (20260818 - Luphia) 加席費用的**事前**揭露（產品回報 20260818）。
               *
               * 付費團隊每邀請一人就會立刻向訂閱那張卡補收期中費用，而在此之前畫面
               * 事前不說、事後也只說「用了空席」。使用者的原話是「我在邀請時完全不
               * 知道會被加收多少錢」。金額一律由服務端試算（同一支 `quoteSeatAddition`
               * 也負責真正的扣款），前端不自己算。
               */}
              {/**
               * Info: (20260819 - Luphia) 冷卻倒數（產品決定 20260819）。
               *
               * 放在費用揭露**之前**：「現在還不能寄」比「會收多少錢」更優先——
               * 使用者需要先知道要不要等，再決定要不要看價格。
               */}
              {cooldown > 0 && (
                <div
                  className="rounded-lg border border-amber-200 bg-amber-50 p-3"
                  role="status"
                  aria-live="polite"
                >
                  <p className="text-xs text-amber-900">
                    {t("team_management.invite_cooldown.notice", {
                      seconds: String(cooldown),
                    })}
                  </p>
                </div>
              )}
              {quoteLoading && (
                <p className="text-xs text-gray-500">
                  {t("team_management.seat_charge.loading")}
                </p>
              )}
              {quoteFailed && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                  <p className="text-xs text-red-800">
                    {t("team_management.seat_charge.quote_failed")}
                  </p>
                  <button
                    type="button"
                    onClick={() => void loadQuote()}
                    className="mt-2 inline-flex rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                  >
                    {t("team_management.seat_charge.retry")}
                  </button>
                </div>
              )}
              {!quoteLoading && quote?.kind === "CHARGE" && (
                <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
                  <p className="text-xs font-semibold text-orange-900">
                    {t("team_management.seat_charge.charge_title", {
                      amount: `${quote.currency} ${quote.amount.toLocaleString()}`,
                    })}
                  </p>
                  <p className="mt-1 text-xs text-orange-800">
                    {t("team_management.seat_charge.charge_detail", {
                      seats: String(quote.seatsToCharge),
                      days: String(quote.remainingDays ?? 0),
                    })}
                  </p>
                </div>
              )}
              {!quoteLoading && quote?.kind === "REUSE_PAID_SEAT" && (
                <p className="text-xs text-gray-600">
                  {t("team_management.seat_charge.reuse")}
                </p>
              )}
              {!quoteLoading && quote?.kind === "NO_CHARGE_PERIOD_END" && (
                <p className="text-xs text-gray-600">
                  {t("team_management.seat_charge.period_end")}
                </p>
              )}
              {!quoteLoading && quote?.kind === "FREE_PLAN" && (
                <p className="text-xs text-gray-600">
                  {t("team_management.seat_charge.free_plan")}
                </p>
              )}
              {/**
               * Info: (20260819 - Luphia) 擋下的原因（沒有可扣款的卡、單價缺失、
               * 當期補收已達上限）。免費版人數上限那一條已於同日移除，
               * 因此這裡不再需要把它排除掉。
               */}
              {!quoteLoading && quote?.kind === "BLOCKED" && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                  <p className="text-xs font-semibold text-red-900">
                    {t("team_management.seat_charge.blocked_title")}
                  </p>
                  <p className="mt-1 text-xs text-red-800">
                    {quote.blocked?.message}
                  </p>
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
                {/**
                 * Info: (20260818 - Luphia) 金額寫在按鈕上，並且**沒有揭露就不能送出**。
                 *
                 * 三種情形 disabled：正在試算、試算失敗（改按「重新試算」）、
                 * 試算判定現在不能加人。少了這幾條，使用者仍然可能在不知道金額的
                 * 情況下完成一次扣款——那正是這次要修的事。
                 */}
                <button
                  type="submit"
                  disabled={
                    inviting ||
                    !targetValue.trim() ||
                    quoteLoading ||
                    quoteFailed ||
                    !quote ||
                    quote.kind === "BLOCKED" ||
                    // Info: (20260819 - Luphia) 冷卻中不得送出（服務端也會擋，這是先講）
                    cooldown > 0
                  }
                  className="inline-flex w-full items-center justify-center rounded-lg bg-orange-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50 sm:w-auto"
                >
                  {cooldown > 0
                    ? t("team_management.invite_cooldown.button", {
                        seconds: String(cooldown),
                      })
                    : inviting
                      ? t("team_management.signing")
                      : quote?.kind === "CHARGE"
                        ? t("team_management.seat_charge.submit_with_amount", {
                            amount: `${quote.currency} ${quote.amount.toLocaleString()}`,
                          })
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
