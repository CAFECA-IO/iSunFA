import { useState, ElementType } from 'react';
import { useTranslation } from "@/i18n/i18n_context";
import { CheckCircle2, CircleDashed, ChevronRight, ChevronDown, ChevronUp } from "lucide-react";

export interface IWizardStep {
  id: number;
  title: string;
  detail: string;
  component?: ElementType;
}

export interface IWizardSidebarProps {
  steps: IWizardStep[];
  currentStep: number;
  activeTab: number;
  isLockedMode: boolean;
  onTabClick: (index: number) => void;
}

export function WizardSidebar({ steps, currentStep, activeTab, isLockedMode, onTabClick }: IWizardSidebarProps) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);

  const activeStepObj = steps.find(s => s.id === activeTab) || steps[0];

  return (
    <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-3 lg:p-4 shrink-0 lg:flex-1 lg:h-full lg:overflow-y-auto custom-scrollbar flex flex-col relative z-20 w-full shadow-sm lg:shadow-none">

      {/* Info: (20260415 - Luphia) Mobile Toggle Header */}
      <div
        className="flex lg:hidden items-center justify-between cursor-pointer p-2 sm:p-3"
        onClick={() => setIsExpanded(!isExpanded)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }
        }}
      >
        <div className="flex flex-col gap-1 min-w-0 pr-4">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('admin_setup.sidebar.milestones')}</h3>
          <p className="text-sm sm:text-base font-bold text-slate-800 truncate">
            {activeTab}. {activeStepObj.title}
          </p>
        </div>
        <div className="bg-slate-50 p-2 rounded-xl shrink-0">
          {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
        </div>
      </div>

      <h3 className="hidden lg:block text-xs font-bold text-slate-400 uppercase tracking-widest pl-3 mb-4 mt-2">{t('admin_setup.sidebar.milestones')}</h3>
      <div className={`hidden lg:flex w-1 absolute left-[38px] top-12 bottom-6 bg-slate-100 rounded-full -z-10`} />

      {/* Info: (20260415 - Luphia) Steps List */}
      <div className={`flex-col gap-2 relative mt-2 lg:mt-0 ${isExpanded ? 'flex' : 'hidden lg:flex'}`}>
        {steps.map((s) => {
          const isCompleted = currentStep > s.id;
          const isActive = activeTab === s.id;
          const isLocked = isLockedMode ? s.id !== currentStep : s.id > currentStep;

          return (
            <button
              key={s.id}
              onClick={() => {
                if (!isLocked) {
                  onTabClick(s.id);
                  setIsExpanded(false); // Info: (20260415 - Luphia) Auto-collapse on mobile after selection
                }
              }}
              disabled={isLocked}
              className={`relative w-full flex items-center gap-3 lg:gap-4 p-3 rounded-xl transition-all text-left group
                ${isActive ? 'bg-orange-50 border border-orange-100 ' : 'hover:bg-slate-50 border border-transparent'}
                ${isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <div className="relative shrink-0 flex items-center justify-center bg-transparent lg:bg-white rounded-full">
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
                <ChevronRight className="hidden lg:block w-4 h-4 text-orange-400 shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
