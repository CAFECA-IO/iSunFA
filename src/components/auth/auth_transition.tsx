import { useTranslation } from "@/i18n/i18n_context";
import { RegistrationStep } from "@/constants/auth_provider";
import { Loader2, CheckCircle2 } from "lucide-react";

export type LoginStep =
  | "IDLE"
  | "FETCHING_CHALLENGE"
  | "AUTHENTICATING"
  | "VERIFYING"
  | "SUCCESS"
  | "FAILED";

interface IAuthTransitionProps {
  mode: "login" | "register";
  step: RegistrationStep | LoginStep;
}

export default function AuthTransition({ mode, step }: IAuthTransitionProps) {
  const { t } = useTranslation();

  const getStepDescription = () => {
    if (mode === "register") {
      const regStep = step as RegistrationStep;
      switch (regStep) {
        case RegistrationStep.FETCHING_CHALLENGE:
          return t("registration_steps.fetching_challenge");
        case RegistrationStep.CREATING_PASSKEY:
          return t("registration_steps.creating_passkey");
        case RegistrationStep.REGISTERING:
          return t("registration_steps.registering");
        case RegistrationStep.SUCCESS:
          return t("registration_steps.success");
        case RegistrationStep.FAILED:
          return t("registration_steps.failed");
        default:
          return t("registration_steps.processing");
      }
    } else {
      const loginStep = step as LoginStep;
      switch (loginStep) {
        case "FETCHING_CHALLENGE":
          return t("login_steps.fetching_challenge");
        case "AUTHENTICATING":
          return t("login_steps.authenticating");
        case "VERIFYING":
          return t("login_steps.verifying");
        case "SUCCESS":
          return t("login_steps.success");
        case "FAILED":
          return t("login_steps.failed");
        default:
          return t("login_steps.processing");
      }
    }
  };

  const isSuccess = step === "SUCCESS";

  return (
    <div className="animate-in fade-in flex flex-col items-center justify-center space-y-4 py-8 duration-300 sm:py-12">
      <div className="relative">
        {isSuccess ? (
          <CheckCircle2 className="animate-in zoom-in h-16 w-16 text-green-500 duration-300" />
        ) : (
          <Loader2 className="h-16 w-16 animate-spin text-orange-600" />
        )}
      </div>
      <div className="space-y-2 text-center">
        <h3 className="text-lg font-semibold text-gray-900">
          {isSuccess
            ? mode === "register"
              ? t("registration_steps.complete_title")
              : t("login_steps.complete_title")
            : mode === "register"
              ? t("registration_steps.processing_title")
              : t("login_steps.processing_title")}
        </h3>
        <p className="animate-pulse text-sm text-gray-500">
          {getStepDescription()}
        </p>
      </div>
    </div>
  );
}
