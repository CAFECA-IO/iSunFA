import { useEffect, useState, useCallback } from "react";
import { ExternalLink } from "lucide-react";
import { StepCard } from "@/components/admin/setup/step_card";
import { IStepProps, StepStatus } from "@/components/admin/setup/setup_types";
import {
  checkSuperAdminExists,
  createSuperAdminRecord,
  authorizeSuperAdmin,
  getAdminList,
  createAdminRecord,
  getSuperAdminTaskStatus
} from "@/app/admin/setup/_api/identity.api";
import { getEnvHashChallenge } from "@/app/admin/setup/_api/config.api";
import {
  fido2ClientService,
  getRegisterChallenge,
  parsePasskey,
} from "@/lib/auth/fido2_client";

export function Step7SuperAdmin({ isActive, isCompleted, onNext }: IStepProps) {
  const [status, setStatus] = useState<StepStatus>(StepStatus.IDLE);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isAddAdminModalOpen, setIsAddAdminModalOpen] = useState(false);
  const [newAdminName, setNewAdminName] = useState("");
  const [isReplaceModalOpen, setIsReplaceModalOpen] = useState(false);
  const [newSuperAdminName, setNewSuperAdminName] = useState("");
  const [adminExists, setAdminExists] = useState<boolean | null>(null);
  const [adminNeedsAuth, setAdminNeedsAuth] = useState<boolean>(false);
  const [adminList, setAdminList] = useState<{ address: string; name: string | null; role: string; createdAt: string | Date }[]>([]);
  const [taskProgress, setTaskProgress] = useState<string>("");

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
    setTaskProgress("Initializing background task...");
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
      }, 10000);
    });
  };

  const performFido2Login = async () => {
    setStatus(StepStatus.LOADING);
    try {
      const challengeStr = await getEnvHashChallenge();
      if (!challengeStr.success || !challengeStr.challenge) {
        throw new Error(challengeStr.error || "Failed to generate login challenge.")
      }

      const superAdminInfo = await checkSuperAdminExists();
      const allowCredentials = superAdminInfo.credId ? [{ id: superAdminInfo.credId, type: "public-key" as const, transports: [] as AuthenticatorTransport[] }] : undefined;

      await fido2ClientService.startLogin({
        challenge: challengeStr.challenge,
        allowCredentials,
        userVerification: "preferred"
      });

      const restoreRes = await authorizeSuperAdmin();
      if (restoreRes.success) {
        if (restoreRes.pendingTask) {
          await handleTaskStatusPolling();
        }
        await fetchAdminList();
        setAdminNeedsAuth(false);
        setStatus(StepStatus.SUCCESS);
        setTimeout(onNext, 800);
      } else {
        throw new Error(restoreRes.error || "Failed to authorize configuration record.");
      }
    } catch (err) {
      setStatus(StepStatus.IDLE); // Info: (20260413 - Luphia) Allow retry
      setErrorMessage(`FIDO2 Authorization failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const performFido2Registration = async (customName: string = "ISUNFA SUPER ADMIN") => {
    if (!customName.trim()) return;
    setIsReplaceModalOpen(false);
    setStatus(StepStatus.LOADING);
    try {
      const challenge = await getRegisterChallenge();
      const registration = await fido2ClientService.startRegistration({
        challenge,
        user: customName,
        userVerification: "required",
        discoverable: "preferred",
        // @ts-expect-error Passwordless-ID fallback options
        authenticatorType: "auto"
      });

      const { x, y, credentialID } = await parsePasskey(registration, challenge);

      const res = await createSuperAdminRecord(credentialID, x, y, customName);
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
        setErrorMessage(`Failed to create SUPER_ADMIN: ${res.error}`);
      }
    } catch (err) {
      setStatus(StepStatus.IDLE);
      setErrorMessage(`FIDO2 Registration Failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const performRegisterSecondaryAdmin = async () => {
    if (!newAdminName.trim()) return;
    setIsAddAdminModalOpen(false);
    setStatus(StepStatus.LOADING);
    try {
      const challenge = await getRegisterChallenge();
      const registration = await fido2ClientService.startRegistration({
        challenge,
        user: newAdminName.trim(),
        userVerification: "required",
        discoverable: "preferred",
        // @ts-expect-error Passwordless-ID fallback options
        authenticatorType: "auto"
      });

      const { x, y, credentialID } = await parsePasskey(registration, challenge);

      const res = await createAdminRecord(credentialID, x, y, newAdminName.trim());

      if (res.success) {
        setNewAdminName("");
        setStatus(StepStatus.IDLE);
        setAdminExists(null);
      } else {
        setStatus(StepStatus.IDLE);
        setErrorMessage(`Failed to add general admin: ${res.error}`);
      }
    } catch (err) {
      setStatus(StepStatus.IDLE);
      setErrorMessage(`Registration Failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const displayStatus = isCompleted ? StepStatus.SUCCESS : status;

  const superAdmin = adminList.find(a => a.role === 'SUPER_ADMIN');
  const secondaryAdmins = adminList.filter(a => a.role === 'ADMIN');

  return (
    <StepCard
      step={6}
      title="Step 6: Register Server SUPER ADMIN"
      description="Attach a secure FIDO2 Passkey to establish the initial SUPER ADMIN wallet."
      isActive={isActive}
      status={displayStatus}
      errorMessage={errorMessage}
    >
      {isActive && status !== StepStatus.LOADING && adminExists === false && (
        <div className="mt-3">
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={() => performFido2Registration()} className="text-sm px-4 py-1.5 bg-orange-600 text-white shadow-sm rounded-md hover:bg-orange-700 transition mr-1">
              Register New Key
            </button>
            <button onClick={performFido2Login} className="text-sm px-4 py-1.5 bg-white border border-slate-300 text-slate-700 font-medium rounded-md hover:bg-slate-50 transition shadow-sm">
              Use Existing Key
            </button>
          </div>
        </div>
      )}

      {isActive && status === StepStatus.LOADING && taskProgress && (
        <div className="mt-4 p-3 bg-orange-50 border border-orange-100 rounded text-orange-700 text-sm flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          {taskProgress}
        </div>
      )}

      {isActive && status !== StepStatus.LOADING && adminExists === true && adminNeedsAuth === true && (
        <div className="mt-3 bg-orange-50 border border-orange-100 p-5 rounded-lg mr-2">
          <p className="text-sm text-orange-800 font-medium mb-3">
            Existing SUPER ADMIN configuration found.
          </p>
          <p className="text-xs text-orange-600 mb-4">
            You can either authorize with your existing FIDO2 passkey to continue, or overwrite it by registering a completely new identity.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={performFido2Login} className="text-sm px-5 py-2 min-w-[140px] bg-orange-600 font-medium text-white shadow-sm rounded-md hover:bg-orange-700 transition">
              Use Existing Key
            </button>
            <button onClick={() => performFido2Registration()} className="text-sm px-5 py-2 bg-white border border-orange-200 text-orange-700 font-medium rounded-md hover:bg-orange-50 transition shadow-sm">
              Register New Key
            </button>
          </div>
        </div>
      )}

      {(isCompleted || (isActive && adminExists === true && adminNeedsAuth === false)) && (
        <div className="mt-3">
          <p className="text-sm text-green-600 font-medium mb-4 whitespace-pre-line">
            SUPER ADMIN account successfully secured! You can manage additional administrators below.
          </p>

          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden mb-5">
            <div className="px-4 py-3 border-b border-slate-100 bg-orange-50/50">
              <h3 className="text-xs font-bold text-orange-800 uppercase tracking-wider mb-3">Master Identity (SUPER ADMIN)</h3>
              {superAdmin ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 border border-orange-100 rounded shadow-sm">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-800 text-sm">{superAdmin.name || "Unknown Admin"}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider bg-orange-100 text-orange-700">SUPER_ADMIN</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-gray-500 bg-gray-100 px-1 py-0.5 rounded">{superAdmin.address}</span>
                      <a href={`https://baifa.io/chain/isuncoin/address/${superAdmin.address}`} target="_blank" rel="noreferrer" className="text-orange-600 hover:text-orange-700 transition transform hover:scale-110">
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="text-[10px] text-gray-400 font-medium mt-1">
                      Registered: {new Date(superAdmin.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    <button onClick={performFido2Login} className="text-[10px] bg-white border border-slate-300 text-slate-700 px-2 py-1 rounded hover:bg-slate-50 font-bold uppercase transition">
                      Replace with Existing Key
                    </button>
                    <button onClick={() => { setNewSuperAdminName(superAdmin.name || "ISUNFA SUPER ADMIN"); setIsReplaceModalOpen(true); }} className="text-[10px] bg-orange-100 text-orange-700 border border-orange-200 px-2 py-1 rounded hover:bg-orange-200 font-bold uppercase transition shadow-sm">
                      Replace with New Key
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 text-sm text-gray-500">Loading current identity...</div>
              )}
            </div>

            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Secondary Administrators</h3>
              <button onClick={() => { setNewAdminName(""); setIsAddAdminModalOpen(true); }} className="text-[10px] bg-white border border-slate-200 text-gray-700 px-2 py-1 rounded hover:bg-slate-50 font-bold uppercase transition shadow-sm">
                + Add Admin
              </button>
            </div>
            <ul className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto custom-scrollbar">
              {secondaryAdmins.map((adm, i) => (
                <li key={i} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-800 text-sm">{adm.name || "Unknown Admin"}</span>
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
                  <div className="text-[10px] text-gray-400 font-medium">
                    {new Date(adm.createdAt).toLocaleDateString()}
                  </div>
                </li>
              ))}
              {secondaryAdmins.length === 0 && <li className="px-4 py-5 text-sm text-gray-400 text-center">No secondary admins found.</li>}
            </ul>
          </div>
        </div>
      )}

      {isAddAdminModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 border border-slate-200 m-4">
            <h3 className="text-md font-bold text-gray-800 mb-2">Register Administrative Key</h3>
            <p className="text-xs text-gray-500 mb-5">Please provide a descriptive name for the new administrator prior to FIDO2 passkey registration.</p>
            <input
              type="text"
              className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-gray-800 mb-5 focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none transition"
              placeholder="e.g. IT Dept Admin"
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
                Cancel
              </button>
              <button
                onClick={performRegisterSecondaryAdmin}
                disabled={!newAdminName.trim()}
                className="px-4 py-2 font-medium text-white bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 disabled:cursor-not-allowed rounded-md transition shadow-sm"
              >
                Continue to FIDO2
              </button>
            </div>
          </div>
        </div>
      )}

      {isReplaceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 border border-slate-200 m-4">
            <h3 className="text-md font-bold text-gray-800 mb-2">Replace SUPER ADMIN</h3>
            <p className="text-xs text-orange-600 font-medium mb-3">Warning: This will irreversibly downgrade the current active Super Admin credentials and assign a new master identity.</p>
            <p className="text-xs text-gray-500 mb-5">Please name your new master identity FIDO2 passkey:</p>
            <input
              type="text"
              className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-gray-800 mb-5 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition"
              placeholder="e.g. ISUNFA SUPER ADMIN"
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
                Cancel
              </button>
              <button
                onClick={() => performFido2Registration(newSuperAdminName.trim())}
                disabled={!newSuperAdminName.trim()}
                className="px-4 py-2 font-medium text-white bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 disabled:cursor-not-allowed rounded-md transition shadow-sm"
              >
                Register Key
              </button>
            </div>
          </div>
        </div>
      )}
    </StepCard>
  );
}
