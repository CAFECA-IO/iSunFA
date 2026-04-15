import { useTranslation } from "@/i18n/i18n_context";
import { useState, useEffect } from "react";
import { Loader2, CheckCircle2, ShieldCheck } from "lucide-react";
import { StepCard } from "@/components/admin/setup/step_card";
import { IStepProps, StepStatus } from "@/components/admin/setup/setup_types";
import { verifyAndFinalizeConfig, getEnvHashChallenge, getEnvContentToSign } from "@/app/admin/setup/_api/config.api";
import { fido2ClientService } from "@/lib/auth/fido2_client";

export function SetupFinalizeEnv({ isActive, isCompleted, onReset }: IStepProps) {
  const { t } = useTranslation();

  const [status, setStatus] = useState<StepStatus>(StepStatus.IDLE);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [envItems, setEnvItems] = useState<{ key: string, value: string }[]>([]);

  useEffect(() => {
    if (isActive && status !== StepStatus.SUCCESS && !isCompleted) {
      getEnvContentToSign().then((res) => {
        if (res.success && res.items) {
          setEnvItems(res.items);
        }
      }).catch(e => console.error("Failed to load env contents:", e));
    }
  }, [isActive, status, isCompleted]);

  const handleSignAndSave = async () => {
    setStatus(StepStatus.LOADING);
    try {
      const challengeRes = await getEnvHashChallenge();
      if (!challengeRes.success || !challengeRes.challenge) {
        throw new Error(challengeRes.error || t('admin_setup.step8.err_challenge'));
      }

      const allowCredentials = undefined;
      const authentication = await fido2ClientService.startLogin({
        challenge: challengeRes.challenge,
        allowCredentials
      });

      const res = await verifyAndFinalizeConfig(authentication);
      if (res.success) {
        setStatus(StepStatus.SUCCESS);
        window.location.href = '/admin/reboot';
      } else {
        setStatus(StepStatus.ERROR);
        setErrorMessage(`${t('admin_setup.step8.err_finalize')}${res.error}`);
      }
    } catch (err: unknown) {
      setStatus(StepStatus.ERROR);
      setErrorMessage(`${t('admin_setup.step8.err_sign')}${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const displayStatus = isCompleted && !isActive ? StepStatus.SUCCESS : status;

  return (
    <StepCard
      step={8}
      title={t('admin_setup.step8.title')}
      description={t('admin_setup.step8.desc')}
      isActive={isActive}
      status={displayStatus}
      errorMessage={errorMessage}
      onReset={onReset}
      actionContent={
        isActive && status !== StepStatus.SUCCESS ? (
          <button
            onClick={handleSignAndSave}
            disabled={status === StepStatus.LOADING}
            className="w-full sm:w-auto px-5 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 disabled:cursor-not-allowed text-white font-medium rounded-lg text-sm transition-all flex items-center justify-center"
          >
            {status === StepStatus.LOADING ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('admin_setup.step8.signing_status')}
              </>
            ) : (
              t('admin_setup.step8.sign_save_btn')
            )}
          </button>
        ) : null
      }
    >
      {isActive && status !== StepStatus.SUCCESS && (
        <div className="mt-5 p-5 bg-orange-50 border border-orange-100 rounded-lg flex flex-col gap-4">
          <div className="flex items-start gap-2">
            <ShieldCheck className="w-5 h-5 text-orange-600 mt-0.5 shrink-0" />
            <p className="text-sm text-orange-900 leading-relaxed font-medium">
              {t('admin_setup.step8.verify_msg')}
            </p>
          </div>

          {envItems.length > 0 && (
            <div className="bg-white border border-orange-200 rounded p-3 text-xs font-mono max-h-48 overflow-y-auto custom-scrollbar space-y-1 w-full">
              {envItems.map(item => {
                const isSensitive = /PASSWORD|KEY_PEM|API_KEY|TOKEN|SECRET|DATABASE_URL/i.test(item.key);
                const displayValue = isSensitive && item.value
                  ? item.value.substring(0, 3) + "********************"
                  : item.value;

                return (
                  <div key={item.key} className="flex gap-2">
                    <span className="text-orange-800 font-bold shrink-0">{item.key}=</span>
                    <span className="text-slate-600 break-all">{displayValue}</span>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {(isCompleted || status === StepStatus.SUCCESS) && (
        <div className="mt-5 flex flex-col gap-3">
          <div className="p-5 bg-emerald-50 border-emerald-200 border rounded-xl flex items-center gap-4">
            <div className="w-10 h-10 shrink-0 bg-emerald-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h4 className="text-emerald-800 font-semibold text-sm">{t('admin_setup.step8.ready_title')}</h4>
              <p className="text-emerald-600 text-sm mt-0.5 max-w-lg leading-relaxed">
                {t('admin_setup.step8.ready_desc')}
              </p>
            </div>
          </div>
        </div>
      )}
    </StepCard>
  );
}
