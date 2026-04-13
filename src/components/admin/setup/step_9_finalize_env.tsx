import { useState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { StepCard } from "@/components/admin/setup/step_card";
import { IStepProps, StepStatus } from "@/components/admin/setup/setup_types";
import { verifyAndFinalizeConfig, getEnvHashChallenge } from "@/app/admin/setup/_api/config.api";
import { fido2ClientService } from "@/lib/auth/fido2_client";
import { checkSuperAdminExists } from "@/app/admin/setup/_api/identity.api";

export function Step9FinalizeEnv({ isActive, isCompleted, onNext }: IStepProps) {
  const [status, setStatus] = useState<StepStatus>(StepStatus.IDLE);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const handleSignAndSave = async () => {
    setStatus(StepStatus.LOADING);
    try {
      const challengeRes = await getEnvHashChallenge();
      if (!challengeRes.success || !challengeRes.challenge) {
        throw new Error(challengeRes.error || "Failed to generate signing challenge.");
      }

      const superAdminInfo = await checkSuperAdminExists();
      const allowCredentials = superAdminInfo.credId ? [{ id: superAdminInfo.credId, type: "public-key" as const, transports: [] as AuthenticatorTransport[] }] : undefined;

      const authentication = await fido2ClientService.startLogin({
        challenge: challengeRes.challenge,
        allowCredentials
      });

      const res = await verifyAndFinalizeConfig(authentication);
      if (res.success) {
        setStatus(StepStatus.SUCCESS);
        onNext();
      } else {
        setStatus(StepStatus.ERROR);
        setErrorMessage(`Failed to finalize config: ${res.error}`);
      }
    } catch (err: unknown) {
      setStatus(StepStatus.ERROR);
      setErrorMessage(`Signing failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const displayStatus = isCompleted ? StepStatus.SUCCESS : status;

  return (
    <StepCard
      step={8}
      title="Step 8: Finalize Configuration"
      description="Sign the environment variables with FIDO2 to seal the enterprise deployment securely."
      isActive={isActive}
      status={displayStatus}
      errorMessage={errorMessage}
    >
      {isActive && status !== StepStatus.SUCCESS && (
        <div className="mt-5 p-5 bg-orange-50 border border-orange-100 rounded-lg shadow-sm space-y-4">
          <p className="text-sm text-orange-900 leading-relaxed font-medium">
            Verification Complete. The system relies on WebAuthn assertion to prevent tampering. Please sign the environment configuration to complete the deployment.
          </p>
          <button
            onClick={handleSignAndSave}
            disabled={status === StepStatus.LOADING}
            className="w-full sm:w-auto px-5 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 disabled:cursor-not-allowed text-white font-medium rounded-lg text-sm shadow-sm transition-all flex items-center justify-center"
          >
            {status === StepStatus.LOADING ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Signing & Finalizing...
              </>
            ) : (
              "Sign & Save Configuration"
            )}
          </button>
        </div>
      )}

      {(isCompleted || status === StepStatus.SUCCESS) && (
        <div className="mt-5">
          <div className="p-5 bg-emerald-50 border-emerald-200 border rounded-xl flex items-center gap-4">
            <div className="w-10 h-10 shrink-0 bg-emerald-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h4 className="text-emerald-800 font-semibold text-sm">Enterprise System Ready</h4>
              <p className="text-emerald-600 text-sm mt-0.5 max-w-lg leading-relaxed">
                Configuration securely signed. The backend infrastructure is now fully operational with FIDO2 enforcement.
              </p>
            </div>
          </div>
        </div>
      )}
    </StepCard>
  );
}
