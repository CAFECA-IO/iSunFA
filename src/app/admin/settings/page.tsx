"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  CreditCard,
  History,
  KeyRound,
  Loader2,
  Mail,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import AdminPageHeader from "@/components/admin/common/admin_page_header";
import { useTranslation } from "@/i18n/i18n_context";
import { request } from "@/lib/utils/request";
import { fido2ClientService } from "@/lib/auth/fido2_client";
import {
  SECRET_MASK,
  SettingSaveStatus,
  SystemSettingGroup,
  SystemSettingKey,
  SystemSettingSource,
  SYSTEM_SETTING_DEFINITIONS,
  SYSTEM_SETTING_GROUP_ORDER,
} from "@/constants/system_setting";

/**
 * Info: (20260809 - Luphia) 系統設定頁（營運期）。
 *
 * 這一頁存在的理由：部署精靈在系統初始化完成後即鎖死，過去要改一個 OAuth 用戶端
 * 得改 .env、重簽整份 .env、再重啟容器。設定改存資料庫後，這裡改完簽個名即刻生效。
 *
 * 每一次儲存都必須由 SUPER_ADMIN 以 passkey 對「設定內容的 digest」簽章，
 * 因此簽章本身就是對內容的承諾，可長期保存作為稽核證據。
 */

interface ISettingRow {
  key: SystemSettingKey;
  group: SystemSettingGroup;
  value: string;
  isSecret: boolean;
  hasValue: boolean;
  source: SystemSettingSource;
  /**
   * Info: (20260811 - Luphia) 這一項是否真的已納入資料庫保管（並在簽章承諾內）。
   * 只存在於 .env 的秘密同樣顯示 ********，不標示出來的話管理員會以為它已受保護。
   */
  storedInDb: boolean;
  fallback?: string;
}

interface IHistoryEntry {
  version: number;
  digest: string;
  signedBy: string;
  changedKeys: string[];
  createdAt: string;
}

// Info: (20260809 - Luphia) 分區的視覺識別；新增 group 時補一筆即可
const GROUP_STYLES: Record<
  SystemSettingGroup,
  { icon: typeof KeyRound; color: string }
> = {
  [SystemSettingGroup.THIRD_PARTY_LOGIN]: {
    icon: KeyRound,
    color: "text-violet-600",
  },
  [SystemSettingGroup.AI]: { icon: Bot, color: "text-blue-600" },
  [SystemSettingGroup.PAYMENT]: { icon: CreditCard, color: "text-emerald-600" },
  // Info: (20260815 - Luphia) 寄信設定（email 邀請）
  [SystemSettingGroup.MAIL]: { icon: Mail, color: "text-sky-600" },
};

interface ITrustState {
  trusted: boolean;
  version: number;
  vaultReady: boolean;
  trustRootReady: boolean;
}

