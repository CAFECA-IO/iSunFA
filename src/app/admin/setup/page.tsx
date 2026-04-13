"use client";

import { useState } from "react";
import { Terminal, CheckCircle2, CircleDashed, ChevronRight } from "lucide-react";

import { Step1VerifyEngine } from "@/components/admin/setup/step_1_docker_installed";
import { Step2StartAndVerifyNodes } from "@/components/admin/setup/step_2_start_verify_nodes";
import { Step4FundWallet } from "@/components/admin/setup/step_4_fund_wallet";
import { Step5DeployContracts } from "@/components/admin/setup/step_5_deploy_contracts";
import { Step6InitDatabase } from "@/components/admin/setup/step_6_init_database";
import { Step7SuperAdmin } from "@/components/admin/setup/step_7_super_admin";
import { Step8DomainConfig } from "@/components/admin/setup/step_8_domain_config";
import { Step9FinalizeEnv } from "@/components/admin/setup/step_9_finalize_env";

const STEPS = [
  { id: 1, title: 'Verify Engine', detail: 'Check host runtime & daemon' },
  { id: 2, title: 'Start & Verify', detail: 'Boot infrastructure nodes' },
  { id: 3, title: 'Fund Wallet', detail: 'Bootstrap deployer treasury' },
  { id: 4, title: 'Deploy Contracts', detail: 'Initialize EVM protocol' },
  { id: 5, title: 'Init Database', detail: 'Generate PostgreSQL schema' },
  { id: 6, title: 'Super Admin', detail: 'Register root FIDO2 key' },
  { id: 7, title: 'API Config', detail: 'External endpoints routing' },
  { id: 8, title: 'Finalize', detail: 'Sign configuration to seal' },
];

