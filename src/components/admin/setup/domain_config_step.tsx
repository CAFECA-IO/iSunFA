import { useTranslation } from "@/i18n/i18n_context";
import { useEffect, useState } from "react";
import {
  Loader2,
  Globe,
  Bot,
  CreditCard,
  ShieldCheck,
  KeyRound,
} from "lucide-react";
import { StepCard } from "@/components/admin/setup/step_card";
import { IStepProps, StepStatus } from "@/components/admin/setup/setup_types";
import {
  saveExternalConfig,
  saveSystemSettingDraft,
  getSystemSettingDraft,
} from "@/app/admin/setup/_api/config.api";
import { SystemSettingKey } from "@/constants/system_setting";

export function SetupDomainConfig({
  isActive,
  isCompleted,
  onNext,
  onReset,
  envData,
}: IStepProps) {
  const { t } = useTranslation();

  const [status, setStatus] = useState<StepStatus>(StepStatus.IDLE);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [appUrlValue, setAppUrlValue] = useState<string>(
    "https://isunfa.localhost",
  );
  const [gaIdValue, setGaIdValue] = useState<string>("G-ZNVVW7JP0N");
  const [maptilerKey, setMaptilerKey] = useState<string>("");

  /**
   * Info: (20260809 - Luphia) 以下欄位與 appUrl / GA / MapTiler 不同：
   * 它們最終保管在資料庫的 system_setting 表（步驟 8 簽章後寫入），不會留在 .env，
   * 因此不從 envData 讀取，而是向暫存區查詢。
   */
  const [geminiKey, setGeminiKey] = useState<string>("");
  const [llmModel, setLlmModel] = useState<string>("gemini-2.5-pro");
  const [oenToken, setOenToken] = useState<string>("");
  const [oenMerchant, setOenMerchant] = useState<string>("mermer");
  const [googleClientId, setGoogleClientId] = useState<string>("");
  const [googleClientSecret, setGoogleClientSecret] = useState<string>("");

  // Info: (20260415 - Luphia) 解構出需要的基本型別值
  const appUrl = envData?.NEXT_PUBLIC_APP_URL;
  const gaId = envData?.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const apiMaptilerKey = envData?.NEXT_PUBLIC_MAPTILER_KEY;

  useEffect(() => {
    const tId = setTimeout(() => {
      // Info: (20260415 - Luphia) 只有當這些值存在時，才執行對應的 state 更新
      if (appUrl) setAppUrlValue(appUrl.replace(/^"(.*)"$/, "$1"));
      if (gaId) setGaIdValue(gaId.replace(/^"(.*)"$/, "$1"));
      if (apiMaptilerKey)
        setMaptilerKey(apiMaptilerKey.replace(/^"(.*)"$/, "$1"));
    }, 0);
    return () => clearTimeout(tId);
  }, [appUrl, gaId, apiMaptilerKey]);

  useEffect(() => {
    if (!isActive && !isCompleted) return;

    getSystemSettingDraft()
      .then((res) => {
        if (!res.success || !res.data) return;
        const draft = res.data;

        // Info: (20260809 - Luphia) 草稿為空時保留欄位預設值，不要用空字串蓋掉
        if (draft[SystemSettingKey.GEMINI_API_KEY])
          setGeminiKey(draft[SystemSettingKey.GEMINI_API_KEY]);
        if (draft[SystemSettingKey.LLM_MODEL])
          setLlmModel(draft[SystemSettingKey.LLM_MODEL]);
        if (draft[SystemSettingKey.OEN_ACCESS_TOKEN])
          setOenToken(draft[SystemSettingKey.OEN_ACCESS_TOKEN]);
        if (draft[SystemSettingKey.OEN_MERCHANT_ID])
          setOenMerchant(draft[SystemSettingKey.OEN_MERCHANT_ID]);
        if (draft[SystemSettingKey.GOOGLE_OAUTH_CLIENT_ID])
          setGoogleClientId(draft[SystemSettingKey.GOOGLE_OAUTH_CLIENT_ID]);
        if (draft[SystemSettingKey.GOOGLE_OAUTH_CLIENT_SECRET])
          setGoogleClientSecret(
            draft[SystemSettingKey.GOOGLE_OAUTH_CLIENT_SECRET],
          );
      })
      .catch((e) => console.warn("Failed to load system setting draft:", e));
  }, [isActive, isCompleted]);

  const handleSaveAppUrl = async () => {
    setStatus(StepStatus.LOADING);
    let res: { success: boolean; error?: string } = { success: false };

    try {
      res = await saveExternalConfig({
        appUrl: appUrlValue,
        gaId: gaIdValue,
        maptilerKey: maptilerKey,
      });

      /**
       * Info: (20260809 - Luphia) 由資料庫保管的設定另外暫存，等步驟 8 簽章後寫入。
       * 留白代表不啟用該項；整組皆空時簽章步驟會自動跳過第二次簽署。
       */
      if (res.success) {
        const draftRes = await saveSystemSettingDraft({
          [SystemSettingKey.GEMINI_API_KEY]: geminiKey,
          [SystemSettingKey.LLM_MODEL]: llmModel,
          [SystemSettingKey.OEN_ACCESS_TOKEN]: oenToken,
          [SystemSettingKey.OEN_MERCHANT_ID]: oenMerchant,
          [SystemSettingKey.GOOGLE_OAUTH_CLIENT_ID]: googleClientId,
          [SystemSettingKey.GOOGLE_OAUTH_CLIENT_SECRET]: googleClientSecret,
        });
        if (!draftRes.success) res = draftRes;
      }
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      res = { success: true };
    }

    if (res.success) {
      try {
        const targetOrigin = new URL(appUrlValue).origin;
        if (window.location.origin !== targetOrigin) {
          window.location.href = targetOrigin + window.location.pathname;
          return;
        }
      } catch (e) {
        console.warn("Invalid appUrlValue format", e);
      }

      setStatus(StepStatus.SUCCESS);
      if (!isCompleted) {
        setTimeout(onNext, 800);
      } else {
        setTimeout(() => setStatus(StepStatus.IDLE), 2000); // Info: (20260413 - Luphia) 讓打勾按鈕維持 2 秒後重置
      }
    } else {
      setStatus(StepStatus.ERROR);
      setErrorMessage(res.error || t("admin_setup.step7.err_save"));
    }
  };

  const isFormValid =
    appUrlValue.trim() !== "" &&
    gaIdValue.trim() !== "" &&
    geminiKey.trim() !== "" &&
    maptilerKey.trim() !== "" &&
    oenToken.trim() !== "" &&
    oenMerchant.trim() !== "";

  const displayStatus = isCompleted ? StepStatus.SUCCESS : status;

  return (
    <StepCard
      step={7}
      title={t("admin_setup.step7.title")}
      description={t("admin_setup.step7.desc")}
      isActive={isActive}
      status={displayStatus}
      errorMessage={errorMessage}
      onReset={onReset}
      actionContent={
        <button
          onClick={handleSaveAppUrl}
          disabled={status === StepStatus.LOADING || !isFormValid}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 px-6 py-2.5 font-bold tracking-wide text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-orange-300 sm:w-auto"
        >
          {status === StepStatus.LOADING ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />{" "}
              {t("admin_setup.step7.finalizing_btn")}
            </>
          ) : status === StepStatus.SUCCESS ? (
            <>
              <ShieldCheck className="h-4 w-4" />{" "}
              {t("admin_setup.step7.saved_btn")}
            </>
          ) : (
            <>
              <ShieldCheck className="h-4 w-4" />{" "}
              {t("admin_setup.step7.save_btn")}
            </>
          )}
        </button>
      }
    >
      {(isActive || isCompleted) && (
        <div className="mt-5 flex max-w-3xl flex-col gap-5">
          {/* Info: (20260413 - Luphia) Core System Configuration */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-5 py-3">
              <Globe className="h-4 w-4 text-orange-600" />
              <h3 className="text-sm font-bold tracking-wide text-gray-800">
                {t("admin_setup.step7.core_system")}
              </h3>
            </div>
            <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="appUrlInput"
                  className="text-xs font-bold tracking-wider text-gray-700 uppercase"
                >
                  {t("admin_setup.step7.domain_label")}
                </label>
                <input
                  id="appUrlInput"
                  aria-label="Application URL"
                  type="text"
                  value={appUrlValue}
                  onChange={(e) => setAppUrlValue(e.target.value)}
                  className="transition- rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500"
                  disabled={status === StepStatus.LOADING}
                  placeholder="https://isunfa.localhost"
                />
                <p className="mt-1 text-[10px] text-gray-400">
                  {t("admin_setup.step7.domain_hint")}
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="gaIdInput"
                  className="text-xs font-bold tracking-wider text-gray-700 uppercase"
                >
                  {t("admin_setup.step7.ga_label")}
                </label>
                <input
                  id="gaIdInput"
                  aria-label="Google Analytics ID"
                  type="text"
                  value={gaIdValue}
                  onChange={(e) => setGaIdValue(e.target.value)}
                  className="transition- rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500"
                  disabled={status === StepStatus.LOADING}
                  placeholder={t("admin_setup.step7.ga_placeholder")}
                />
                <p className="mt-1 text-[10px] text-gray-400">
                  {t("admin_setup.step7.ga_hint")}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {/* Info: (20260413 - Luphia) AI Integration */}
            <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-5 py-3">
                <Bot className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-bold tracking-wide text-gray-800">
                  {t("admin_setup.step7.ai_consult")}
                </h3>
                {/* Info: (20260809 - Luphia) 標示保管位置，讓管理員知道日後可在 /admin/settings 修改 */}
                <span className="ml-auto rounded bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700">
                  {t("admin_setup.step7.stored_in_db")}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-1.5 p-5">
                <label
                  htmlFor="geminiInput"
                  className="text-xs font-bold tracking-wider text-gray-700 uppercase"
                >
                  {t("admin_setup.step7.gemini_label")}
                </label>
                <input
                  id="geminiInput"
                  aria-label="Gemini API Key"
                  type="password"
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  className="transition- rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  disabled={status === StepStatus.LOADING}
                  placeholder="AIzaSy..."
                />
                <p className="mt-1 text-[10px] leading-relaxed text-gray-400">
                  {t("admin_setup.step7.gemini_hint")}
                </p>

                <label
                  htmlFor="llmModelInput"
                  className="mt-4 text-xs font-bold tracking-wider text-gray-700 uppercase"
                >
                  {t("admin_setup.step7.llm_model_label")}
                </label>
                <input
                  id="llmModelInput"
                  aria-label="LLM Model"
                  type="text"
                  value={llmModel}
                  onChange={(e) => setLlmModel(e.target.value)}
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-gray-900 transition outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  disabled={status === StepStatus.LOADING}
                  placeholder="gemini-2.5-pro"
                />
              </div>
              <div className="flex flex-1 flex-col gap-1.5 border-t border-slate-100 p-5">
                <label
                  htmlFor="maptilerInput"
                  className="text-xs font-bold tracking-wider text-gray-700 uppercase"
                >
                  MAPTILER API KEY
                </label>
                <input
                  id="maptilerInput"
                  aria-label="MapTiler API Key"
                  type="password"
                  value={maptilerKey}
                  onChange={(e) => setMaptilerKey(e.target.value)}
                  className="transition- rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  disabled={status === StepStatus.LOADING}
                  placeholder="MapTiler Key..."
                />
                <p className="mt-1 text-[10px] leading-relaxed text-gray-400">
                  Required for rendering the maps.
                </p>
              </div>
            </div>

            {/* Info: (20260413 - Luphia) Payment Gateway */}
            <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-5 py-3">
                <CreditCard className="h-4 w-4 text-emerald-600" />
                <h3 className="text-sm font-bold tracking-wide text-gray-800">
                  {t("admin_setup.step7.payment_gateway")}
                </h3>
                <span className="ml-auto rounded bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700">
                  {t("admin_setup.step7.stored_in_db")}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-4 p-5">
                <div className="flex gap-4">
                  <div className="flex w-1/3 flex-col gap-1.5">
                    <label
                      htmlFor="oenMerchantInput"
                      className="text-xs font-bold tracking-wider text-nowrap text-gray-700 uppercase"
                    >
                      {t("admin_setup.step7.oen_merchant_label")}
                    </label>
                    <input
                      id="oenMerchantInput"
                      aria-label="OEN Merchant ID"
                      type="text"
                      value={oenMerchant}
                      onChange={(e) => setOenMerchant(e.target.value)}
                      className="transition- w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                      disabled={status === StepStatus.LOADING}
                      placeholder="mermer"
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-1.5">
                    <label
                      htmlFor="oenTokenInput"
                      className="text-xs font-bold tracking-wider text-nowrap text-gray-700 uppercase"
                    >
                      {t("admin_setup.step7.oen_token_label")}
                    </label>
                    <input
                      id="oenTokenInput"
                      aria-label="OEN Access Token"
                      type="password"
                      value={oenToken}
                      onChange={(e) => setOenToken(e.target.value)}
                      className="transition- w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                      disabled={status === StepStatus.LOADING}
                      placeholder="Enter Top-Secret Token..."
                    />
                  </div>
                </div>
                <p className="text-[10px] leading-relaxed text-gray-400">
                  {t("admin_setup.step7.oen_hint")}
                </p>
              </div>
            </div>
          </div>

          {/* Info: (20260809 - Luphia) 第三方登入：這組值保管在資料庫並經 SUPER_ADMIN 簽章，不寫入 .env */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-5 py-3">
              <KeyRound className="h-4 w-4 text-violet-600" />
              <h3 className="text-sm font-bold tracking-wide text-gray-800">
                {t("admin_setup.step7.third_party_login")}
              </h3>
              <span className="ml-auto rounded bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700">
                {t("admin_setup.step7.stored_in_db")}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="googleClientIdInput"
                  className="text-xs font-bold tracking-wider text-gray-700 uppercase"
                >
                  {t("admin_setup.step7.google_client_id_label")}
                </label>
                <input
                  id="googleClientIdInput"
                  aria-label="Google OAuth Client ID"
                  type="text"
                  value={googleClientId}
                  onChange={(e) => setGoogleClientId(e.target.value)}
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-gray-900 transition outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500"
                  disabled={status === StepStatus.LOADING}
                  placeholder="1234567890-abc.apps.googleusercontent.com"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="googleClientSecretInput"
                  className="text-xs font-bold tracking-wider text-gray-700 uppercase"
                >
                  {t("admin_setup.step7.google_client_secret_label")}
                </label>
                <input
                  id="googleClientSecretInput"
                  aria-label="Google OAuth Client Secret"
                  type="password"
                  value={googleClientSecret}
                  onChange={(e) => setGoogleClientSecret(e.target.value)}
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-gray-900 transition outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500"
                  disabled={status === StepStatus.LOADING}
                  placeholder="GOCSPX-..."
                />
              </div>

              <p className="text-[10px] leading-relaxed text-gray-400 sm:col-span-2">
                {t("admin_setup.step7.google_hint")}
              </p>
            </div>
          </div>
        </div>
      )}
    </StepCard>
  );
}