export default function AdminSettingsPage() {
  const { t } = useTranslation();

  const [rows, setRows] = useState<ISettingRow[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [trust, setTrust] = useState<ITrustState | null>(null);
  const [history, setHistory] = useState<IHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<SettingSaveStatus>(
    SettingSaveStatus.IDLE,
  );
  const [message, setMessage] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await request<{
        payload: {
          settings: ISettingRow[];
          trust: ITrustState;
          history: IHistoryEntry[];
        };
      }>("/api/v1/admin/system_setting", { method: "GET" });

      setRows(res.payload.settings);
      setTrust(res.payload.trust);
      setHistory(res.payload.history ?? []);
      setValues(
        Object.fromEntries(
          res.payload.settings.map((row) => [row.key, row.value]),
        ),
      );
    } catch (error) {
      setStatus(SettingSaveStatus.ERROR);
      setMessage(
        error instanceof Error
          ? error.message
          : t("admin_settings.load_failed"),
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * Info: (20260809 - Luphia) 補發保險庫主密鑰。
   *
   * 這把金鑰必須留在 .env，而動 .env 就會讓 SUPER_ADMIN_SIGNATURE 失效，
   * 所以「產生金鑰」與「重新簽署 .env」是同一個動作，最後必須重啟服務
   * （Next.js 只在啟動時讀 .env）。部署精靈在系統初始化完成後就不再開放，
   * 因此這條維護路徑必須存在於這裡。
   */
  const handleProvisionVaultKey = async () => {
    setStatus(SettingSaveStatus.SIGNING);
    setMessage("");

    try {
      const challengeRes = await request<{
        payload: { alreadyConfigured: boolean; challenge?: string };
      }>("/api/v1/admin/system_setting/vault_key/challenge", {
        method: "POST",
        body: JSON.stringify({}),
      });

      if (challengeRes.payload.alreadyConfigured) {
        setStatus(SettingSaveStatus.SUCCESS);
        setMessage(t("admin_settings.vault_already_configured"));
        await load();
        return;
      }

      const authentication = await fido2ClientService.startLogin({
        challenge: challengeRes.payload.challenge as string,
        userVerification: "required",
        timeout: 60000,
      });

      setStatus(SettingSaveStatus.SAVING);
      await request("/api/v1/admin/system_setting/vault_key", {
        method: "POST",
        body: JSON.stringify({ authentication }),
      });

      setStatus(SettingSaveStatus.SUCCESS);
      setMessage(t("admin_settings.vault_provisioned"));
    } catch (error) {
      console.error("Failed to provision vault key:", error);
      setStatus(SettingSaveStatus.ERROR);
      setMessage(
        error instanceof Error
          ? error.message
          : t("admin_settings.vault_provision_failed"),
      );
    }
  };

  const handleSave = async () => {
    setStatus(SettingSaveStatus.SIGNING);
    setMessage("");

    try {
      /**
       * Info: (20260809 - Luphia) 先向伺服器取得 digest。
       * 伺服器會用同一套規則把遮罩的秘密值還原成現值，所以簽下的 digest
       * 與最終寫進資料庫的內容必然一致。
       */
      /**
       * Info: (20260810 - Luphia) 一併送出載入時的版本。
       * 寫入是全量替換，若這份畫面在載入後已被其他人（或恢復後的解密狀態）超前，
       * 照著存下去會把畫面沒看到的設定刪掉——伺服器據此擋下並要求重新載入。
       */
      const baseVersion = trust?.version ?? 0;

      const challengeRes = await request<{
        payload: {
          digest: string;
          version: number;
          items: { key: string; value: string; isSecret: boolean }[];
        };
      }>("/api/v1/admin/system_setting/challenge", {
        method: "POST",
        body: JSON.stringify({ values, baseVersion }),
      });

      const authentication = await fido2ClientService.startLogin({
        challenge: challengeRes.payload.digest,
        userVerification: "required",
        timeout: 60000,
      });

      setStatus(SettingSaveStatus.SAVING);
      await request("/api/v1/admin/system_setting", {
        method: "POST",
        body: JSON.stringify({ values, baseVersion, authentication }),
      });

      setStatus(SettingSaveStatus.SUCCESS);
      setMessage(t("admin_settings.saved"));
      await load();
    } catch (error) {
      console.error("Failed to save system settings:", error);
      setStatus(SettingSaveStatus.ERROR);
      setMessage(
        error instanceof Error
          ? error.message
          : t("admin_settings.save_failed"),
      );
    }
  };

  const isBusy =
    status === SettingSaveStatus.SIGNING || status === SettingSaveStatus.SAVING;

  const sourceLabel = (source: SystemSettingSource) => {
    if (source === SystemSettingSource.DB) return t("admin_settings.source_db");
    if (source === SystemSettingSource.ENV)
      return t("admin_settings.source_env");
    return t("admin_settings.source_none");
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <AdminPageHeader
        icon={SlidersHorizontal}
        title={t("admin_settings.title")}
        subtitle={t("admin_settings.subtitle")}
      />

      {/* Info: (20260809 - Luphia) 前置條件未就緒時明確標示，避免管理員填了設定卻查不出為何無效 */}
      {trust && !trust.vaultReady && (
        <div className="mt-6 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="text-sm text-amber-900">
            <p className="font-semibold">
              {t("admin_settings.vault_missing_title")}
            </p>
            <p className="mt-1 leading-relaxed">
              {t("admin_settings.vault_missing_desc")}
            </p>
            <button
              type="button"
              onClick={handleProvisionVaultKey}
              disabled={isBusy || trust?.trustRootReady === false}
              className="mt-3 inline-flex items-center gap-2 rounded-md bg-amber-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-amber-300"
            >
              {isBusy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ShieldCheck className="h-3.5 w-3.5" />
              )}
              {t("admin_settings.vault_provision_btn")}
            </button>
          </div>
        </div>
      )}

      {trust && !trust.trustRootReady && (
        <div className="mt-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div className="text-sm text-red-900">
            <p className="font-semibold">
              {t("admin_settings.trust_root_missing_title")}
            </p>
            <p className="mt-1 leading-relaxed">
              {t("admin_settings.trust_root_missing_desc")}
            </p>
          </div>
        </div>
      )}

      {trust?.trusted && (
        <div className="mt-6 inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700">
          <ShieldCheck className="h-3.5 w-3.5" />
          {t("admin_settings.signed_version", {
            version: String(trust.version),
          })}
        </div>
      )}

      {loading ? (
        <div className="mt-6 flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-10 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("admin_settings.loading")}
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-5">
          {SYSTEM_SETTING_GROUP_ORDER.map((group) => {
            const groupRows = rows.filter((row) => row.group === group);
            if (groupRows.length === 0) return null;

            const { icon: GroupIcon, color } = GROUP_STYLES[group];

            return (
              <div
                key={group}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white"
              >
                <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-5 py-3">
                  <GroupIcon className={`h-4 w-4 ${color}`} />
                  <h2 className="text-sm font-bold tracking-wide text-gray-800">
                    {t(`admin_settings.group.${group.toLowerCase()}`)}
                  </h2>
                </div>

                <div className="grid grid-cols-1 gap-5 p-5">
                  {groupRows.map((row) => (
                    <div key={row.key} className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <label
                          htmlFor={`setting-${row.key}`}
                          className="text-xs font-bold tracking-wider text-gray-700 uppercase"
                        >
                          {row.key}
                        </label>
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
                          {sourceLabel(row.source)}
                        </span>
                      </div>
                      <input
                        id={`setting-${row.key}`}
                        aria-label={row.key}
                        type={row.isSecret ? "password" : "text"}
                        value={values[row.key] ?? ""}
                        onChange={(e) =>
                          setValues((prev) => ({
                            ...prev,
                            [row.key]: e.target.value,
                          }))
                        }
                        /**
                         * Info: (20260809 - Luphia) 沒有保險庫主密鑰就無法加密秘密值，
                         * 直接鎖住輸入框，避免管理員填完、簽完 passkey 才在寫入時失敗。
                         * 非秘密設定不受影響，仍可正常修改。
                         */
                        disabled={
                          isBusy ||
                          (row.isSecret && trust?.vaultReady === false)
                        }
                        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-gray-900 transition outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500 disabled:bg-slate-50"
                        placeholder={
                          SYSTEM_SETTING_DEFINITIONS[row.key].isSecret
                            ? SECRET_MASK
                            : (row.fallback ?? "")
                        }
                      />
                      {/*
                        Info: (20260811 - Luphia) 只存在於 env 的項目要標示出來。
                        它與「已納入資料庫保管」在畫面上長得一樣（秘密都顯示 ********），
                        但它不在簽章承諾內，日後清理 .env 時服務會直接掛掉。
                      */}
                      {row.hasValue && !row.storedInDb && (
                        <p className="text-xs text-amber-700">
                          {t("admin_settings.env_only_hint")}
                        </p>
                      )}

                      {/* Info: (20260809 - Luphia) 未設定但有保底值時要講清楚系統實際跑的是什麼 */}
                      {!row.hasValue && row.fallback && (
                        <p className="text-[10px] text-gray-400">
                          {t("admin_settings.fallback_hint", {
                            value: row.fallback,
                          })}
                        </p>
                      )}
                      {row.isSecret && row.hasValue && (
                        <p className="text-[10px] text-gray-400">
                          {t("admin_settings.secret_untouched_hint")}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {message && (
        <div
          className={`mt-4 flex items-start gap-2 rounded-lg border p-4 text-sm ${
            status === SettingSaveStatus.ERROR
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {status === SettingSaveStatus.ERROR ? (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span>{message}</span>
        </div>
      )}

      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={loading || isBusy}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-6 py-2.5 text-sm font-bold tracking-wide text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-orange-300"
        >
          {isBusy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {status === SettingSaveStatus.SIGNING
                ? t("admin_settings.signing")
                : t("admin_settings.saving")}
            </>
          ) : (
            <>
              <ShieldCheck className="h-4 w-4" />
              {t("admin_settings.sign_and_save")}
            </>
          )}
        </button>
        <p className="text-xs text-gray-500">{t("admin_settings.sign_hint")}</p>
      </div>

      {/* Info: (20260809 - Luphia) 稽核軌跡：每一版設定都有獨立的 digest 與簽署者，.env 只留得住最新一份 */}
      {history.length > 0 && (
        <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-5 py-3">
            <History className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-bold tracking-wide text-gray-800">
              {t("admin_settings.history_title")}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[10px] tracking-wider text-slate-500 uppercase">
                <tr>
                  <th className="px-5 py-2 font-semibold">
                    {t("admin_settings.history_version")}
                  </th>
                  <th className="px-5 py-2 font-semibold">
                    {t("admin_settings.history_changed")}
                  </th>
                  <th className="px-5 py-2 font-semibold">
                    {t("admin_settings.history_signed_by")}
                  </th>
                  <th className="px-5 py-2 font-semibold">
                    {t("admin_settings.history_at")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((entry) => (
                  <tr key={entry.version}>
                    <td className="px-5 py-2 font-mono">v{entry.version}</td>
                    <td className="px-5 py-2">
                      {entry.changedKeys.length > 0
                        ? entry.changedKeys.join(", ")
                        : "—"}
                    </td>
                    <td className="px-5 py-2 font-mono break-all text-slate-500">
                      {entry.signedBy.slice(0, 16)}…
                    </td>
                    <td className="px-5 py-2 whitespace-nowrap text-slate-500">
                      {new Date(entry.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
