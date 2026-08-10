import { useTranslation } from "@/i18n/i18n_context";
import { useState, useEffect } from "react";
import { Loader2, CheckCircle2, ShieldCheck } from "lucide-react";
import { StepCard } from "@/components/admin/setup/step_card";
import { IStepProps, StepStatus } from "@/components/admin/setup/setup_types";
import {
  verifyAndFinalizeConfig,
  getEnvHashChallenge,
  getEnvContentToSign,
  hasPendingSystemSettings,
  getSystemSettingChallenge,
  applySystemSettingSignature,
  ensureSecretVaultKey,
} from "@/app/admin/setup/_api/config.api";
import { fido2ClientService } from "@/lib/auth/fido2_client";

export function SetupFinalizeEnv({
  isActive,
  isCompleted,
  onReset,
}: IStepProps) {
  const { t } = useTranslation();

  const [status, setStatus] = useState<StepStatus>(StepStatus.IDLE);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [envItems, setEnvItems] = useState<{ key: string; value: string }[]>(
    [],
  );

  useEffect(() => {
    if (isActive && status !== StepStatus.SUCCESS && !isCompleted) {
      getEnvContentToSign()
        .then((res) => {
          if (res.success && res.items) {
            setEnvItems(res.items);
          }
        })
        .catch((e) => console.error("Failed to load env contents:", e));
    }
  }, [isActive, status, isCompleted]);

  /**
   * Info: (20260809 - Luphia) 系統設定（如 Google OAuth）保管在資料庫而非 .env，
   * 兩份資料各有自己的完整性簽章，因此需要各簽一次。
   * 沒有待簽的系統設定時完全跳過，不增加使用者負擔。
   */
  const signPendingSystemSettings = async () => {
    const pendingRes = await hasPendingSystemSettings();
    if (!pendingRes.success || !pendingRes.pending) return;

    const settingChallenge = await getSystemSettingChallenge();
    if (!settingChallenge.success || !settingChallenge.challenge) {
      throw new Error(
        settingChallenge.error || t("admin_setup.step8.err_challenge"),
      );
    }

    const settingAuth = await fido2ClientService.startLogin({
      challenge: settingChallenge.challenge,
    });

    const applyRes = await applySystemSettingSignature(settingAuth);
    if (!applyRes.success) {
      throw new Error(applyRes.error || t("admin_setup.step8.err_finalize"));
    }
  };

  const handleSignAndSave = async () => {
    setStatus(StepStatus.LOADING);
    try {
      /**
       * Info: (20260809 - Luphia) 必須在任何 digest 計算之前補上保險庫主密鑰，
       * 新產生的金鑰才會落在這次簽署的範圍內。
       */
      const vaultRes = await ensureSecretVaultKey();
      if (!vaultRes.success) {
        throw new Error(vaultRes.error || t("admin_setup.step8.err_finalize"));
      }

      // Info: (20260809 - Luphia) 先簽資料庫設定；成功後才動 .env，避免留下只完成一半的初始化
      await signPendingSystemSettings();

      const challengeRes = await getEnvHashChallenge();
      if (!challengeRes.success || !challengeRes.challenge) {
        throw new Error(
          challengeRes.error || t("admin_setup.step8.err_challenge"),
        );
      }

      const allowCredentials = undefined;
      const authentication = await fido2ClientService.startLogin({
        challenge: challengeRes.challenge,
        allowCredentials,
      });

      const res = await verifyAndFinalizeConfig(authentication);
      if (res.success) {
        setStatus(StepStatus.SUCCESS);
        window.location.href = "/admin/reboot";
      } else {
        setStatus(StepStatus.ERROR);
        setErrorMessage(`${t("admin_setup.step8.err_finalize")}${res.error}`);
      }
    } catch (err: unknown) {
      setStatus(StepStatus.ERROR);
      setErrorMessage(
        `${t("admin_setup.step8.err_sign")}${err instanceof Error ? err.message : String(err)}`,
      );
    }
  };

  const displayStatus = isCompleted && !isActive ? StepStatus.SUCCESS : status;

  return (
    <StepCard
      step={8}
      title={t("admin_setup.step8.title")}
      description={t("admin_setup.step8.desc")}
      isActive={isActive}
      status={displayStatus}
      errorMessage={errorMessage}
      onReset={onReset}
      actionContent={
        isActive && status !== StepStatus.SUCCESS ? (
          <button
            onClick={handleSignAndSave}
            disabled={status === StepStatus.LOADING}
            className="flex w-full items-center justify-center rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-orange-300 sm:w-auto"
          >
            {status === StepStatus.LOADING ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("admin_setup.step8.signing_status")}
              </>
            ) : (
              t("admin_setup.step8.sign_save_btn")
            )}
          </button>
        ) : null
      }
    >
      {isActive && status !== StepStatus.SUCCESS && (
        <div className="mt-5 flex flex-col gap-4 rounded-lg border border-orange-100 bg-orange-50 p-5">
          <div className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" />
            <p className="text-sm leading-relaxed font-medium text-orange-900">
              {t("admin_setup.step8.verify_msg")}
            </p>
          </div>

          {envItems.length > 0 && (
            <div className="custom-scrollbar max-h-48 w-full space-y-1 overflow-y-auto rounded border border-orange-200 bg-white p-3 font-mono text-xs">
              {envItems.map((item) => {
                const isSensitive =
                  /PASSWORD|KEY_PEM|API_KEY|TOKEN|SECRET|DATABASE_URL/i.test(
                    item.key,
                  );
                const displayValue =
                  isSensitive && item.value
                    ? item.value.substring(0, 3) + "********************"
                    : item.value;

                return (
                  <div key={item.key} className="flex gap-2">
                    <span className="shrink-0 font-bold text-orange-800">
                      {item.key}=
                    </span>
                    <span className="break-all text-slate-600">
                      {displayValue}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {(isCompleted || status === StepStatus.SUCCESS) && (
        <div className="mt-5 flex flex-col gap-3">
          <div className="flex items-center gap-4 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-emerald-800">
                {t("admin_setup.step8.ready_title")}
              </h4>
              <p className="mt-0.5 max-w-lg text-sm leading-relaxed text-emerald-600">
                {t("admin_setup.step8.ready_desc")}
              </p>
            </div>
          </div>
        </div>
      )}
    </StepCard>
  );
}