export default function SetupWizardPage() {
  const [step, setStep] = useState(1);
  const [activeTab, setActiveTab] = useState(1);

  const handleNext = () => {
    setStep(s => {
      const nextStep = s + 1;
      setActiveTab(nextStep);
      return nextStep;
    });
  };

  const progressPercentage = Math.round(((step - 1) / (STEPS.length)) * 100);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pt-12 pb-20 items-center px-4 font-sans relative overflow-x-hidden">
      {/* Info: (20260413 - Luphia) Background decoration */}
      <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl opacity-30" aria-hidden="true">
        <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-br from-orange-400 to-amber-200 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" />
      </div>

      <div className="w-full max-w-6xl space-y-6">

        {/* Info: (20260413 - Luphia) Header */}
        <div className="relative flex flex-col sm:flex-row items-center justify-between bg-white/60 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/80 p-8 overflow-hidden z-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-orange-100/50 to-amber-50/50 rounded-full blur-3xl -z-10 translate-x-1/3 -translate-y-1/3"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-orange-50/40 to-transparent rounded-full blur-2xl -z-10 -translate-x-1/2 translate-y-1/2"></div>
          
          <div className="relative">
            <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-4 tracking-tight">
              <div className="p-3 bg-gradient-to-br from-orange-500 to-amber-500 text-white rounded-xl shadow-lg shadow-orange-500/20 ring-1 ring-orange-400/50">
                <Terminal className="w-6 h-6" strokeWidth={2.5} />
              </div>
              系統部署小幫手
            </h1>
            <p className="text-slate-500 mt-3 text-sm flex items-center font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-2 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
              Please follow the required steps to configure the enterprise architecture.
            </p>
          </div>
          
          <div className="mt-6 sm:mt-0 relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-amber-400 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
            <div className="relative px-8 py-5 bg-white/90 backdrop-blur rounded-2xl border border-white/60 shadow-sm flex flex-col min-w-[220px]">
              <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Overall Progress</span>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-br from-orange-600 to-amber-500 tracking-tighter tabular-nums drop-shadow-sm">
                  {progressPercentage}
                </span>
                <span className="text-xl font-bold text-orange-400">%</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full transition-all duration-1000 ease-out shadow-sm"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Info: (20260413 - Luphia) Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start h-[650px]">

          {/* Info: (20260413 - Luphia) Left Sidebar */}
          <div className="lg:col-span-4 bg-white rounded-2xl shadow-sm border border-slate-200 p-4 h-full overflow-y-auto custom-scrollbar flex flex-col relative z-10">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-3 mb-4 mt-2">Setup Milestones</h3>
            <div className="flex w-1 absolute left-[38px] top-12 bottom-6 bg-slate-100 rounded-full -z-10" />

            <div className="flex flex-col gap-2 relative">
              {STEPS.map((s) => {
                const isCompleted = step > s.id;
                const isActive = activeTab === s.id;
                const isLocked = s.id > step;

                return (
                  <button
                    key={s.id}
                    onClick={() => { if (!isLocked) setActiveTab(s.id); }}
                    disabled={isLocked}
                    className={`relative w-full flex items-center gap-4 p-3 rounded-xl transition-all text-left group
                      ${isActive ? 'bg-orange-50 border border-orange-100 shadow-sm' : 'hover:bg-slate-50 border border-transparent'}
                      ${isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    <div className="relative shrink-0 flex items-center justify-center bg-white">
                      {isCompleted ? (
                        <CheckCircle2 className={`w-6 h-6 stroke-[2.5px] ${isActive ? 'text-orange-500' : 'text-emerald-500'}`} />
                      ) : isActive ? (
                        <div className="w-6 h-6 rounded-full border-4 border-orange-200 border-t-orange-500 animate-spin" />
                      ) : (
                        <CircleDashed className="w-6 h-6 text-slate-300" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className={`text-sm font-semibold mb-0.5 truncate transition-colors
                        ${isActive ? 'text-orange-900' : isCompleted ? 'text-slate-800' : 'text-slate-500'}
                      `}>
                        {s.id}. {s.title}
                      </h4>
                      <p className={`text-xs truncate transition-colors ${isActive ? 'text-orange-600/80' : 'text-slate-400'}`}>
                        {s.detail}
                      </p>
                    </div>

                    {isActive && (
                      <ChevronRight className="w-4 h-4 text-orange-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Info: (20260413 - Luphia) Right Details Panel */}
          <div className="lg:col-span-8 bg-white rounded-2xl shadow-sm border border-slate-200 h-full overflow-y-auto custom-scrollbar relative z-10 flex flex-col">
            <div className="p-8 flex-1">
              {/* Info: (20260413 - Luphia) Dynamic steps rendering depending on active tab */}
              <div className={activeTab === 1 ? "block" : "hidden"}><Step1VerifyEngine step={1} isActive={step === 1 && activeTab === 1} isCompleted={step > 1} onNext={handleNext} /></div>
              <div className={activeTab === 2 ? "block" : "hidden"}><Step2StartAndVerifyNodes step={2} isActive={step === 2 && activeTab === 2} isCompleted={step > 2} onNext={handleNext} /></div>
              <div className={activeTab === 3 ? "block" : "hidden"}><Step4FundWallet step={3} isActive={step === 3 && activeTab === 3} isCompleted={step > 3} onNext={handleNext} /></div>
              <div className={activeTab === 4 ? "block" : "hidden"}><Step5DeployContracts step={4} isActive={step === 4 && activeTab === 4} isCompleted={step > 4} onNext={handleNext} /></div>
              <div className={activeTab === 5 ? "block" : "hidden"}><Step6InitDatabase step={5} isActive={step === 5 && activeTab === 5} isCompleted={step > 5} onNext={handleNext} /></div>
              <div className={activeTab === 6 ? "block" : "hidden"}><Step7SuperAdmin step={6} isActive={step === 6 && activeTab === 6} isCompleted={step > 6} onNext={handleNext} /></div>
              <div className={activeTab === 7 ? "block" : "hidden"}><Step8DomainConfig step={7} isActive={step === 7 && activeTab === 7} isCompleted={step > 7} onNext={handleNext} /></div>
              <div className={activeTab === 8 ? "block" : "hidden"}><Step9FinalizeEnv step={8} isActive={step === 8 && activeTab === 8} isCompleted={step > 8} onNext={() => setStep(9)} /></div>
            </div>
          </div>

        </div>

        {/* Info: (20260413 - Luphia) Global Progress Bar Bar */}
        <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden shrink-0 mt-4 shadow-inner relative z-10">
          <div
            className="h-full bg-orange-500 transition-all duration-700 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

      </div>
    </div>
  );
}
