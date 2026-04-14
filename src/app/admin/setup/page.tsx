"use client";

import { useState, useEffect } from "react";
import ConfirmModal from "@/components/common/confirm_modal";
import { useTranslation } from "@/i18n/i18n_context";
import { SetupVerifyEngine } from "@/components/admin/setup/verify_engine_step";
import { SetupStartVerifyNodes } from "@/components/admin/setup/start_verify_nodes_step";
import { SetupFundWallet } from "@/components/admin/setup/fund_wallet_step";
import { SetupDeployContracts } from "@/components/admin/setup/deploy_contracts_step";
import { SetupInitDatabase } from "@/components/admin/setup/init_database_step";
import { SetupSuperAdmin } from "@/components/admin/setup/super_admin_step";
import { SetupDomainConfig } from "@/components/admin/setup/domain_config_step";
import { SetupFinalizeEnv } from "@/components/admin/setup/finalize_env_step";
import { WizardHeader } from "@/components/admin/setup/wizard_header";
import { WizardSidebar, IWizardStep } from "@/components/admin/setup/wizard_sidebar";
import { getEnvSignatureStatus } from "@/app/admin/setup/_api/config.api";
import { clearSuperAdminConfig } from "@/app/admin/setup/_api/identity.api";
import { Settings, Loader2, ServerCrash } from "lucide-react";

