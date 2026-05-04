"use client";

import { useState, useEffect } from "react";

import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { X, User } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import LegalModal from "@/components/common/legal_modal";
import { useAuth } from "@/contexts/auth_context";
import { useRouter, usePathname } from "next/navigation";
import {
  fido2ClientService,
  getLoginOptions,
  verifyLogin,
} from "@/lib/auth/fido2_client";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { AppError } from "@/lib/utils/error";

import {
  registrationService,
  RegistrationStep,
} from "@/services/registration.service";
import AuthTransition, { LoginStep } from "@/components/auth/auth_transition";
import RewardScreen from "@/components/auth/reward_screen";
import CampaignRegistrationFields from "@/components/auth/campaign_registration_fields";
import { Role } from "@/generated";

interface IAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type AuthMode = "login" | "register";

export default function AuthModal({
  isOpen,
  onClose,
  onSuccess = undefined,
}: IAuthModalProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const { refreshAuth } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [agreedToTos, setAgreedToTos] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [legalDoc, setLegalDoc] = useState<
    "terms_of_service" | "privacy_policy" | null
  >(null);
  const [showUnregisteredPrompt, setShowUnregisteredPrompt] = useState(false);
  const [currentStep, setCurrentStep] = useState<RegistrationStep>("IDLE");
  const [loginStep, setLoginStep] = useState<LoginStep>("IDLE");

  // Info: (20260504 - Luphia) Campaign Registration
  const [campaignCode, setCampaignCode] = useState("");
  const [campaignData, setCampaignData] = useState<{
    id: string;
    code: string;
    name: string;
    description: string;
    bonusPoints: number;
    bonusModules: string[];
  } | null>(null);
  const [verifyingCampaign, setVerifyingCampaign] = useState(false);
  const [campaignError, setCampaignError] = useState("");
  const [entityType, setEntityType] = useState("individual");
  const [entityName, setEntityName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const [rewardData, setRewardData] = useState<{
    points: number;
    modules: string[];
  } | null>(null);
  const [onRewardAccept, setOnRewardAccept] = useState<(() => void) | null>(
    null,
  );

  const verifyCampaign = async (codeToVerify: string) => {
    setVerifyingCampaign(true);
    setCampaignError("");
    setCampaignData(null);
    try {
      const res = await fetch(`/api/v1/campaign/verify?code=${codeToVerify}`);
      const result = await res.json();
      if (res.ok && result.success) {
        setCampaignData(result.payload);
      } else {
        setCampaignError(result.message || "無效或已過期的活動代碼");
      }
    } catch {
      setCampaignError("活動驗證失敗");
    } finally {
      setVerifyingCampaign(false);
    }
  };

  useEffect(() => {
    if (!campaignCode) {
      setCampaignData(null);
      setCampaignError("");
      return;
    }

    const timer = setTimeout(() => {
      verifyCampaign(campaignCode);
    }, 1000);

    return () => clearTimeout(timer);
  }, [campaignCode]);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    setLoginStep("FETCHING_CHALLENGE");
    try {
      // Info: (20260116 - Tzuhan)  1. 取得 Stateless Challenge
      const { challenge, token } = await getLoginOptions();

      // Info: (20260105 - Tzuhan) 2. 喚起 Passkey
      setLoginStep("AUTHENTICATING");
      const authentication = await fido2ClientService.startLogin({
        challenge: challenge,
        userVerification: "required",
        timeout: 60000,
        // Info: (20260105 - Tzuhan) 不傳 allowCredentials，啟用探索模式
      });

      // Info: (20260105 - Tzuhan) 3. 驗證並登入
      setLoginStep("VERIFYING");
      const payload = await verifyLogin(token!, authentication);

      // Info: (20260105 - Tzuhan) 4. 成功
      localStorage.setItem("dewt", payload.dewt);
      localStorage.setItem("user_address", payload.user.address);

      const handleRedirect = () => {
        if (onSuccess) onSuccess();
        onClose();
        if (
          payload.user.role === Role.SUPER_ADMIN ||
          payload.user.role === Role.ADMIN
        ) {
          router.push("/admin/dashboard");
        } else if (pathname === "/") {
          router.push("/user/account_book/");
        }
      };

      // Info: (20260504 - Luphia) Check if there is pending campaign registration BEFORE refreshing auth (which would unmount this modal)
      const pendingStr = localStorage.getItem("pending_campaign_registration");
      if (pendingStr) {
        try {
          const pendingData = JSON.parse(pendingStr);
          const res = await fetch("/api/v1/user/campaign/register", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${payload.dewt}`,
            },
            body: JSON.stringify(pendingData),
          });

          if (res.ok) {
            const data = await res.json();
            localStorage.removeItem("pending_campaign_registration");
            setRewardData({
              points: data.payload.bonusPoints || 0,
              modules: data.payload.bonusModules || [],
            });
            setOnRewardAccept(() => async () => {
              // Info: (20260504 - Luphia) When accepted, finally update the global auth state and redirect
              await refreshAuth();
              setLoginStep("SUCCESS");
              handleRedirect();
            });
            return; // Info: (20260504 - Luphia) Pause the flow, wait for user to click accept
          }
        } catch (e) {
          console.error("Failed to register pending campaign:", e);
        }
        localStorage.removeItem("pending_campaign_registration");
      }

      await refreshAuth();
      setLoginStep("SUCCESS");

      // Info: (20260116 - Tzuhan) Add a small delay for user to see success message
      await new Promise((resolve) => setTimeout(resolve, 1500));
      handleRedirect();
    } catch (err: unknown) {
      console.error("Login error:", err);
      const isCanceled =
        err instanceof AppError &&
        err.apiCode === API_ERRORS.AUTH_USER_CANCELED.code;
      const message = err instanceof Error ? err.message : "Login failed";

      if (isCanceled) {
        setError(t("auth_modal.user_canceled"));
        setLoginStep("IDLE");
      } else if (
        message.includes("User not found") ||
        message.includes("not registered")
      ) {
        setShowUnregisteredPrompt(true);
        setError(null);
        setLoginStep("IDLE");
      } else {
        setError(message);
        setLoginStep("FAILED");
      }
    } finally {
      if (loginStep !== "SUCCESS") {
        setLoading(false);
      }
    }
  };

  const handleRegister = async (e?: { preventDefault: () => void }) => {
    if (e?.preventDefault) {
      e.preventDefault();
    }
    if (loading) return;

    if (!agreedToTos) {
      setError(t("auth_modal.tos_required"));
      return;
    }
    if (!username) {
      setError(t("auth_modal.username_required"));
      return;
    }

    if (campaignData && (!entityName || !contactEmail || !contactPhone)) {
      setError("請填寫完整的活動登錄資料");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await registrationService.signUp(
        username.trim(),
        (step) => setCurrentStep(step), // Info: (20260116 - Tzuhan) 更新 UI 狀態
      );

      // Info: (20260116 - Luphia) Add a small delay for user to see success message
      await new Promise((resolve) => setTimeout(resolve, 2000));

      if (campaignData) {
        localStorage.setItem(
          "pending_campaign_registration",
          JSON.stringify({
            campaignCode,
            entityType,
            entityName,
            contactEmail,
            contactPhone,
          }),
        );
      }

      /**
       * Info: (20260413 - Luphia) Do NOT automatically call handleLogin() here!
       * The blockchain indexer needs a few seconds to pick up the AccountCreated event.
       * Auto-triggering FIDO2 login immediately will result in a 404. Let the user click it manually.
       */
      setMode("login");
      setError(null);
    } catch (err: unknown) {
      console.error("Registration error:", err);
      const isCanceled =
        err instanceof AppError &&
        err.apiCode === API_ERRORS.AUTH_USER_CANCELED.code;
      const message =
        err instanceof Error ? err.message : "Registration failed";

      if (isCanceled) {
        setError(t("auth_modal.user_canceled"));
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
      setCurrentStep("IDLE");
    }
  };

  return (
    <>
      <Transition show={isOpen}>
        <Dialog className="relative z-50" onClose={onClose}>
          <TransitionChild
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-500/75 transition-opacity" />
          </TransitionChild>

          <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
              <TransitionChild
                enter="ease-out duration-300"
                enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                enterTo="opacity-100 translate-y-0 sm:scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              >
                <DialogPanel className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all sm:p-8">
                  {rewardData ? (
                    <RewardScreen
                      rewardData={rewardData}
                      onRewardAccept={() => {
                        if (onRewardAccept) onRewardAccept();
                      }}
                    />
                  ) : (
                    <>
                      <div className="absolute top-0 right-0 hidden pt-4 pr-4 sm:block">
                        <button
                          type="button"
                          className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:outline-none"
                          onClick={onClose}
                        >
                          <span className="sr-only">Close</span>
                          <X className="h-6 w-6" aria-hidden="true" />
                        </button>
                      </div>

                      <div className="sm:mx-auto sm:w-full sm:max-w-md">
                        <div className="mb-8 text-center">
                          <DialogTitle
                            as="h3"
                            className="text-2xl leading-9 font-bold tracking-tight text-gray-900"
                          >
                            {showUnregisteredPrompt
                              ? t("auth_modal.unregistered_confirm_title")
                              : mode === "login"
                                ? t("auth_modal.welcome_back")
                                : t("auth_modal.create_account")}
                          </DialogTitle>
                        </div>

                        {showUnregisteredPrompt ? (
                          <div className="space-y-6">
                            <p className="text-center text-sm text-gray-600">
                              {t("auth_modal.unregistered_confirm_desc")}
                            </p>
                            <div className="flex gap-4 pt-2">
                              <button
                                type="button"
                                onClick={() => setShowUnregisteredPrompt(false)}
                                className="flex-1 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-gray-300 transition ring-inset hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
                              >
                                {t("auth_modal.unregistered_confirm_no")}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setShowUnregisteredPrompt(false);
                                  setMode("register");
                                }}
                                className="flex-1 rounded-md bg-orange-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
                              >
                                {t("auth_modal.unregistered_confirm_yes")}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* Info: (20260103 - Luphia) Tabs */}
                            <div className="mb-6 flex border-b border-gray-200">
                              <button
                                type="button"
                                disabled={loading}
                                className={`flex-1 pb-2 text-center font-medium transition-colors ${
                                  mode === "login"
                                    ? "border-b-2 border-orange-600 text-orange-600"
                                    : "text-gray-500 hover:text-gray-700"
                                } ${loading ? "cursor-not-allowed opacity-50 hover:text-gray-500" : ""}`}
                                onClick={() => {
                                  if (loading) return;
                                  setMode("login");
                                  setError(null);
                                }}
                              >
                                {t("auth_modal.login_tab")}
                              </button>
                              <button
                                type="button"
                                disabled={loading}
                                className={`flex-1 pb-2 text-center font-medium transition-colors ${
                                  mode === "register"
                                    ? "border-b-2 border-orange-600 text-orange-600"
                                    : "text-gray-500 hover:text-gray-700"
                                } ${loading ? "cursor-not-allowed opacity-50 hover:text-gray-500" : ""}`}
                                onClick={() => {
                                  if (loading) return;
                                  setMode("register");
                                  setError(null);
                                }}
                              >
                                {t("auth_modal.register_tab")}
                              </button>
                            </div>

                            {/* Info: (20260103 - Luphia) Error Message */}
                            {error && (
                              <div className="mb-4 rounded-md bg-red-50 p-4">
                                <div className="flex">
                                  <div className="ml-3">
                                    <h3 className="text-sm font-medium text-red-800">
                                      {error}
                                    </h3>
                                  </div>
                                </div>
                              </div>
                            )}

                            {mode === "login" ? (
                              <>
                                {loading ? (
                                  <AuthTransition
                                    mode="login"
                                    step={loginStep}
                                  />
                                ) : (
                                  <div className="space-y-6">
                                    <div className="text-center text-sm text-gray-500">
                                      {t("auth_modal.login_desc")}
                                    </div>
                                    <button
                                      onClick={handleLogin}
                                      disabled={loading}
                                      className="flex w-full justify-center rounded-md bg-orange-600 px-3 py-1.5 text-sm leading-6 font-semibold text-white shadow-sm hover:bg-orange-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      {loading
                                        ? t("auth_modal.authenticating")
                                        : t("auth_modal.login_btn")}
                                    </button>
                                  </div>
                                )}
                              </>
                            ) : (
                              <>
                                {loading ? (
                                  <AuthTransition
                                    mode="register"
                                    step={currentStep}
                                  />
                                ) : (
                                  <form
                                    onSubmit={handleRegister}
                                    className="space-y-6"
                                  >
                                    <div>
                                      <label
                                        htmlFor="username"
                                        className="block text-sm leading-6 font-medium text-gray-900"
                                      >
                                        {t("auth_modal.username")}
                                      </label>
                                      <div className="relative mt-2">
                                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                          <User className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <input
                                          id="username"
                                          name="username"
                                          type="text"
                                          required
                                          value={username}
                                          onChange={(e) =>
                                            setUsername(e.target.value)
                                          }
                                          className="block w-full rounded-md border-0 py-1.5 pl-10 text-gray-900 ring-1 ring-gray-300 ring-inset placeholder:text-gray-400 focus:ring-2 focus:ring-orange-600 focus:ring-inset sm:text-sm sm:leading-6"
                                          placeholder={t(
                                            "auth_modal.username_placeholder",
                                          )}
                                          aria-label={t("auth_modal.username")}
                                        />
                                      </div>
                                    </div>

                                    <CampaignRegistrationFields
                                      campaignCode={campaignCode}
                                      setCampaignCode={setCampaignCode}
                                      verifyingCampaign={verifyingCampaign}
                                      campaignError={campaignError}
                                      campaignData={campaignData}
                                      entityType={entityType}
                                      setEntityType={setEntityType}
                                      entityName={entityName}
                                      setEntityName={setEntityName}
                                      contactEmail={contactEmail}
                                      setContactEmail={setContactEmail}
                                      contactPhone={contactPhone}
                                      setContactPhone={setContactPhone}
                                    />

                                    <div className="relative flex items-start">
                                      <div className="flex h-6 items-center">
                                        <input
                                          id="tos"
                                          name="tos"
                                          type="checkbox"
                                          checked={agreedToTos}
                                          onChange={(e) =>
                                            setAgreedToTos(e.target.checked)
                                          }
                                          className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-600"
                                          aria-label={
                                            t("auth_modal.tos_agree") +
                                            " " +
                                            t("auth_modal.tos_link")
                                          }
                                        />
                                      </div>
                                      <div className="ml-3 text-sm leading-6">
                                        <label
                                          htmlFor="tos"
                                          className="font-medium text-gray-900"
                                        >
                                          {t("auth_modal.tos_agree")}{" "}
                                          <button
                                            type="button"
                                            className="font-semibold text-orange-600 underline decoration-transparent transition-all hover:text-orange-500 hover:decoration-orange-500"
                                            onClick={() =>
                                              setLegalDoc("terms_of_service")
                                            }
                                          >
                                            {t("auth_modal.tos_link")}
                                          </button>{" "}
                                          {t("auth_modal.and")}{" "}
                                          <button
                                            type="button"
                                            className="font-semibold text-orange-600 underline decoration-transparent transition-all hover:text-orange-500 hover:decoration-orange-500"
                                            onClick={() =>
                                              setLegalDoc("privacy_policy")
                                            }
                                          >
                                            {t("auth_modal.privacy_link")}
                                          </button>
                                        </label>
                                      </div>
                                    </div>

                                    <button
                                      type="submit"
                                      disabled={loading}
                                      className="flex w-full justify-center rounded-md bg-orange-600 px-3 py-1.5 text-sm leading-6 font-semibold text-white shadow-sm hover:bg-orange-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      {loading
                                        ? t(
                                            `auth_modal.${currentStep.toLowerCase()}`,
                                          )
                                        : t("auth_modal.create_btn")}
                                    </button>
                                  </form>
                                )}
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </>
                  )}
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </Dialog>
      </Transition>

      <LegalModal
        isOpen={!!legalDoc}
        onClose={() => setLegalDoc(null)}
        documentType={legalDoc}
      />
    </>
  );
}
