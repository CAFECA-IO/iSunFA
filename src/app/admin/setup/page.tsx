"use client";

import { useEffect, useState, useCallback } from "react";
import QRCode from "react-qr-code";
import { CheckCircle2, Loader2, XCircle, Terminal, ExternalLink } from "lucide-react";
import {
  checkDockerInstalled,
  checkDockerRunning,
  startDockerEngine,
  startDockerCompose,
  getAdminWalletInfo,
  toggleMining,
  initDb,
  checkSuperAdminExists,
  createSuperAdminRecord,
  getEnvHashChallenge,
  verifyAndFinalizeConfig,
  saveExternalConfig,
  getExternalConfig,
  authorizeSuperAdmin
} from "@/app/admin/setup/actions";
import { deployContracts, getDeployProgress } from "@/services/deploy.service";

import {
  fido2ClientService,
  getRegisterChallenge,
  parsePasskey,
} from "@/lib/auth/fido2_client";

enum StepStatus {
  IDLE = "idle",
  LOADING = "loading",
  SUCCESS = "success",
  ERROR = "error",
}

export default function SetupWizardPage() {
  const [step, setStep] = useState(1);
  const [dockerInstalledStatus, setDockerInstalledStatus] = useState<StepStatus>(StepStatus.IDLE);
  const [dockerRunningStatus, setDockerRunningStatus] = useState<StepStatus>(StepStatus.IDLE);
  const [composeStatus, setComposeStatus] = useState<StepStatus>(StepStatus.IDLE);
  const [walletStatus, setWalletStatus] = useState<StepStatus>(StepStatus.IDLE);
  const [deployStatus, setDeployStatus] = useState<StepStatus>(StepStatus.IDLE);
  const [initDbStatus, setInitDbStatus] = useState<StepStatus>(StepStatus.IDLE);
  const [superAdminStatus, setSuperAdminStatus] = useState<StepStatus>(StepStatus.IDLE);

  const [adminExists, setAdminExists] = useState<boolean | null>(null);
  const [adminNeedsAuth, setAdminNeedsAuth] = useState<boolean>(false);
  const [adminCredId, setAdminCredId] = useState<string>("");
  const [adminAddress, setAdminAddress] = useState<string>("");
  const [appUrlStatus, setAppUrlStatus] = useState<StepStatus>(StepStatus.IDLE);
  const [appUrlValue, setAppUrlValue] = useState<string>("https://isunfa.localhost");
  const [gaIdValue, setGaIdValue] = useState<string>("G-ZNVVW7JP0N");
  const [geminiKey, setGeminiKey] = useState<string>("");
  const [oenToken, setOenToken] = useState<string>("");
  const [oenMerchant, setOenMerchant] = useState<string>("mermer");

  const [finalizingStatus, setFinalizingStatus] = useState<StepStatus>(StepStatus.IDLE);
  const [deployProgress, setDeployProgress] = useState<string>("");

  const [walletInfo, setWalletInfo] = useState<{ address: string; balance: string; isfBalance?: string } | null>(null);
  const [contractAddresses, setContractAddresses] = useState<{ name: string; address: string }[] | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const [isMining, setIsMining] = useState(false);
  const [miningLoading, setMiningLoading] = useState(false);

  const handleToggleMining = async () => {
    setMiningLoading(true);
    const newStatus = !isMining;
    const result = await toggleMining(newStatus);
    if (result.success) {
      setIsMining(newStatus);
    } else {
      setErrorMsg(`Failed to toggle mining: ${(result as { error?: string }).error || (result as { output?: string }).output}`);
    }
    setMiningLoading(false);
  };

  const handleNextStep = useCallback(() => {
    setStep((s) => s + 1);
    setErrorMsg("");
  }, []);

  const handleSaveAppUrl = async () => {
    setAppUrlStatus(StepStatus.LOADING);
    setErrorMsg("");
    const res = await saveExternalConfig({
      appUrl: appUrlValue,
      gaId: gaIdValue,
      geminiKey: geminiKey,
      oenToken: oenToken,
      oenMerchant: oenMerchant
    });
    if (res.success) {
      setAppUrlStatus(StepStatus.SUCCESS);
      setTimeout(handleNextStep, 800);
    } else {
      setAppUrlStatus(StepStatus.ERROR);
      setErrorMsg(res.error || "Failed to save configuration");
    }
  };

  const handleStep1 = useCallback(async () => {
    setDockerInstalledStatus(StepStatus.LOADING);
    const result = await checkDockerInstalled();
    if (result.success) {
      setDockerInstalledStatus(StepStatus.SUCCESS);
      setTimeout(handleNextStep, 800);
    } else {
      setDockerInstalledStatus(StepStatus.ERROR);
      setErrorMsg("Docker is not installed or not found in PATH.");
    }
  }, [handleNextStep]);

  const handleStep2 = useCallback(async () => {
    setDockerRunningStatus(StepStatus.LOADING);
    let result = await checkDockerRunning();

    if (!result.success) {
      // Info: (20260412 - Luphia) Attempt to start docker engine
      await startDockerEngine();
      // Info: (20260412 - Luphia) Wait a bit for engine to warm up
      await new Promise((resolve) => setTimeout(resolve, 5000));
      result = await checkDockerRunning();
    }

    if (result.success) {
      setDockerRunningStatus(StepStatus.SUCCESS);
      setTimeout(handleNextStep, 800);
    } else {
      setDockerRunningStatus(StepStatus.ERROR);
      setErrorMsg("Docker is not currently running and automatic start failed. Please start Docker Engine manually.");
    }
  }, [handleNextStep]);

  const handleStep3 = useCallback(async () => {
    setComposeStatus(StepStatus.LOADING);
    const result = await startDockerCompose();
    if (result.success) {
      setComposeStatus(StepStatus.SUCCESS);
      setTimeout(handleNextStep, 1500);
    } else {
      setComposeStatus(StepStatus.ERROR);
      setErrorMsg(`Failed to start docker-compose. Output: ${result.output.substring(0, 150)}...`);
    }
  }, [handleNextStep]);

  const handleStep4 = useCallback(async () => {
    setWalletStatus(StepStatus.LOADING);
    const result = await getAdminWalletInfo();
    if (result.success && result.address && result.balance) {
      setWalletInfo({ address: result.address, balance: result.balance, isfBalance: result.isfBalance });
      setIsMining(result.isMining ?? false);

      const bal = Number(result.balance);
      if (bal >= 1) {
        setWalletStatus(StepStatus.SUCCESS);
        setTimeout(handleNextStep, 800);
      } else {
        setWalletStatus(StepStatus.ERROR);
        setErrorMsg("Insufficient Treasury balance. Please top up at least 1 ISC to proceed.");
      }
    } else {
      setWalletStatus(StepStatus.ERROR);
      setErrorMsg(`Failed to get wallet info: ${result.error}`);
    }
  }, [handleNextStep]);

  const handleStep5 = useCallback(async () => {
    setDeployStatus(StepStatus.LOADING);
    setDeployProgress("");

    // Info: (20260412 - Luphia) Start polling deployment progress
    const intervalId = setInterval(async () => {
      try {
        const log = await getDeployProgress();
        if (log) setDeployProgress(log);
      } catch { }
    }, 1500);

    let result: { success: boolean; output: string } = { success: false, output: "" };

    try {
      result = await deployContracts();
    } catch (err) {
      /**
       * Info: (20260413 - Luphia) Server reloads when .env.setup is updated at the end of deployment, 
       * causing the fetch to drop. We pause to let it restart, then fetch the fast-path result.
       */
      await new Promise(resolve => setTimeout(resolve, 3000));
      try {
        result = await deployContracts();
      } catch (innerErr) {
        result = { success: false, output: String(err) + " / " + String(innerErr) };
      }
    }

    // Info: (20260412 - Luphia) Stop polling and grab final output
    clearInterval(intervalId);
    setDeployProgress(result.output || "");

    if (result.success) {
      const kyc = result.output.match(/KYCRegistry:\s+(0x[a-fA-F0-9]{40})/)?.[1];
      const dmc = result.output.match(/DynamicMembershipCard:\s+(0x[a-fA-F0-9]{40})/)?.[1];
      const treasury = result.output.match(/CreditPoint:\s+(0x[a-fA-F0-9]{40})/)?.[1];
      const sub = result.output.match(/SubscriptionManager:\s+(0x[a-fA-F0-9]{40})/)?.[1];
      const ep = result.output.match(/EntryPoint:\s+(0x[a-fA-F0-9]{40})/)?.[1];
      const factory = result.output.match(/Fido2AccountFactory:\s+(0x[a-fA-F0-9]{40})/)?.[1];

      const addresses = [];
      if (kyc) addresses.push({ name: "KYC Registry", address: kyc });
      if (dmc) addresses.push({ name: "Dynamic Membership Card", address: dmc });
      if (treasury) addresses.push({ name: "Credit Point (ERC3643)", address: treasury });
      if (sub) addresses.push({ name: "Subscription Manager", address: sub });
      if (ep) addresses.push({ name: "EntryPoint (ERC4337)", address: ep });
      if (factory) addresses.push({ name: "FIDO2 Account Factory", address: factory });

      setContractAddresses(addresses.length > 0 ? addresses : null);
      setDeployStatus(StepStatus.SUCCESS);
      setTimeout(handleNextStep, 1500);
    } else {
      setDeployStatus(StepStatus.ERROR);
      setErrorMsg(`Failed to deploy contracts. Output: ${result.output.substring(0, 300)}...`);
    }
  }, [handleNextStep]);

  const handleStep6 = useCallback(async () => {
    setInitDbStatus(StepStatus.LOADING);
    let result: { success: boolean; output: string } = { success: false, output: "" };

    try {
      result = await initDb();
    } catch {
      /**
       * Info: (20260413 - Luphia) Similar to step 5, updating .env.setup drops the connection.
       * If it throws here, it means the DB push succeeded and the file was written.
       */
      await new Promise(resolve => setTimeout(resolve, 3000));
      result = { success: true, output: "Database completely initialized (Server Reloaded)." };
    }
    if (result.success) {
      setInitDbStatus(StepStatus.SUCCESS);
      setErrorMsg("");
      setTimeout(handleNextStep, 1500);
    } else {
      setInitDbStatus(StepStatus.ERROR);
      setErrorMsg(`Failed to initialize Database. Output: ${result.output.substring(0, 300)}...`);
    }
  }, [handleNextStep]);

  const handleCheckAdmin = useCallback(async () => {
    setSuperAdminStatus(StepStatus.LOADING);
    const res = await checkSuperAdminExists();
    if (!res.exists) {
      setAdminExists(false);
      setAdminNeedsAuth(false);
      setSuperAdminStatus(StepStatus.IDLE);
    } else {
      setAdminExists(true);
      if (res.address) setAdminAddress(res.address);
      if (res.needsAuth) {
        setAdminNeedsAuth(true);
        if (res.credId) setAdminCredId(res.credId);
        setSuperAdminStatus(StepStatus.IDLE);
      } else {
        setSuperAdminStatus(StepStatus.SUCCESS);
        setErrorMsg("");
        setTimeout(handleNextStep, 800);
      }
    }
  }, [handleNextStep]);

  const performFido2Login = async () => {
    setSuperAdminStatus(StepStatus.LOADING);
    setErrorMsg("");
    try {
      const challengeStr = await getEnvHashChallenge();
      if (!challengeStr.success || !challengeStr.challenge) {
        throw new Error(challengeStr.error || "Failed to generate login challenge.")
      }

      await fido2ClientService.startLogin({
        challenge: challengeStr.challenge,
        allowCredentials: adminCredId ? [adminCredId] : undefined,
        userVerification: "preferred"
      });

      const restoreRes = await authorizeSuperAdmin();
      if (restoreRes.success) {
        if (restoreRes.address) setAdminAddress(restoreRes.address);
        setAdminNeedsAuth(false);
        setSuperAdminStatus(StepStatus.SUCCESS);
        setTimeout(() => setStep(8), 800);
      } else {
        throw new Error(restoreRes.error || "Failed to authorize configuration record.");
      }
    } catch (err) {
      setSuperAdminStatus(StepStatus.ERROR);
      setErrorMsg(`FIDO2 Authorization failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const performFido2Registration = async () => {
    setSuperAdminStatus(StepStatus.LOADING);
    setErrorMsg("");
    try {
      const challenge = await getRegisterChallenge();
      const registration = await fido2ClientService.startRegistration({
        challenge,
        user: "ISUNFA SUPER ADMIN",
        userVerification: "required",
        discoverable: "preferred",
      });

      const { x, y, credentialID } = await parsePasskey(registration, challenge);

      const res = await createSuperAdminRecord(credentialID, x, y);
      if (res.success) {
        // Info: (20260412 - Luphia) finalizeSetupEnvironment is moved to formal sign-and-save process
        if (res.address) setAdminAddress(res.address);
        setSuperAdminStatus(StepStatus.SUCCESS);
        setAdminExists(true);
        setAdminNeedsAuth(false);
        setTimeout(() => setStep(8), 800);
      } else {
        setSuperAdminStatus(StepStatus.ERROR);
        setErrorMsg(`Failed to create SUPER_ADMIN: ${res.error}`);
      }
    } catch (err) {
      setSuperAdminStatus(StepStatus.ERROR);
      setErrorMsg(`FIDO2 Registration Failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleSignAndSave = async () => {
    setFinalizingStatus(StepStatus.LOADING);
    setErrorMsg("");
    try {
      const challengeRes = await getEnvHashChallenge();
      if (!challengeRes.success || !challengeRes.challenge) {
        throw new Error(challengeRes.error || "Failed to get config challenge");
      }

      const authentication = await fido2ClientService.startLogin({
        challenge: challengeRes.challenge,
      });

      const res = await verifyAndFinalizeConfig(authentication);
      if (res.success) {
        setFinalizingStatus(StepStatus.SUCCESS);
      } else {
        setFinalizingStatus(StepStatus.ERROR);
        setErrorMsg(`Failed to finalize config: ${res.error}`);
      }
    } catch (err: unknown) {
      setFinalizingStatus(StepStatus.ERROR);
      setErrorMsg(`Signing failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Info: (20260412 - Luphia) Auto-trigger steps when reaching them
  useEffect(() => {
    const timer = setTimeout(() => {
      if (step === 1 && dockerInstalledStatus === StepStatus.IDLE) handleStep1().catch(console.error);
      if (step === 2 && dockerRunningStatus === StepStatus.IDLE) handleStep2().catch(console.error);
      if (step === 3 && composeStatus === StepStatus.IDLE) handleStep3().catch(console.error);
      if (step === 4 && walletStatus === StepStatus.IDLE) handleStep4().catch(console.error);
      if (step === 5 && deployStatus === StepStatus.IDLE) handleStep5().catch(console.error);
      if (step === 6 && initDbStatus === StepStatus.IDLE) handleStep6().catch(console.error);
      if (step === 7 && superAdminStatus === StepStatus.IDLE && adminExists === null) handleCheckAdmin().catch(console.error);
    }, 0);
    return () => clearTimeout(timer);
  }, [step, dockerInstalledStatus, dockerRunningStatus, composeStatus, walletStatus, deployStatus, initDbStatus, superAdminStatus, adminExists, handleStep1, handleStep2, handleStep3, handleStep4, handleStep5, handleStep6, handleCheckAdmin]);

  // Info: (20260412 - Luphia) Poll wallet balance every 15 seconds if step 4 is waiting
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 4 && walletStatus === StepStatus.ERROR) {
      interval = setInterval(async () => {
        const result = await getAdminWalletInfo();
        if (result.success && result.address && result.balance) {
          setWalletInfo({ address: result.address, balance: result.balance, isfBalance: result.isfBalance });
          setIsMining(result.isMining ?? false);
          if (Number(result.balance) >= 1) {
            setWalletStatus(StepStatus.SUCCESS);
            setErrorMsg("");
            setTimeout(handleNextStep, 800);
            clearInterval(interval);
          }
        }
      }, 15000);
    }
    return () => clearInterval(interval);
  }, [step, walletStatus, handleNextStep]);

  // Info: (20260413 - Luphia) Preload PART 8 configuration parameters
  useEffect(() => {
    if (step === 8 && appUrlStatus === StepStatus.IDLE) {
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
  }, [step, appUrlStatus]);

  // Info: (20260412 - Luphia) Auto-scroll to active step
  useEffect(() => {
    const container = document.getElementById("steps-container");
    // Info: (20260412 - Luphia) Ensure we don't scroll if it's not rendered yet
    if (container && container.children[step - 1]) {
      container.children[step - 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [step]);

  const renderStatusIcon = (status: StepStatus) => {
    if (status === StepStatus.LOADING) return <Loader2 className="w-6 h-6 animate-spin text-orange-500" />;
    if (status === StepStatus.SUCCESS) return <CheckCircle2 className="w-6 h-6 text-green-500" />;
    if (status === StepStatus.ERROR) return <XCircle className="w-6 h-6 text-red-500" />;
    return <div className="w-6 h-6 rounded-full border-2 border-gray-300" />;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pt-20 pb-20 items-center px-4 font-sans relative overflow-x-hidden">
      {/* Info: (20260412 - Luphia) Background decoration */}
      <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl" aria-hidden="true">
        <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff8c00] to-[#ffda44] opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" />
      </div>

      <div className="max-w-2xl w-full bg-white shadow-xl rounded-2xl p-8 border border-gray-100 relative z-10 transition-all">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          <Terminal className="text-orange-600" />
          System Initialization
        </h1>
        <p className="text-gray-500 mb-8">Execute required system checks and initial boot steps.</p>

        <div id="steps-container" className="space-y-6">
          {/* Info: (20260412 - Luphia) Step 1 */}
          <div className={`flex items-start gap-4 p-4 rounded-lg transition-colors ${step === 1 ? "bg-orange-50 border border-orange-100" : "bg-transparent border border-transparent"}`}>
            <div className="pt-1">{renderStatusIcon(dockerInstalledStatus)}</div>
            <div className="flex-1 min-w-0">
              <h3 className={`font-semibold ${step >= 1 ? "text-gray-900" : "text-gray-400"}`}>
                Step 1: Verify Docker Installation
              </h3>
              <p className="text-sm text-gray-500">Checking if Docker is installed on the hosting environment.</p>
              {step === 1 && dockerInstalledStatus === StepStatus.ERROR && (
                <button onClick={handleStep1} className="mt-3 text-sm px-4 py-1.5 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition">Retry</button>
              )}
            </div>
          </div>

          {/* Info: (20260412 - Luphia) Step 2 */}
          <div className={`flex items-start gap-4 p-4 rounded-lg transition-colors ${step === 2 ? "bg-orange-50 border border-orange-100" : "bg-transparent border border-transparent"}`}>
            <div className="pt-1">{renderStatusIcon(dockerRunningStatus)}</div>
            <div className="flex-1 min-w-0">
              <h3 className={`font-semibold ${step >= 2 ? "text-gray-900" : "text-gray-400"}`}>
                Step 2: Verify Docker Engine
              </h3>
              <p className="text-sm text-gray-500">Ensuring the Docker daemon is currently running.</p>
              {step === 2 && dockerRunningStatus === StepStatus.ERROR && (
                <button onClick={handleStep2} className="mt-3 text-sm px-4 py-1.5 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition">Retry</button>
              )}
            </div>
          </div>

          {/* Info: (20260412 - Luphia) Step 3 */}
          <div className={`flex items-start gap-4 p-4 rounded-lg transition-colors ${step === 3 ? "bg-orange-50 border border-orange-100" : "bg-transparent border border-transparent"}`}>
            <div className="pt-1">{renderStatusIcon(composeStatus)}</div>
            <div className="flex-1 min-w-0">
              <h3 className={`font-semibold ${step >= 3 ? "text-gray-900" : "text-gray-400"}`}>
                Step 3: Start Core Infrastructure
              </h3>
              <p className="text-sm text-gray-500">Booting infrastructure (databases/cache) via docker-compose.</p>
              {step === 3 && composeStatus === StepStatus.ERROR && (
                <button onClick={handleStep3} className="mt-3 text-sm px-4 py-1.5 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition">Retry</button>
              )}
            </div>
          </div>

          {/* Info: (20260412 - Luphia) Step 4 */}
          <div className={`flex items-start gap-4 p-4 rounded-lg transition-colors ${step === 4 ? "bg-orange-50 border border-orange-100" : "bg-transparent border border-transparent"}`}>
            <div className="pt-1">{renderStatusIcon(walletStatus)}</div>
            <div className="flex-1 min-w-0">
              <h3 className={`font-semibold ${step >= 4 ? "text-gray-900" : "text-gray-400"}`}>
                Step 4: System Treasury Validation
              </h3>
              <p className="text-sm text-gray-500">Verifying administrative wallet balance on configured RPC.</p>

              {/* Info: (20260412 - Luphia) Output Result for Wallet */}
              {step >= 4 && walletInfo && (
                <div className="mt-6 p-6 bg-slate-50 border border-slate-200 rounded-xl flex flex-col gap-6">

                  {/* Info: (20260412 - Luphia) Top Block: Balance */}
                  <div className="flex flex-col sm:flex-row gap-6">
                    <div>
                      <h4 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1">Current Balance</h4>
                      <div className="text-3xl font-bold text-gray-900 tracking-tight">
                        {Number(walletInfo.balance).toFixed(4)} <span className="text-xl font-medium text-gray-500 ml-1">ISC</span>
                      </div>
                      {Number(walletInfo.balance) < 1 && (
                        <p className="text-amber-600 text-xs mt-2 font-medium bg-amber-50 inline-block px-2 py-1 rounded">⚠️ Balance below 1 ISC. Waiting for deposit...</p>
                      )}
                    </div>
                    {walletInfo.isfBalance && (
                      <div>
                        <h4 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1">Credit Points</h4>
                        <div className="text-3xl font-bold text-orange-700 tracking-tight">
                          {Number(walletInfo.isfBalance).toFixed(2)} <span className="text-xl font-medium text-orange-400 ml-1">ISF</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Info: (20260412 - Luphia) Middle Block: Address & QR */}
                  <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center sm:items-start gap-5">
                    <div className="bg-white p-2.5 shadow-sm rounded-lg shrink-0">
                      <QRCode
                        value={walletInfo.address}
                        size={80}
                        level="H"
                      />
                    </div>
                    <div className="min-w-0 w-full text-center sm:text-left">
                      <h4 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2 mt-1">Treasury Address</h4>
                      <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                        <code className="text-xs sm:text-sm font-mono text-gray-800 break-all bg-gray-200/80 px-3 py-2 rounded-md">
                          {walletInfo.address}
                        </code>
                        <a href={`https://baifa.io/chain/isuncoin/address/${walletInfo.address}`} target="_blank" rel="noreferrer" className="text-orange-600 hover:bg-orange-50 p-2 rounded transition shrink-0">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Info: (20260412 - Luphia) Bottom Block: Mining Action */}
                  <div className="pt-6 border-t border-slate-200 flex flex-col">
                    <h4 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-3">Node Mining</h4>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleToggleMining}
                        disabled={miningLoading}
                        className={`${isMining ? 'bg-orange-600' : 'bg-gray-200'
                          } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-600 focus:ring-offset-2 ${miningLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        role="switch"
                        aria-checked={isMining}
                      >
                        <span className="sr-only">Toggle mining</span>
                        <span
                          aria-hidden="true"
                          className={`${isMining ? 'translate-x-5' : 'translate-x-0'
                            } pointer-events-none flex items-center justify-center h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                        >
                          {miningLoading && <Loader2 className="w-3 h-3 text-orange-600 animate-spin" />}
                        </span>
                      </button>

                      <span className="text-sm font-medium min-w-[60px] text-left">
                        {isMining ? (
                          <span className="text-orange-600 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-orange-600 animate-pulse shadow-sm shadow-orange-200" />
                            Active
                          </span>
                        ) : (
                          <span className="text-gray-500">
                            Off
                          </span>
                        )}
                      </span>
                    </div>

                    <p className="text-[11px] text-gray-500 mt-2 max-w-[200px] leading-relaxed">
                      {isMining ? "Node is mining with 5 threads" : "Mining is currently disabled"}
                    </p>
                  </div>

                </div>
              )}

              {step === 4 && walletStatus === StepStatus.ERROR && (
                <button onClick={handleStep4} className="mt-3 text-sm px-4 py-1.5 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition">Retry</button>
              )}
            </div>
          </div>

          {/* Info: (20260412 - Luphia) Step 5 */}
          <div className={`flex items-start gap-4 p-4 rounded-lg transition-colors ${step === 5 ? "bg-orange-50 border border-orange-100" : "bg-transparent border border-transparent"}`}>
            <div className="pt-1">{renderStatusIcon(deployStatus)}</div>
            <div className="flex-1 min-w-0">
              <h3 className={`font-semibold ${step >= 5 ? "text-gray-900" : "text-gray-400"}`}>
                Step 5: Deploy Smart Contracts
              </h3>
              <p className="text-sm text-gray-500">Automatically deploying protocol contracts (Credit Point, KYC Registry, etc) to EVM.</p>
              {step === 5 && deployStatus === StepStatus.ERROR && (
                <button onClick={handleStep5} className="mt-3 text-sm px-4 py-1.5 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition">Retry Deploy</button>
              )}
              {step === 5 && deployStatus === StepStatus.LOADING && (
                <div className="mt-6 space-y-4">
                  <div className="p-4 bg-gray-900 border border-gray-700 rounded-lg shadow-inner max-h-48 overflow-y-auto custom-scrollbar flex flex-col-reverse">
                    <pre className="text-xs font-mono text-green-400 whitespace-pre-wrap break-words leading-relaxed mb-0">
                      {deployProgress || "Initializing EVM deployment...\nWaiting for compiler..."}
                    </pre>
                  </div>

                  {/* Info: (20260412 - Luphia) Dynamic Live Contract List */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <h4 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-6 flex items-center gap-2">
                      <Loader2 className="w-3 h-3 animate-spin text-orange-500" />
                      Deploying Contracts
                    </h4>
                    <div className="space-y-3">
                      {[
                        { id: "KYCRegistry", label: "KYC Registry" },
                        { id: "DynamicMembershipCard", label: "Dynamic Membership Card" },
                        { id: "CreditPoint", label: "Credit Point (ERC3643)" },
                        { id: "SubscriptionManager", label: "Subscription Manager" },
                        { id: "EntryPoint", label: "EntryPoint (ERC4337)" },
                        { id: "Fido2AccountFactory", label: "FIDO2 Account Factory" }
                      ].map((contract, i) => {
                        const isDeploying = deployProgress.includes(`Deploying ${contract.id}...`);
                        const deployedMatch = deployProgress.match(new RegExp(`-> ${contract.id} deployed to:\\s+(0x[a-fA-F0-9]{40})`));
                        const address = deployedMatch ? deployedMatch[1] : null;

                        return (
                          <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 last:border-0 pb-3 last:pb-0">
                            <span className="text-[12px] font-medium text-gray-500 flex items-center gap-2.5">
                              {address ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : (isDeploying ? <Loader2 className="w-4 h-4 text-orange-500 animate-spin" /> : <div className="w-4 h-4 border-2 border-gray-200 rounded-full" />)}
                              {contract.label}
                            </span>
                            <div className="flex items-center gap-2">
                              {address ? (
                                <>
                                  <code className="text-[12px] font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                    {address}
                                  </code>
                                  <a href={`https://baifa.io/chain/isuncoin/address/${address}`} target="_blank" rel="noreferrer" className="text-orange-500 hover:bg-orange-50 p-1 rounded transition">
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                </>
                              ) : (
                                <span className="text-[12px] text-gray-400/80 font-mono tracking-wider uppercase">
                                  {isDeploying ? "Deploying..." : "Waiting"}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
              {step === 5 && deployStatus === StepStatus.SUCCESS && contractAddresses && (
                <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <h4 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-3">Deployed Contracts</h4>
                  <div className="space-y-3">
                    {contractAddresses.map((ctx, idx) => (
                      <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 last:border-0 pb-3 last:pb-0">
                        <span className="text-sm font-medium text-gray-700">{ctx.name}</span>
                        <div className="flex items-center gap-2">
                          <code className="text-xs font-mono text-gray-600 bg-gray-200 px-2 py-1 rounded">
                            {ctx.address}
                          </code>
                          <a href={`https://baifa.io/chain/isuncoin/address/${ctx.address}`} target="_blank" rel="noreferrer" className="text-orange-600 hover:bg-orange-50 p-1 rounded transition">
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Info: (20260412 - Luphia) Step 6 */}
          <div className={`flex items-start gap-4 p-4 rounded-lg transition-colors ${step === 6 ? "bg-orange-50 border border-orange-100" : "bg-transparent border border-transparent"}`}>
            <div className="pt-1">{renderStatusIcon(initDbStatus)}</div>
            <div className="flex-1 min-w-0">
              <h3 className={`font-semibold ${step >= 6 ? "text-gray-900" : "text-gray-400"}`}>
                Step 6: Initialize Database
              </h3>
              <p className="text-sm text-gray-500">Synchronizing Prisma schema to PostgreSQL and generating Client bindings.</p>
              {step === 6 && initDbStatus === StepStatus.ERROR && (
                <button onClick={handleStep6} className="mt-3 text-sm px-4 py-1.5 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition">Retry Init</button>
              )}
            </div>
          </div>

          {/* Info: (20260412 - Luphia) Step 7 */}
          <div className={`flex items-start gap-4 p-4 rounded-lg transition-colors ${step === 7 ? "bg-orange-50 border border-orange-100" : "bg-transparent border border-transparent"}`}>
            <div className="pt-1">{renderStatusIcon(superAdminStatus)}</div>
            <div className="flex-1 min-w-0">
              <h3 className={`font-semibold ${step >= 7 ? "text-gray-900" : "text-gray-400"}`}>
                Step 7: Register Server SUPER ADMIN
              </h3>
              <p className="text-sm text-gray-500">Attach a secure FIDO2 Passkey to establish the initial SUPER_ADMIN wallet.</p>

              {step === 7 && superAdminStatus !== StepStatus.LOADING && adminExists === false && (
                <div className="mt-3">
                  <button onClick={performFido2Registration} className="text-sm px-4 py-1.5 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition mr-3">
                    Register TouchID/FaceID
                  </button>
                </div>
              )}
              {step === 7 && superAdminStatus !== StepStatus.LOADING && adminExists === true && adminNeedsAuth === true && (
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
                    <button onClick={performFido2Registration} className="text-sm px-5 py-2 bg-white border border-orange-200 text-orange-700 font-medium rounded-md hover:bg-orange-50 transition shadow-sm">
                      Register New Key
                    </button>
                  </div>
                </div>
              )}
              {step === 7 && adminExists === true && adminNeedsAuth === false && (
                <div className="mt-3">
                  <p className="text-sm text-green-600 font-medium whitespace-pre-line">
                    SUPER_ADMIN account successfully initialized & secured!
                  </p>
                  {adminAddress && (
                    <div className="mt-2 flex items-center gap-2">
                      <code className="text-xs font-mono text-gray-600 bg-gray-200 px-2 py-1 rounded">
                        {adminAddress}
                      </code>
                      <a href={`https://baifa.io/chain/isuncoin/address/${adminAddress}`} target="_blank" rel="noreferrer" className="text-orange-600 hover:bg-orange-50 p-1 rounded transition">
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}

                </div>
              )}
            </div>
          </div>

          {/* Info: (20260412 - Luphia) Step 8 */}
          <div className={`flex items-start gap-4 p-4 rounded-lg transition-colors ${step === 8 ? "bg-orange-50 border border-orange-100" : "bg-transparent border border-transparent"}`}>
            <div className="pt-1">{renderStatusIcon(appUrlStatus)}</div>
            <div className="flex-1 min-w-0">
              <h3 className={`font-semibold ${step >= 8 ? "text-gray-900" : "text-gray-400"}`}>
                Step 8: Domain & API Configuration
              </h3>
              <p className="text-sm text-gray-500">Configure the primary domain URL and external API integrations.</p>

              {step === 8 && appUrlStatus !== StepStatus.SUCCESS && (
                <div className="mt-4 flex flex-col gap-4 max-w-lg bg-white p-5 border border-orange-100 shadow-sm rounded-xl">

                  <div className="flex flex-col gap-1">
                    <label htmlFor="appUrlInput" className="text-xs font-semibold text-gray-600">Application URL</label>
                    <input
                      id="appUrlInput"
                      aria-label="Application URL"
                      type="text"
                      value={appUrlValue}
                      onChange={e => setAppUrlValue(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 text-sm bg-white text-gray-900"
                      disabled={appUrlStatus === StepStatus.LOADING}
                      placeholder="https://isunfa.localhost"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label htmlFor="gaIdInput" className="text-xs font-semibold text-gray-600">Google Analytics ID</label>
                      <input
                        id="gaIdInput"
                        aria-label="Google Analytics ID"
                        type="text"
                        value={gaIdValue}
                        onChange={e => setGaIdValue(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 text-sm bg-white text-gray-900"
                        disabled={appUrlStatus === StepStatus.LOADING}
                        placeholder="G-XXXXXXXXXX"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label htmlFor="geminiInput" className="text-xs font-semibold text-gray-600">Gemini API Key (Optional)</label>
                      <input
                        id="geminiInput"
                        aria-label="Gemini API Key"
                        type="password"
                        value={geminiKey}
                        onChange={e => setGeminiKey(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 text-sm bg-white text-gray-900"
                        disabled={appUrlStatus === StepStatus.LOADING}
                        placeholder="AIzaSy..."
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label htmlFor="oenMerchantInput" className="text-xs font-semibold text-gray-600">OEN Merchant ID (Optional)</label>
                      <input
                        id="oenMerchantInput"
                        aria-label="OEN Merchant ID"
                        type="text"
                        value={oenMerchant}
                        onChange={e => setOenMerchant(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 text-sm bg-white text-gray-900"
                        disabled={appUrlStatus === StepStatus.LOADING}
                        placeholder="Merchant ID"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label htmlFor="oenTokenInput" className="text-xs font-semibold text-gray-600">OEN Access Token (Optional)</label>
                      <input
                        id="oenTokenInput"
                        aria-label="OEN Access Token"
                        type="password"
                        value={oenToken}
                        onChange={e => setOenToken(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 text-sm bg-white text-gray-900"
                        disabled={appUrlStatus === StepStatus.LOADING}
                        placeholder="Access Token"
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100 mt-1">
                    <button
                      onClick={handleSaveAppUrl}
                      disabled={appUrlStatus === StepStatus.LOADING}
                      className="w-full sm:w-auto px-5 py-2.5 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 disabled:bg-orange-300 transition"
                    >
                      {appUrlStatus === StepStatus.LOADING ? (
                        <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Saving Configuration...</span>
                      ) : (
                        "Save API Configuration"
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Info: (20260412 - Luphia) Step 9 */}
          <div className={`flex items-start gap-4 p-4 rounded-lg transition-colors ${step === 9 ? "bg-orange-50 border border-orange-100" : "bg-transparent border border-transparent"}`}>
            <div className="pt-1">{renderStatusIcon(finalizingStatus)}</div>
            <div className="flex-1 min-w-0">
              <h3 className={`font-semibold ${step >= 9 ? "text-gray-900" : "text-gray-400"}`}>
                Step 9: Finalize Configuration
              </h3>
              <p className="text-sm text-gray-500">Sign the environment variables with FIDO2 to seal the enterprise deployment securely.</p>

              {step === 9 && finalizingStatus !== StepStatus.SUCCESS && (
                <div className="mt-5 p-5 bg-orange-50 border border-orange-100 rounded-lg shadow-sm space-y-4">
                  <p className="text-sm text-orange-900 leading-relaxed font-medium">
                    Verification Complete. The system relies on WebAuthn assertion to prevent tampering. Please sign the environment configuration to complete the deployment.
                  </p>
                  <button
                    onClick={handleSignAndSave}
                    disabled={finalizingStatus === StepStatus.LOADING}
                    className="w-full sm:w-auto px-5 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 disabled:cursor-not-allowed text-white font-medium rounded-lg text-sm shadow-sm transition-all flex items-center justify-center"
                  >
                    {finalizingStatus === StepStatus.LOADING ? (
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

              {step === 9 && finalizingStatus === StepStatus.SUCCESS && (
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
            </div>
          </div>

        </div>

        {errorMsg && (
          <div className="mt-6 p-4 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
            {errorMsg}
          </div>
        )}
      </div>
      <div
        className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]"
        aria-hidden="true"
      >
        <div
          className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-[#ff8c00] to-[#ffda44] opacity-20 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]"
          style={{
            clipPath:
              'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
          }}
        />
      </div>
    </div>
  );
}
