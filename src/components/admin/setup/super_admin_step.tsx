import { useTranslation } from "@/i18n/i18n_context";
import { useEffect, useState, useCallback } from "react";
import { ExternalLink, Trash2 } from "lucide-react";
import { StepCard } from "@/components/admin/setup/step_card";
import ConfirmModal from "@/components/common/confirm_modal";
import { IStepProps, StepStatus } from "@/components/admin/setup/setup_types";
import {
  checkSuperAdminExists,
  createSuperAdminRecord,
  authorizeSuperAdmin,
  getAdminList,
  createAdminRecord,
  deleteAdminRecord,
  getSuperAdminTaskStatus,
} from "@/app/admin/setup/_api/identity.api";
import { saveExternalConfig } from "@/app/admin/setup/_api/config.api";
import {
  fido2ClientService,
  getRegisterChallenge,
  getLoginOptions,
  parsePasskey,
} from "@/lib/auth/fido2_client";

export function SetupSuperAdmin({
  isActive,
  isCompleted,
  onNext,
  onReset,
  envData,
}: IStepProps) {
  const { t } = useTranslation();

  const [status, setStatus] = useState<StepStatus>(StepStatus.IDLE);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isAddAdminModalOpen, setIsAddAdminModalOpen] = useState(false);
  const [newAdminName, setNewAdminName] = useState("");
  const [isReplaceModalOpen, setIsReplaceModalOpen] = useState(false);
  const [newSuperAdminName, setNewSuperAdminName] = useState("");
  const [adminExists, setAdminExists] = useState<boolean | null>(null);
  const [adminAddress, setAdminAddress] = useState<string>("");
  const [adminNeedsAuth, setAdminNeedsAuth] = useState<boolean>(false);
  const [adminList, setAdminList] = useState<
    {
      address: string;
      name: string | null;
      role: string;
      createdAt: string | Date;
    }[]
  >([]);
  const [taskProgress, setTaskProgress] = useState<string>("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [targetDeleteAdmin, setTargetDeleteAdmin] = useState<{
    address: string;
    name: string;
  } | null>(null);
  const [appUrlValue, setAppUrlValue] = useState<string>(
    "https://isunfa.localhost",
  );
  const [isSavingAppUrl, setIsSavingAppUrl] = useState(false);

  useEffect(() => {
    if (envData?.NEXT_PUBLIC_APP_URL) {
      setAppUrlValue(envData.NEXT_PUBLIC_APP_URL.replace(/^"(.*)"$/, "$1"));
    }
  }, [envData?.NEXT_PUBLIC_APP_URL]);

  const handleSaveAppUrl = async () => {
    setIsSavingAppUrl(true);
    let res: { success: boolean; error?: string } = { success: false };

    try {
      res = await saveExternalConfig({
        appUrl: appUrlValue,
        gaId: "",
        geminiKey: "",
        maptilerKey: "",
        oenToken: "",
        oenMerchant: "",
      });
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
      setIsSavingAppUrl(false);
    } else {
      setErrorMessage(res.error || t("admin_setup.step7.err_save"));
      setIsSavingAppUrl(false);
    }
  };

  const fetchAdminList = useCallback(async () => {
    const listRes = await getAdminList();
    if (listRes.success && listRes.data) {
      setAdminList(listRes.data);
    }
  }, []);

  const executeCheck = useCallback(async () => {
    if (status !== StepStatus.IDLE || adminExists !== null) return;
    setStatus(StepStatus.LOADING);
    try {
      const res = await checkSuperAdminExists();

      if (!res.exists) {
        setAdminExists(false);
        setAdminNeedsAuth(false);
        setStatus(StepStatus.IDLE);
      } else {
        setAdminExists(true);
        if (res.address) setAdminAddress(res.address);
        if (res.needsAuth) {
          setAdminNeedsAuth(true);
          setStatus(StepStatus.IDLE);
        } else {
          setStatus(StepStatus.SUCCESS);
          setTimeout(onNext, 800);
        }
      }
    } catch (err: unknown) {
      setStatus(StepStatus.ERROR);
      setErrorMessage(err instanceof Error ? err.message : String(err));
    }
  }, [status, adminExists, onNext]);

  useEffect(() => {
    if ((isActive || isCompleted) && adminList.length === 0) {
      fetchAdminList();
    }
    if (isActive && status === StepStatus.IDLE && adminExists === null) {
      executeCheck();
    }
  }, [
    isActive,
    isCompleted,
    status,
    adminExists,
    adminList.length,
    executeCheck,
    fetchAdminList,
  ]);

  const handleTaskStatusPolling = async () => {
    // Info: (20260413 - Luphia) Sync background task progress to UI
    setTaskProgress(t("admin_setup.step6.task_init"));
    return new Promise<void>((resolve, reject) => {
      const iv = setInterval(async () => {
        try {
          const task = await getSuperAdminTaskStatus();
          if (task) {
            if (task.progress) setTaskProgress(task.progress);
            if (task.done) {
              clearInterval(iv);
              if (task.error) reject(new Error(task.error));
              else {
                setTaskProgress("");
                resolve();
              }
            }
          }
        } catch (e) {
          clearInterval(iv);
          reject(e);
        }
      }, 1500);
    });
  };

  const performFido2Login = async () => {
    setStatus(StepStatus.LOADING);
    try {
      setTaskProgress(t("admin_setup.step6.task_auth_challenge"));
      const loginOpts = await getLoginOptions();
      const challengeStr = loginOpts.challenge;

      setTaskProgress(t("admin_setup.step6.task_wait_bio"));
      const allowCredentials = undefined;
      const authentication = await fido2ClientService.startLogin({
        challenge: challengeStr,
        allowCredentials,
        userVerification: "preferred",
      });

      setTaskProgress(t("admin_setup.step6.task_auth_record"));
      const restoreRes = await authorizeSuperAdmin(authentication);
      if (restoreRes.success) {
        if (restoreRes.pendingTask) {
          await handleTaskStatusPolling();
        }
        await fetchAdminList();
        setAdminNeedsAuth(false);
        setStatus(StepStatus.SUCCESS);
        setTimeout(onNext, 800);
      } else {
        throw new Error(
          restoreRes.error || t("admin_setup.step6.err_auth_record"),
        );
      }
    } catch (err) {
      setStatus(StepStatus.IDLE); // Info: (20260413 - Luphia) Allow retry
      setErrorMessage(
        `${t("admin_setup.step6.err_auth_record")} ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  };

  const performFido2Registration = async (customName?: string) => {
    const finalName = customName?.trim() || "iSunFA Super Admin";
    setIsReplaceModalOpen(false);
    setStatus(StepStatus.LOADING);
    try {
      setTaskProgress(t("admin_setup.step6.task_req_fido2"));
      const challenge = await getRegisterChallenge();

      setTaskProgress(t("admin_setup.step6.task_wait_bio"));
      const registration = await fido2ClientService.startRegistration({
        challenge,
        user: finalName,
        userVerification: "required",
        discoverable: "preferred",
        // @ts-expect-error Passwordless-ID fallback options
        authenticatorType: "auto",
      });

      setTaskProgress(t("admin_setup.step6.task_process_cred"));
      const { x, y, credentialID } = await parsePasskey(
        registration,
        challenge,
      );

      setTaskProgress(t("admin_setup.step6.task_write_config"));
      const res = await createSuperAdminRecord(credentialID, x, y, finalName);
      if (res.success) {
        if (res.pendingTask) {
          await handleTaskStatusPolling();
        }
        await fetchAdminList();
        if (adminExists) {
          setStatus(StepStatus.IDLE);
          setAdminExists(null);
        } else {
          setStatus(StepStatus.SUCCESS);
          setAdminExists(true);
          setAdminNeedsAuth(false);
          setTimeout(onNext, 800);
        }
      } else {
        setStatus(StepStatus.IDLE);
        setErrorMessage(
          `${t("admin_setup.step6.err_create_super")} ${res.error}`,
        );
      }
    } catch (err) {
      setStatus(StepStatus.IDLE);
      setErrorMessage(
        `${t("admin_setup.step6.err_fido2_reg")} ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  };

  const performRegisterSecondaryAdmin = async () => {
    if (!newAdminName.trim()) return;
    setIsAddAdminModalOpen(false);
    setStatus(StepStatus.LOADING);
    try {
      setTaskProgress(t("admin_setup.step6.task_req_fido2"));
      const challenge = await getRegisterChallenge();

      setTaskProgress(t("admin_setup.step6.task_wait_bio"));
      const registration = await fido2ClientService.startRegistration({
        challenge,
        user: newAdminName.trim(),
        userVerification: "required",
        discoverable: "preferred",
        // @ts-expect-error Passwordless-ID fallback options
        authenticatorType: "auto",
      });

      setTaskProgress(t("admin_setup.step6.task_process_cred"));
      const { x, y, credentialID } = await parsePasskey(
        registration,
        challenge,
      );

      setTaskProgress(t("admin_setup.step6.task_write_secondary"));
      const res = await createAdminRecord(
        credentialID,
        x,
        y,
        newAdminName.trim(),
      );

      if (res.success) {
        setNewAdminName("");
        setStatus(StepStatus.IDLE);
        setAdminExists(null);
      } else {
        setStatus(StepStatus.IDLE);
        setErrorMessage(
          `${t("admin_setup.step6.err_create_admin")} ${res.error}`,
        );
      }
    } catch (err) {
      setStatus(StepStatus.IDLE);
      setErrorMessage(
        `${t("admin_setup.step6.err_reg")} ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  };

  const confirmDeleteAdmin = (address: string, name: string | null) => {
    setTargetDeleteAdmin({
      address,
      name: name || t("admin_setup.step6.unknown_admin"),
    });
    setIsDeleteModalOpen(true);
  };

  const executeDeleteAdmin = async () => {
    if (!targetDeleteAdmin) return;
    setIsDeleteModalOpen(false);
    setStatus(StepStatus.LOADING);
    setTaskProgress(t("admin_setup.step6.task_revoke"));
    try {
      const res = await deleteAdminRecord(targetDeleteAdmin.address);
      if (res.success) {
        setStatus(StepStatus.IDLE);
        setTargetDeleteAdmin(null);
        await fetchAdminList();
      } else {
        setStatus(StepStatus.IDLE);
        setErrorMessage(`${t("admin_setup.step6.err_del_admin")} ${res.error}`);
      }
    } catch (err) {
      setStatus(StepStatus.IDLE);
      setErrorMessage(
        `${t("admin_setup.step6.err_del")} ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  };

  const displayStatus = isCompleted ? StepStatus.SUCCESS : status;

  const superAdmin = adminList.find((a) => a.role === "SUPER_ADMIN");
  const secondaryAdmins = adminList.filter((a) => a.role === "ADMIN");

  return (
    <StepCard
      step={6}
      title={t("admin_setup.step6.title")}
      description={t("admin_setup.step6.desc")}
      isActive={isActive}
      status={displayStatus}
      errorMessage={errorMessage}
      onReset={onReset}
      actionContent={
        isActive && status !== StepStatus.LOADING && adminExists === false ? (
          <>
            <button
              onClick={() => performFido2Registration()}
              className="rounded-md bg-orange-600 px-4 py-1.5 text-sm text-white transition hover:bg-orange-700"
            >
              {t("admin_setup.step6.register_new_key")}
            </button>
            <button
              onClick={performFido2Login}
              className="rounded-md border border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              {t("admin_setup.step6.use_existing_key")}
            </button>
          </>
        ) : isActive &&
          status !== StepStatus.LOADING &&
          adminExists === true &&
          adminNeedsAuth === true ? (
          <>
            <button
              onClick={performFido2Login}
              className="min-w-[140px] rounded-md bg-orange-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-orange-700"
            >
              {t("admin_setup.step6.use_existing_key")}
            </button>
            <button
              onClick={() => performFido2Registration()}
              className="rounded-md border border-orange-200 bg-white px-5 py-2 text-sm font-medium text-orange-700 transition hover:bg-orange-50"
            >
              {t("admin_setup.step6.register_new_key")}
            </button>
          </>
        ) : null
      }
    >
      {isActive && status === StepStatus.LOADING && taskProgress && (
        <div className="mt-4 flex items-center gap-3 rounded border border-orange-100 bg-orange-50 p-3 text-sm text-orange-700">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-orange-500 border-t-transparent"></div>
          {taskProgress}
        </div>
      )}

      {isActive &&
        status !== StepStatus.LOADING &&
        adminExists === true &&
        adminNeedsAuth === true && (
          <div className="mt-3 mr-2 rounded-lg border border-orange-100 bg-orange-50 p-5">
            <p className="mb-3 text-sm font-medium text-orange-800">
              {t("admin_setup.step6.super_admin_found")}
            </p>
            <p className="text-xs text-orange-600">
              {t("admin_setup.step6.super_admin_found_desc")}
            </p>
          </div>
        )}

      {isActive && (
        <div className="mt-5 mb-5 rounded-lg border border-slate-200 bg-white p-5">
          <h3 className="mb-3 text-sm font-bold tracking-wide text-gray-800">
            {t("admin_setup.step7.domain_label")}
          </h3>
          <p className="mb-4 text-xs text-gray-500">
            {t("admin_setup.step7.domain_hint")}
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              aria-label="Application URL"
              value={appUrlValue}
              onChange={(e) => setAppUrlValue(e.target.value)}
              className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-gray-800"
              placeholder="https://isunfa.tw"
              disabled={isSavingAppUrl}
            />
            <button
              onClick={handleSaveAppUrl}
              disabled={isSavingAppUrl}
              className="rounded-md bg-slate-800 px-4 py-2 text-xs font-bold text-white hover:bg-slate-700 disabled:bg-slate-400"
            >
              {isSavingAppUrl ? "Saving..." : t("admin_setup.step7.save_btn")}
            </button>
          </div>
        </div>
      )}

      {(isCompleted ||
        (isActive && adminExists === true && adminNeedsAuth === false)) && (
        <div className="mt-3">
          <p className="mb-4 text-sm font-medium whitespace-pre-line text-green-600">
            {t("admin_setup.step6.super_admin_secured")}
          </p>

          <div className="mb-5 overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-100 bg-orange-50/50 px-4 py-3">
              <h3 className="mb-3 text-xs font-bold tracking-wider text-orange-800 uppercase">
                {t("admin_setup.step6.master_identity")}
              </h3>
              {superAdmin ? (
                <div className="flex flex-col justify-between gap-3 rounded border border-orange-100 bg-white p-3 sm:flex-row sm:items-center">
                  <div className="flex flex-col">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-800">
                        {superAdmin.name ||
                          t("admin_setup.step6.unknown_admin")}
                      </span>
                      <span className="rounded bg-orange-100 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-orange-700 uppercase">
                        SUPER_ADMIN
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[11px] text-gray-500">
                        {superAdmin.address}
                      </span>
                      <a
                        href={`https://baifa.io/chain/isuncoin/address/${superAdmin.address}`}
                        target="_blank"
                        rel="noreferrer"
                        className="transform text-orange-600 transition hover:scale-110 hover:text-orange-700"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <div className="mt-1 text-[10px] font-medium text-gray-400">
                      {t("admin_setup.step6.registered")}
                      {new Date(superAdmin.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ) : adminExists ? (
                <div className="flex flex-col justify-between gap-3 rounded border border-orange-100 bg-white p-3 sm:flex-row sm:items-center">
                  <div className="flex flex-col">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-800">
                        {t("admin_setup.step6.pending_sync")}
                      </span>
                      <span className="rounded bg-orange-100 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-orange-700 uppercase">
                        SUPER_ADMIN
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[11px] text-gray-500">
                        {adminAddress ||
                          t("admin_setup.step6.unavailable_sync")}
                      </span>
                      {adminAddress && (
                        <a
                          href={`https://baifa.io/chain/isuncoin/address/${adminAddress}`}
                          target="_blank"
                          rel="noreferrer"
                          className="transform text-orange-600 transition hover:scale-110 hover:text-orange-700"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    <div className="mt-2 flex flex-col items-start gap-2">
                      <span className="text-[11px] text-gray-500">
                        {t("admin_setup.step6.identity_est")}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 text-sm text-gray-500">
                  {t("admin_setup.step6.loading_identity")}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
              <h3 className="text-xs font-bold tracking-wider text-gray-700 uppercase">
                {t("admin_setup.step6.secondary_admins")}
              </h3>
              <button
                onClick={() => {
                  setNewAdminName("");
                  setIsAddAdminModalOpen(true);
                }}
                className="rounded border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-gray-700 uppercase transition hover:bg-slate-50"
              >
                + {t("admin_setup.step6.add_admin")}
              </button>
            </div>
            <ul className="custom-scrollbar max-h-[300px] divide-y divide-slate-100 overflow-y-auto">
              {secondaryAdmins.map((adm, i) => (
                <li
                  key={i}
                  className="flex flex-col justify-between gap-3 px-4 py-3 transition-colors hover:bg-slate-50 sm:flex-row sm:items-center"
                >
                  <div className="flex flex-col">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-800">
                        {adm.name || t("admin_setup.step6.unknown_admin")}
                      </span>
                      <span className="rounded border border-orange-200 bg-orange-100 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-orange-700 uppercase">
                        {adm.role}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[11px] text-gray-500">
                        {adm.address}
                      </span>
                      <a
                        href={`https://baifa.io/chain/isuncoin/address/${adm.address}`}
                        target="_blank"
                        rel="noreferrer"
                        className="transform text-orange-600 transition hover:scale-110 hover:text-orange-700"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-[10px] font-medium text-gray-400">
                      {new Date(adm.createdAt).toLocaleDateString()}
                    </div>
                    <button
                      onClick={() => confirmDeleteAdmin(adm.address, adm.name)}
                      className="p-1 text-gray-400 transition hover:text-red-500"
                      title={t("admin_setup.step6.delete_admin")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
              {secondaryAdmins.length === 0 && (
                <li className="px-4 py-5 text-center text-sm text-gray-400">
                  {t("admin_setup.step6.no_secondary")}
                </li>
              )}
            </ul>
          </div>

          <div className="mt-4 flex flex-col items-center justify-end gap-3 border-t border-slate-200 pt-4 sm:flex-row">
            <button
              onClick={performFido2Login}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 uppercase transition hover:bg-slate-50 sm:w-auto"
            >
              {t("admin_setup.step6.replace_with_existing_key")}
            </button>
            <button
              onClick={() => {
                setNewSuperAdminName(superAdmin?.name || "ISUNFA SUPER ADMIN");
                setIsReplaceModalOpen(true);
              }}
              className="w-full rounded-lg border border-orange-200 bg-orange-100 px-4 py-2 text-xs font-bold text-orange-700 uppercase shadow-sm transition hover:bg-orange-200 sm:w-auto"
            >
              {t("admin_setup.step6.replace_with_new_key")}
            </button>
          </div>
        </div>
      )}

      {isAddAdminModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="m-4 w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="text-md mb-2 font-bold text-gray-800">
              {t("admin_setup.step6.register_btn")}
            </h3>
            <p className="mb-5 text-xs text-gray-500">
              {t("admin_setup.step6.modal_add_desc")}
            </p>
            <input
              type="text"
              className="mb-5 w-full rounded border border-slate-300 px-3 py-2 text-sm text-gray-800 transition outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-500"
              placeholder={t("admin_setup.step6.placeholder_admin")}
              value={newAdminName}
              onChange={(e) => setNewAdminName(e.target.value)}
              aria-label="New Admin Name"
              onKeyDown={(e) =>
                e.key === "Enter" &&
                newAdminName.trim() &&
                performRegisterSecondaryAdmin()
              }
            />
            <div className="flex justify-end gap-2 text-sm">
              <button
                onClick={() => setIsAddAdminModalOpen(false)}
                className="rounded-md bg-gray-100 px-4 py-2 font-medium text-gray-600 transition hover:bg-gray-200"
              >
                {t("admin_setup.step6.cancel_btn")}
              </button>
              <button
                onClick={performRegisterSecondaryAdmin}
                disabled={!newAdminName.trim()}
                className="rounded-md bg-orange-600 px-4 py-2 font-medium text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-orange-300"
              >
                {t("admin_setup.step6.continue_fido2_btn")}
              </button>
            </div>
          </div>
        </div>
      )}

      {isReplaceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="m-4 w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="text-md mb-2 font-bold text-gray-800">
              {t("admin_setup.step6.replace_super_btn")}
            </h3>
            <p className="mb-3 text-xs font-medium text-orange-600">
              {t("admin_setup.step6.modal_replace_warn")}
            </p>
            <p className="mb-5 text-xs text-gray-500">
              {t("admin_setup.step6.modal_replace_desc")}
            </p>
            <input
              type="text"
              className="mb-5 w-full rounded border border-slate-300 px-3 py-2 text-sm text-gray-800 transition outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500"
              placeholder={t("admin_setup.step6.placeholder_super")}
              value={newSuperAdminName}
              onChange={(e) => setNewSuperAdminName(e.target.value)}
              aria-label="New Super Admin Name"
              onKeyDown={(e) =>
                e.key === "Enter" &&
                newSuperAdminName.trim() &&
                performFido2Registration(newSuperAdminName.trim())
              }
            />
            <div className="flex justify-end gap-2 text-sm">
              <button
                onClick={() => setIsReplaceModalOpen(false)}
                className="rounded-md bg-gray-100 px-4 py-2 font-medium text-gray-600 transition hover:bg-gray-200"
              >
                {t("admin_setup.step6.cancel_btn")}
              </button>
              <button
                onClick={() =>
                  performFido2Registration(newSuperAdminName.trim())
                }
                disabled={!newSuperAdminName.trim()}
                className="rounded-md bg-orange-600 px-4 py-2 font-medium text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-orange-300"
              >
                {t("admin_setup.step6.register_btn")}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title={t("admin_setup.step6.modal_del_title")}
        message={t("admin_setup.step6.modal_del_msg").replace(
          "{{name}}",
          targetDeleteAdmin?.name || "",
        )}
        confirmText={t("admin_setup.step6.confirm_del_btn")}
        cancelText={t("admin_setup.step6.cancel_btn")}
        onConfirm={executeDeleteAdmin}
      />
    </StepCard>
  );
}
