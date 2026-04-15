import { useTranslation } from "@/i18n/i18n_context";
import { useEffect, useState } from "react";
import { Loader2, Globe, Bot, CreditCard, ShieldCheck } from "lucide-react";
import { StepCard } from "@/components/admin/setup/step_card";
import { IStepProps, StepStatus } from "@/components/admin/setup/setup_types";
import { saveExternalConfig } from "@/app/admin/setup/_api/config.api";

export function SetupDomainConfig({ isActive, isCompleted, onNext, onReset, envData }: IStepProps) {
  const { t } = useTranslation();

  const [status, setStatus] = useState<StepStatus>(StepStatus.IDLE);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [appUrlValue, setAppUrlValue] = useState<string>("https://isunfa.localhost");
  const [gaIdValue, setGaIdValue] = useState<string>("G-ZNVVW7JP0N");
  const [geminiKey, setGeminiKey] = useState<string>("");
  const [oenToken, setOenToken] = useState<string>("");
  const [oenMerchant, setOenMerchant] = useState<string>("mermer");

  // Info: (20260415 - Luphia) 解構出需要的基本型別值
  const appUrl = envData?.NEXT_PUBLIC_APP_URL;
  const gaId = envData?.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const apiGeminiKey = envData?.GEMINI_API_KEY;
  const tokenOen = envData?.OEN_ACCESS_TOKEN;
  const merchantOen = envData?.OEN_MERCHANT_ID;

  useEffect(() => {
    const tId = setTimeout(() => {
      // Info: (20260415 - Luphia) 只有當這些值存在時，才執行對應的 state 更新
      if (appUrl) setAppUrlValue(appUrl.replace(/^"(.*)"$/, '$1'));
      if (gaId) setGaIdValue(gaId.replace(/^"(.*)"$/, '$1'));
      if (apiGeminiKey) setGeminiKey(apiGeminiKey.replace(/^"(.*)"$/, '$1'));
      if (tokenOen) setOenToken(tokenOen.replace(/^"(.*)"$/, '$1'));
      if (merchantOen) setOenMerchant(merchantOen.replace(/^"(.*)"$/, '$1'));
    }, 0);
    return () => clearTimeout(tId);
  }, [
    appUrl,
    gaId,
    apiGeminiKey,
    tokenOen,
    merchantOen
  ]);

  const handleSaveAppUrl = async () => {
    setStatus(StepStatus.LOADING);
    const res = await saveExternalConfig({
      appUrl: appUrlValue,
      gaId: gaIdValue,
      geminiKey: geminiKey,
      oenToken: oenToken,
      oenMerchant: oenMerchant
    });
    if (res.success) {
      setStatus(StepStatus.SUCCESS);
      if (!isCompleted) {
        setTimeout(onNext, 800);
      } else {
        setTimeout(() => setStatus(StepStatus.IDLE), 2000); // Info: (20260413 - Luphia) 讓打勾按鈕維持 2 秒後重置
      }
    } else {
      setStatus(StepStatus.ERROR);
      setErrorMessage(res.error || t('admin_setup.step7.err_save'));
    }
  };

  const displayStatus = isCompleted ? StepStatus.SUCCESS : status;

  return (
    <StepCard
      step={7}
      title={t('admin_setup.step7.title')}
      description={t('admin_setup.step7.desc')}
      isActive={isActive}
      status={displayStatus}
      errorMessage={errorMessage}
      onReset={onReset}
      actionContent={
        <button
          onClick={handleSaveAppUrl}
          disabled={status === StepStatus.LOADING}
          className="w-full sm:w-auto px-6 py-2.5 bg-orange-600 text-white font-bold tracking-wide rounded-lg hover:bg-orange-700 disabled:bg-orange-300 transition flex items-center justify-center gap-2"
        >
          {status === StepStatus.LOADING ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> {t('admin_setup.step7.finalizing_btn')}</>
          ) : status === StepStatus.SUCCESS ? (
            <><ShieldCheck className="w-4 h-4" /> {t('admin_setup.step7.saved_btn')}</>
          ) : (
            <><ShieldCheck className="w-4 h-4" /> {t('admin_setup.step7.save_btn')}</>
          )}
        </button>
      }
    >
      {(isActive || isCompleted) && (
        <div className="mt-5 flex flex-col gap-5 max-w-3xl">

          {/* Info: (20260413 - Luphia) Core System Configuration */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden ">
            <div className="bg-slate-50 border-b border-slate-100 px-5 py-3 flex items-center gap-2">
              <Globe className="w-4 h-4 text-orange-600" />
              <h3 className="text-sm font-bold text-gray-800 tracking-wide">{t('admin_setup.step7.core_system')}</h3>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="appUrlInput" className="text-xs font-bold text-gray-700 uppercase tracking-wider">{t('admin_setup.step7.domain_label')}</label>
                <input
                  id="appUrlInput"
                  aria-label="Application URL"
                  type="text"
                  value={appUrlValue}
                  onChange={e => setAppUrlValue(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm bg-white text-gray-900 transition- outline-none"
                  disabled={status === StepStatus.LOADING}
                  placeholder="https://isunfa.localhost"
                />
                <p className="text-[10px] text-gray-400 mt-1">{t('admin_setup.step7.domain_hint')}</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="gaIdInput" className="text-xs font-bold text-gray-700 uppercase tracking-wider">{t('admin_setup.step7.ga_label')}</label>
                <input
                  id="gaIdInput"
                  aria-label="Google Analytics ID"
                  type="text"
                  value={gaIdValue}
                  onChange={e => setGaIdValue(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm bg-white text-gray-900 transition- outline-none"
                  disabled={status === StepStatus.LOADING}
                  placeholder={t('admin_setup.step7.ga_placeholder')}
                />
                <p className="text-[10px] text-gray-400 mt-1">{t('admin_setup.step7.ga_hint')}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Info: (20260413 - Luphia) AI Integration */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
              <div className="bg-slate-50 border-b border-slate-100 px-5 py-3 flex items-center gap-2">
                <Bot className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-gray-800 tracking-wide">{t('admin_setup.step7.ai_consult')}</h3>
              </div>
              <div className="p-5 flex-1 flex flex-col gap-1.5">
                <label htmlFor="geminiInput" className="text-xs font-bold text-gray-700 uppercase tracking-wider">{t('admin_setup.step7.gemini_label')}</label>
                <input
                  id="geminiInput"
                  aria-label="Gemini API Key"
                  type="password"
                  value={geminiKey}
                  onChange={e => setGeminiKey(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white text-gray-900 transition- outline-none"
                  disabled={status === StepStatus.LOADING}
                  placeholder="AIzaSy..."
                />
                <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">
                  {t('admin_setup.step7.gemini_hint')}
                </p>
              </div>
            </div>

            {/* Info: (20260413 - Luphia) Payment Gateway */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
              <div className="bg-slate-50 border-b border-slate-100 px-5 py-3 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-gray-800 tracking-wide">{t('admin_setup.step7.payment_gateway')}</h3>
              </div>
              <div className="p-5 flex-1 flex flex-col gap-4">
                <div className="flex gap-4">
                  <div className="flex flex-col gap-1.5 w-1/3">
                    <label htmlFor="oenMerchantInput" className="text-xs font-bold text-gray-700 uppercase tracking-wider text-nowrap">{t('admin_setup.step7.oen_merchant_label')}</label>
                    <input
                      id="oenMerchantInput"
                      aria-label="OEN Merchant ID"
                      type="text"
                      value={oenMerchant}
                      onChange={e => setOenMerchant(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm bg-white text-gray-900 transition- outline-none"
                      disabled={status === StepStatus.LOADING}
                      placeholder="mermer"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 flex-1">
                    <label htmlFor="oenTokenInput" className="text-xs font-bold text-gray-700 uppercase tracking-wider text-nowrap">{t('admin_setup.step7.oen_token_label')}</label>
                    <input
                      id="oenTokenInput"
                      aria-label="OEN Access Token"
                      type="password"
                      value={oenToken}
                      onChange={e => setOenToken(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm bg-white text-gray-900 transition- outline-none"
                      disabled={status === StepStatus.LOADING}
                      placeholder="Enter Top-Secret Token..."
                    />
                  </div>
                </div>
                <p className="text-[10px] text-gray-400 leading-relaxed">
                  {t('admin_setup.step7.oen_hint')}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </StepCard>
  );
}
