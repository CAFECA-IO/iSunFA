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
  getSuperAdminTaskStatus
} from "@/app/admin/setup/_api/identity.api";
import {
  fido2ClientService,
  getRegisterChallenge,
  getLoginOptions,
  parsePasskey,
} from "@/lib/auth/fido2_client";

export function SetupSuperAdmin({ isActive, isCompleted, onNext, onReset }: IStepProps) {
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
  const [adminList, setAdminList] = useState<{ address: string; name: string | null; role: string; createdAt: string | Date }[]>([]);
  const [taskProgress, setTaskProgress] = useState<string>("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [targetDeleteAdmin, setTargetDeleteAdmin] = useState<{address: string, name: string} | null>(null);

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
  }, [isActive, isCompleted, status, adminExists, adminList.length, executeCheck, fetchAdminList]);

  const handleTaskStatusPolling = async () => {
    // Info: (20260413 - Luphia) Sync background task progress to UI
    setTaskProgress(t('admin_setup.step6.task_init'));
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
      setTaskProgress(t('admin_setup.step6.task_auth_challenge'));
      const loginOpts = await getLoginOptions();
      const challengeStr = loginOpts.challenge;

      setTaskProgress(t('admin_setup.step6.task_wait_bio'));
      const allowCredentials = undefined;
      const authentication = await fido2ClientService.startLogin({
        challenge: challengeStr,
        allowCredentials,
        userVerification: "preferred"
      });

      setTaskProgress(t('admin_setup.step6.task_auth_record'));
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
        throw new Error(restoreRes.error || t('admin_setup.step6.err_auth_record'));
      }
    } catch (err) {
      setStatus(StepStatus.IDLE); // Info: (20260413 - Luphia) Allow retry
      setErrorMessage(`${t('admin_setup.step6.err_auth_record')} ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const performFido2Registration = async (customName?: string) => {
    const finalName = customName?.trim() || t('admin_setup.step6.placeholder_super');
    if (!finalName) return;
    setIsReplaceModalOpen(false);
    setStatus(StepStatus.LOADING);
    try {
      setTaskProgress(t('admin_setup.step6.task_req_fido2'));
      const challenge = await getRegisterChallenge();

      setTaskProgress(t('admin_setup.step6.task_wait_bio'));
      const registration = await fido2ClientService.startRegistration({
        challenge,
        user: finalName,
        userVerification: "required",
        discoverable: "preferred",
        // @ts-expect-error Passwordless-ID fallback options
        authenticatorType: "auto"
      });

      setTaskProgress(t('admin_setup.step6.task_process_cred'));
      const { x, y, credentialID } = await parsePasskey(registration, challenge);

      setTaskProgress(t('admin_setup.step6.task_write_config'));
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
        setErrorMessage(`${t('admin_setup.step6.err_create_super')} ${res.error}`);
      }
    } catch (err) {
      setStatus(StepStatus.IDLE);
      setErrorMessage(`${t('admin_setup.step6.err_fido2_reg')} ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const performRegisterSecondaryAdmin = async () => {
    if (!newAdminName.trim()) return;
    setIsAddAdminModalOpen(false);
    setStatus(StepStatus.LOADING);
    try {
      setTaskProgress(t('admin_setup.step6.task_req_fido2'));
      const challenge = await getRegisterChallenge();

      setTaskProgress(t('admin_setup.step6.task_wait_bio'));
      const registration = await fido2ClientService.startRegistration({
        challenge,
        user: newAdminName.trim(),
        userVerification: "required",
        discoverable: "preferred",
        // @ts-expect-error Passwordless-ID fallback options
        authenticatorType: "auto"
      });

      setTaskProgress(t('admin_setup.step6.task_process_cred'));
      const { x, y, credentialID } = await parsePasskey(registration, challenge);

      setTaskProgress(t('admin_setup.step6.task_write_secondary'));
      const res = await createAdminRecord(credentialID, x, y, newAdminName.trim());

      if (res.success) {
        setNewAdminName("");
        setStatus(StepStatus.IDLE);
        setAdminExists(null);
      } else {
        setStatus(StepStatus.IDLE);
        setErrorMessage(`${t('admin_setup.step6.err_create_admin')} ${res.error}`);
      }
    } catch (err) {
      setStatus(StepStatus.IDLE);
      setErrorMessage(`${t('admin_setup.step6.err_reg')} ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const confirmDeleteAdmin = (address: string, name: string | null) => {
    setTargetDeleteAdmin({ address, name: name || t('admin_setup.step6.unknown_admin') });
    setIsDeleteModalOpen(true);
  };

  const executeDeleteAdmin = async () => {
    if (!targetDeleteAdmin) return;
    setIsDeleteModalOpen(false);
    setStatus(StepStatus.LOADING);
    setTaskProgress(t('admin_setup.step6.task_revoke'));
    try {
      const res = await deleteAdminRecord(targetDeleteAdmin.address);
      if (res.success) {
        setStatus(StepStatus.IDLE);
        setTargetDeleteAdmin(null);
        await fetchAdminList();
      } else {
        setStatus(StepStatus.IDLE);
        setErrorMessage(`${t('admin_setup.step6.err_del_admin')} ${res.error}`);
      }
    } catch (err) {
      setStatus(StepStatus.IDLE);
      setErrorMessage(`${t('admin_setup.step6.err_del')} ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const displayStatus = isCompleted ? StepStatus.SUCCESS : status;

  const superAdmin = adminList.find(a => a.role === 'SUPER_ADMIN');
  const secondaryAdmins = adminList.filter(a => a.role === 'ADMIN');

  return (
    <StepCard
      step={6}
      title={t('admin_setup.step6.title')}
      description={t('admin_setup.step6.desc')}
      isActive={isActive}
      status={displayStatus}
      errorMessage={errorMessage}
      onReset={onReset}
      actionContent={
        isActive && status !== StepStatus.LOADING && adminExists === false ? (
          <>
            <button onClick={() => performFido2Registration()} className="text-sm px-4 py-1.5 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition">
              {t('admin_setup.step6.register_new_key')}
            </button>
            <button onClick={performFido2Login} className="text-sm px-4 py-1.5 bg-white border border-slate-300 text-slate-700 font-medium rounded-md hover:bg-slate-50 transition">
              {t('admin_setup.step6.use_existing_key')}
            </button>
          </>
        ) : isActive && status !== StepStatus.LOADING && adminExists === true && adminNeedsAuth === true ? (
          <>
            <button onClick={performFido2Login} className="text-sm px-5 py-2 min-w-[140px] bg-orange-600 font-medium text-white rounded-md hover:bg-orange-700 transition">
              {t('admin_setup.step6.use_existing_key')}
            </button>
            <button onClick={() => performFido2Registration()} className="text-sm px-5 py-2 bg-white border border-orange-200 text-orange-700 font-medium rounded-md hover:bg-orange-50 transition">
              {t('admin_setup.step6.register_new_key')}
            </button>
          </>
        ) : null
      }
    >


      {isActive && status === StepStatus.LOADING && taskProgress && (
        <div className="mt-4 p-3 bg-orange-50 border border-orange-100 rounded text-orange-700 text-sm flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          {taskProgress}
        </div>
      )}

      {isActive && status !== StepStatus.LOADING && adminExists === true && adminNeedsAuth === true && (
        <div className="mt-3 bg-orange-50 border border-orange-100 p-5 rounded-lg mr-2">
          <p className="text-sm text-orange-800 font-medium mb-3">
            {t('admin_setup.step6.super_admin_found')}
          </p>
          <p className="text-xs text-orange-600">
            {t('admin_setup.step6.super_admin_found_desc')}
          </p>
        </div>
      )}

      {(isCompleted || (isActive && adminExists === true && adminNeedsAuth === false)) && (
        <div className="mt-3">
          <p className="text-sm text-green-600 font-medium mb-4 whitespace-pre-line">
            {t('admin_setup.step6.super_admin_secured')}
          </p>

          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden mb-5">
            <div className="px-4 py-3 border-b border-slate-100 bg-orange-50/50">
              <h3 className="text-xs font-bold text-orange-800 uppercase tracking-wider mb-3">{t('admin_setup.step6.master_identity')}</h3>
              {superAdmin ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 border border-orange-100 rounded ">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-800 text-sm">{superAdmin.name || t('admin_setup.step6.unknown_admin')}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider bg-orange-100 text-orange-700">SUPER_ADMIN</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-gray-500 bg-gray-100 px-1 py-0.5 rounded">{superAdmin.address}</span>
                      <a href={`https://baifa.io/chain/isuncoin/address/${superAdmin.address}`} target="_blank" rel="noreferrer" className="text-orange-600 hover:text-orange-700 transition transform hover:scale-110">
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="text-[10px] text-gray-400 font-medium mt-1">
                      {t('admin_setup.step6.registered')}{new Date(superAdmin.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ) : adminExists ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 border border-orange-100 rounded ">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-800 text-sm">{t('admin_setup.step6.pending_sync')}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider bg-orange-100 text-orange-700">SUPER_ADMIN</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-gray-500 bg-gray-100 px-1 py-0.5 rounded">{adminAddress || t('admin_setup.step6.unavailable_sync')}</span>
                      {adminAddress && (
                        <a href={`https://baifa.io/chain/isuncoin/address/${adminAddress}`} target="_blank" rel="noreferrer" className="text-orange-600 hover:text-orange-700 transition transform hover:scale-110">
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 items-start mt-2">
                      <span className="text-[11px] text-gray-500">{t('admin_setup.step6.identity_est')}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 text-sm text-gray-500">{t('admin_setup.step6.loading_identity')}</div>
              )}
            </div>

            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">{t('admin_setup.step6.secondary_admins')}</h3>
              <button onClick={() => { setNewAdminName(""); setIsAddAdminModalOpen(true); }} className="text-[10px] bg-white border border-slate-200 text-gray-700 px-2 py-1 rounded hover:bg-slate-50 font-bold uppercase transition ">
                + {t('admin_setup.step6.add_admin')}
              </button>
            </div>
            <ul className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto custom-scrollbar">
              {secondaryAdmins.map((adm, i) => (
                <li key={i} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-800 text-sm">{adm.name || t('admin_setup.step6.unknown_admin')}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider bg-orange-100 text-orange-700 border border-orange-200">
                        {adm.role}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-gray-500 bg-gray-100 px-1 py-0.5 rounded">{adm.address}</span>
                      <a href={`https://baifa.io/chain/isuncoin/address/${adm.address}`} target="_blank" rel="noreferrer" className="text-orange-600 hover:text-orange-700 transition transform hover:scale-110">
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-[10px] text-gray-400 font-medium">
                      {new Date(adm.createdAt).toLocaleDateString()}
                    </div>
                    <button onClick={() => confirmDeleteAdmin(adm.address, adm.name)} className="text-gray-400 hover:text-red-500 transition p-1" title={t('admin_setup.step6.delete_admin')}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}
              {secondaryAdmins.length === 0 && <li className="px-4 py-5 text-sm text-gray-400 text-center">{t('admin_setup.step6.no_secondary')}</li>}
            </ul>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-200 flex flex-col sm:flex-row justify-end items-center gap-3">
            <button onClick={performFido2Login} className="w-full sm:w-auto text-xs bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 font-bold uppercase transition">
              {t('admin_setup.step6.replace_with_existing_key')}
            </button>
            <button onClick={() => { setNewSuperAdminName(superAdmin?.name || "ISUNFA SUPER ADMIN"); setIsReplaceModalOpen(true); }} className="w-full sm:w-auto text-xs bg-orange-100 text-orange-700 border border-orange-200 px-4 py-2 rounded-lg hover:bg-orange-200 font-bold uppercase transition shadow-sm">
              {t('admin_setup.step6.replace_with_new_key')}
            </button>
          </div>
        </div>
      )}

      {isAddAdminModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-sm p-6 border border-slate-200 m-4">
            <h3 className="text-md font-bold text-gray-800 mb-2">{t('admin_setup.step6.register_btn')}</h3>
            <p className="text-xs text-gray-500 mb-5">{t('admin_setup.step6.modal_add_desc')}</p>
            <input
              type="text"
              className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-gray-800 mb-5 focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none transition"
              placeholder={t('admin_setup.step6.placeholder_admin')}
              value={newAdminName}
              onChange={(e) => setNewAdminName(e.target.value)}
              aria-label="New Admin Name"
              onKeyDown={(e) => e.key === 'Enter' && newAdminName.trim() && performRegisterSecondaryAdmin()}
            />
            <div className="flex justify-end gap-2 text-sm">
              <button
                onClick={() => setIsAddAdminModalOpen(false)}
                className="px-4 py-2 font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition"
              >
                {t('admin_setup.step6.cancel_btn')}
              </button>
              <button
                onClick={performRegisterSecondaryAdmin}
                disabled={!newAdminName.trim()}
                className="px-4 py-2 font-medium text-white bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 disabled:cursor-not-allowed rounded-md transition "
              >
                {t('admin_setup.step6.continue_fido2_btn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {isReplaceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-sm p-6 border border-slate-200 m-4">
            <h3 className="text-md font-bold text-gray-800 mb-2">{t('admin_setup.step6.replace_super_btn')}</h3>
            <p className="text-xs text-orange-600 font-medium mb-3">{t('admin_setup.step6.modal_replace_warn')}</p>
            <p className="text-xs text-gray-500 mb-5">{t('admin_setup.step6.modal_replace_desc')}</p>
            <input
              type="text"
              className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-gray-800 mb-5 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition"
              placeholder={t('admin_setup.step6.placeholder_super')}
              value={newSuperAdminName}
              onChange={(e) => setNewSuperAdminName(e.target.value)}
              aria-label="New Super Admin Name"
              onKeyDown={(e) => e.key === 'Enter' && newSuperAdminName.trim() && performFido2Registration(newSuperAdminName.trim())}
            />
            <div className="flex justify-end gap-2 text-sm">
              <button
                onClick={() => setIsReplaceModalOpen(false)}
                className="px-4 py-2 font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition"
              >
                {t('admin_setup.step6.cancel_btn')}
              </button>
              <button
                onClick={() => performFido2Registration(newSuperAdminName.trim())}
                disabled={!newSuperAdminName.trim()}
                className="px-4 py-2 font-medium text-white bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 disabled:cursor-not-allowed rounded-md transition "
              >
                {t('admin_setup.step6.register_btn')}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title={t('admin_setup.step6.modal_del_title')}
        message={t('admin_setup.step6.modal_del_msg').replace('{{name}}', targetDeleteAdmin?.name || '')}
        confirmText={t('admin_setup.step6.confirm_del_btn')}
        cancelText={t('admin_setup.step6.cancel_btn')}
        onConfirm={executeDeleteAdmin}
      />
    </StepCard>
  );
}
