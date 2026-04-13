import { useEffect, useState } from "react";
import { Loader2, Globe, Bot, CreditCard, ShieldCheck } from "lucide-react";
import { StepCard } from "@/components/admin/setup/step_card";
import { IStepProps, StepStatus } from "@/components/admin/setup/setup_types";
import { saveExternalConfig, getExternalConfig } from "@/app/admin/setup/_api/config.api";

export function Step8DomainConfig({ isActive, isCompleted, onNext }: IStepProps) {
  const [status, setStatus] = useState<StepStatus>(StepStatus.IDLE);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [appUrlValue, setAppUrlValue] = useState<string>("https://isunfa.localhost");
  const [gaIdValue, setGaIdValue] = useState<string>("G-ZNVVW7JP0N");
  const [geminiKey, setGeminiKey] = useState<string>("");
  const [oenToken, setOenToken] = useState<string>("");
  const [oenMerchant, setOenMerchant] = useState<string>("mermer");

  useEffect(() => {
    if (isActive && status === StepStatus.IDLE) {
      getExternalConfig().then(res => {
        if (res.success && res.data) {
          if (res.data.appUrl) setAppUrlValue(res.data.appUrl.replace(/^"(.*)"$/, '$1'));
          if (res.data.gaId) setGaIdValue(res.data.gaId.replace(/^"(.*)"$/, '$1'));
          if (res.data.geminiKey) setGeminiKey(res.data.geminiKey.replace(/^"(.*)"$/, '$1'));
          if (res.data.oenToken) setOenToken(res.data.oenToken.replace(/^"(.*)"$/, '$1'));
          if (res.data.oenMerchant) setOenMerchant(res.data.oenMerchant.replace(/^"(.*)"$/, '$1'));
        }
      }).catch(console.error);
    }
  }, [isActive, status]);

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
      setErrorMessage(res.error || "Failed to save configuration");
    }
  };

  const displayStatus = isCompleted ? StepStatus.SUCCESS : status;

  return (
    <StepCard
      step={7}
      title="Step 7: Domain & API Configuration"
      description="Configure the primary domain URL and external API integrations."
      isActive={isActive}
      status={displayStatus}
      errorMessage={errorMessage}
    >
      {(isActive || isCompleted) && (
        <div className="mt-5 flex flex-col gap-5 max-w-3xl">

          {/* Info: (20260413 - Luphia) Core System Configuration */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="bg-slate-50 border-b border-slate-100 px-5 py-3 flex items-center gap-2">
              <Globe className="w-4 h-4 text-orange-600" />
              <h3 className="text-sm font-bold text-gray-800 tracking-wide">Core Ecosystem</h3>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="appUrlInput" className="text-xs font-bold text-gray-700 uppercase tracking-wider">Application URL</label>
                <input
                  id="appUrlInput"
                  aria-label="Application URL"
                  type="text"
                  value={appUrlValue}
                  onChange={e => setAppUrlValue(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm bg-white text-gray-900 transition-shadow outline-none"
                  disabled={status === StepStatus.LOADING}
                  placeholder="https://isunfa.localhost"
                />
                <p className="text-[10px] text-gray-400 mt-1">Primary endpoint required for absolute routing and OAuth callbacks.</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="gaIdInput" className="text-xs font-bold text-gray-700 uppercase tracking-wider">Google Analytics ID</label>
                <input
                  id="gaIdInput"
                  aria-label="Google Analytics ID"
                  type="text"
                  value={gaIdValue}
                  onChange={e => setGaIdValue(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm bg-white text-gray-900 transition-shadow outline-none"
                  disabled={status === StepStatus.LOADING}
                  placeholder="G-XXXXXXXXXX"
                />
                <p className="text-[10px] text-gray-400 mt-1">Optional telemetry integration for web traffic tracking.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Info: (20260413 - Luphia) AI Integration */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
              <div className="bg-slate-50 border-b border-slate-100 px-5 py-3 flex items-center gap-2">
                <Bot className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-gray-800 tracking-wide">AI Consultation</h3>
              </div>
              <div className="p-5 flex-1 flex flex-col gap-1.5">
                <label htmlFor="geminiInput" className="text-xs font-bold text-gray-700 uppercase tracking-wider">Gemini API Key</label>
                <input
                  id="geminiInput"
                  aria-label="Gemini API Key"
                  type="password"
                  value={geminiKey}
                  onChange={e => setGeminiKey(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white text-gray-900 transition-shadow outline-none"
                  disabled={status === StepStatus.LOADING}
                  placeholder="AIzaSy..."
                />
                <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">
                  Powers the LLM vector search engine. If omitted, the AI Assistant will operate in fallback mock mode.
                </p>
              </div>
            </div>

            {/* Info: (20260413 - Luphia) Payment Gateway */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
              <div className="bg-slate-50 border-b border-slate-100 px-5 py-3 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-gray-800 tracking-wide">OEN Payment Gateway</h3>
              </div>
              <div className="p-5 flex-1 flex flex-col gap-4">
                <div className="flex gap-4">
                  <div className="flex flex-col gap-1.5 w-1/3">
                    <label htmlFor="oenMerchantInput" className="text-xs font-bold text-gray-700 uppercase tracking-wider text-nowrap">Merchant ID</label>
                    <input
                      id="oenMerchantInput"
                      aria-label="OEN Merchant ID"
                      type="text"
                      value={oenMerchant}
                      onChange={e => setOenMerchant(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm bg-white text-gray-900 transition-shadow outline-none"
                      disabled={status === StepStatus.LOADING}
                      placeholder="mermer"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 flex-1">
                    <label htmlFor="oenTokenInput" className="text-xs font-bold text-gray-700 uppercase tracking-wider text-nowrap">Access Token</label>
                    <input
                      id="oenTokenInput"
                      aria-label="OEN Access Token"
                      type="password"
                      value={oenToken}
                      onChange={e => setOenToken(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm bg-white text-gray-900 transition-shadow outline-none"
                      disabled={status === StepStatus.LOADING}
                      placeholder="Enter Top-Secret Token..."
                    />
                  </div>
                </div>
                <p className="text-[10px] text-gray-400 leading-relaxed">
                  Required for fiat on-ramp operations. Generates dynamic invoices and records payment statuses off-chain.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={handleSaveAppUrl}
              disabled={status === StepStatus.LOADING}
              className="w-full sm:w-auto px-6 py-2.5 bg-orange-600 text-white font-bold tracking-wide rounded-lg hover:bg-orange-700 disabled:bg-orange-300 transition shadow-sm flex items-center justify-center gap-2"
            >
              {status === StepStatus.LOADING ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Finalizing Integrations...</>
              ) : status === StepStatus.SUCCESS ? (
                <><ShieldCheck className="w-4 h-4" /> Configuration Saved!</>
              ) : (
                <><ShieldCheck className="w-4 h-4" /> Save & Secure Configuration</>
              )}
            </button>
          </div>
        </div>
      )}
    </StepCard>
  );
}