export default function SetupWizardPage() {
  const { t } = useTranslation();
  const STEPS: IWizardStep[] = [
    { id: 1, title: t("admin_setup.step1.title"), detail: t("admin_setup.step1.desc"), component: SetupVerifyEngine },
    { id: 2, title: t("admin_setup.step2.title"), detail: t("admin_setup.step2.desc"), component: SetupStartVerifyNodes },
    { id: 3, title: t("admin_setup.step3.title"), detail: t("admin_setup.step3.desc"), component: SetupFundWallet },
    { id: 4, title: t("admin_setup.step4.title"), detail: t("admin_setup.step4.desc"), component: SetupDeployContracts },
    { id: 5, title: t("admin_setup.step5.title"), detail: t("admin_setup.step5.desc"), component: SetupInitDatabase },
    { id: 6, title: t("admin_setup.step6.title"), detail: t("admin_setup.step6.desc"), component: SetupSuperAdmin },
    { id: 7, title: t("admin_setup.step7.title"), detail: t("admin_setup.step7.desc"), component: SetupDomainConfig },
    { id: 8, title: t("admin_setup.step8.title"), detail: t("admin_setup.step8.desc"), component: SetupFinalizeEnv },
  ];

  const [step, setStep] = useState(1);
  const [activeTab, setActiveTab] = useState(1);
  const [envData, setEnvData] = useState<Record<string, string> | undefined>();
  const [isLockedMode, setIsLockedMode] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getEnvSignatureStatus().then(res => {
      setIsLoading(false);
      if (res.success) {
        setEnvData(res.envData);

        if (res.status === "COMPLETE") {
          window.location.href = "/admin/reboot";
        } else if (res.status === "SIGNATURE_MISMATCH" || (res.status === "MISSING_KEYS" && res.missingKeys?.length === 1 && res.missingKeys[0] === "SUPER_ADMIN_SIGNATURE")) {
          setStep(8);
          setActiveTab(8);
          setIsLockedMode(true);
        } else if (res.status === "MISSING_KEYS" && res.missingKeys && res.missingKeys.length > 0) {
          const KEY_STEP_MAP: Record<string, number> = {
            POSTGRES_HOST: 2,
            POSTGRES_PORT: 2,
            STORAGE_DOMAIN: 2,
            NEXT_PUBLIC_RPC_URL: 2,
            NEXT_PUBLIC_BAIFA_EXPLORER: 2,
            NEXT_PUBLIC_ISUNCOIN_CHAIN_ID: 2,
            REPORT_OUTPUT_DIR: 2,
            NEXT_PUBLIC_KYC_REGISTRY_ADDRESS: 4,
            NEXT_PUBLIC_DYNAMIC_MEMBERSHIP_CARD_ADDRESS: 4,
            NEXT_PUBLIC_CREDIT_POINT_ADDRESS: 4,
            NEXT_PUBLIC_MEMBERSHIP_SYSTEM_ADDRESS: 4,
            NEXT_PUBLIC_SUBSCRIPTION_MANAGER_ADDRESS: 4,
            NEXT_PUBLIC_SCW_FACTORY_ADDRESS: 4,
            NEXT_PUBLIC_ENTRY_POINT_ADDRESS: 4,
            POSTGRES_DB: 5,
            POSTGRES_USER: 5,
            POSTGRES_PASSWORD: 5,
            DATABASE_URL: 5,
            DEWT_PRIVATE_KEY_PEM: 5,
            SUPER_ADMIN_CRED_ID: 6,
            SUPER_ADMIN_PUB_X: 6,
            SUPER_ADMIN_PUB_Y: 6,
            NEXT_PUBLIC_APP_URL: 7,
            NEXT_PUBLIC_GA_MEASUREMENT_ID: 7,
            GEMINI_API_KEY: 7,
            OEN_ACCESS_TOKEN: 7,
            OEN_MERCHANT_ID: 7,
            MODEL: 7,
            SUPER_ADMIN_SIGNATURE: 8,
          };
          let minStep = 8;
          for (const key of res.missingKeys) {
            const s = KEY_STEP_MAP[key] || 1;
            if (s < minStep) minStep = s;
          }
          if (minStep < 1) minStep = 1;

          setStep(minStep);
          setActiveTab(minStep);
          setIsLockedMode(false);
        }
      }
    }).catch(err => {
      setIsLoading(false);
      setError(err.message || "Unknown error");
    });
  }, []);

  const handleNext = (callerId: number) => {
    setStep(s => {
      if (s !== callerId) return s;
      const nextStep = s + 1;
      setActiveTab(nextStep);
      return nextStep;
    });
  };

  const handleResetClick = () => {
    setIsResetModalOpen(true);
  };

  const handleConfirmReset = () => {
    if (step === 8) {
      clearSuperAdminConfig().catch(console.error);
    }
    setStep(1);
    setActiveTab(1);
    setIsLockedMode(false);
    setIsResetModalOpen(false);
    setResetKey(k => k + 1);
  };

  let progressPercentage = Math.round(((step - 1) / (STEPS.length)) * 100);
  if (step === STEPS.length) progressPercentage = 99;
  if (step > STEPS.length) progressPercentage = 100;

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Settings className="w-16 h-16 text-orange-500 opacity-20" />
            <Loader2 className="w-8 h-8 text-orange-500 animate-spin absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <span className="text-slate-500 font-medium animate-pulse">{t('admin_setup.page.init')}</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <ServerCrash className="w-16 h-16 text-rose-500" />
          <h2 className="text-xl font-bold text-slate-800">{t('admin_setup.page.fatal')}</h2>
          <div className="bg-rose-50 text-rose-700 p-4 rounded-xl text-sm max-w-sm">
            <p className="font-semibold mb-2">{t('admin_setup.page.fatal_desc')}</p>
            <code className="block bg-white/50 p-2 rounded border border-rose-100 font-mono text-xs break-all">
              {error}
            </code>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-6 py-2.5 bg-slate-800 text-white font-medium rounded-lg hover:bg-slate-700 transition"
          >
            {t('admin_setup.page.retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-50 flex flex-col py-4 sm:py-6 items-center px-4 font-sans relative overflow-hidden">
      <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl opacity-30" aria-hidden="true">
        <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-br from-orange-400 to-amber-200 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" />
      </div>

      <div className="w-full max-w-6xl h-full flex flex-col gap-4 sm:gap-6 min-h-0">

        <WizardHeader progressPercentage={progressPercentage} />

        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-4 sm:gap-6 lg:items-start flex-1 min-h-0 w-full pb-4 lg:pb-0">
          <WizardSidebar
            steps={STEPS}
            activeTab={activeTab}
            currentStep={step}
            onTabClick={setActiveTab}
            isLockedMode={isLockedMode}
          />

          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 w-full flex-1 lg:h-full overflow-y-auto custom-scrollbar relative z-10 flex flex-col">
            <div key={`steps-container-${resetKey}`} className="p-4 sm:p-6 flex-1 h-full flex flex-col min-h-[500px] lg:min-h-0">
              {STEPS.map(({ id, component: Component }) => {
                if (!Component) return null;
                return (
                  <div key={id} className={`h-full ${activeTab === id ? "block" : "hidden"}`}>
                    <Component
                      step={id}
                      isActive={step === id && activeTab === id}
                      isCompleted={step > id}
                      onNext={id === STEPS.length ? () => {
                        setStep(s => s === id ? id + 1 : s);
                      } : () => handleNext(id)}
                      onReset={isLockedMode ? handleResetClick : undefined}
                      envData={envData}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        title={t('admin_setup.header.restart_title')}
        message={t('admin_setup.header.restart_desc')}
        confirmText={t('admin_setup.header.reset')}
        cancelText={t('common.cancel')}
        onConfirm={handleConfirmReset}
      />
    </div>
  );
}
