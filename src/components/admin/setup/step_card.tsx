import { ReactNode } from 'react';
import { useTranslation } from "@/i18n/i18n_context";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { StepStatus } from "@/components/admin/setup/setup_types";

export interface IStepCardProps {
  step: number;
  title: string;
  description: string;
  isActive: boolean;
  status: StepStatus;
  errorMessage?: string;
  children?: ReactNode;
  actionContent?: ReactNode;
  onReset?: () => void;
}

export function StepCard({ step, title, description, isActive, status, errorMessage, children, actionContent, onReset }: IStepCardProps) {
  const { t } = useTranslation();

  const renderStatusIcon = () => {
    if (status === StepStatus.LOADING) return <Loader2 className="w-6 h-6 animate-spin text-orange-500" />;
    if (status === StepStatus.SUCCESS) return <CheckCircle2 className="w-6 h-6 text-green-500" />;
    if (status === StepStatus.ERROR) return <XCircle className="w-6 h-6 text-red-500" />;
    return <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-medium ${isActive ? "border-orange-500 text-orange-600" : "border-gray-300 text-gray-400"}`}>{step}</div>;
  };

  return (
    <div className="flex flex-col h-full min-h-full">
      <div className="flex items-center gap-4 mb-6 shrink-0">
        <div className="shrink-0">{renderStatusIcon()}</div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">
            {title}
          </h3>
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        </div>
      </div>

      {errorMessage && status === StepStatus.ERROR && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700 animate-in fade-in slide-in-from-top-2 shrink-0">
          <XCircle className="w-5 h-5 shrink-0 mt-0.5 opacity-90" />
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <h4 className="text-sm font-bold mb-0.5">{t('admin_setup.step_card.exec_failed')}</h4>
            <div className="text-xs break-all leading-relaxed whitespace-pre-wrap font-mono mt-1 w-full bg-red-100/50 p-2 rounded-lg">{errorMessage}</div>
          </div>
        </div>
      )}

      <div className="flex-1 bg-white mb-6">
        {children}
      </div>

      {isActive && (actionContent || onReset) && (
        <div className="mt-auto pt-6 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between shrink-0 gap-4 sm:gap-0">
          {onReset ? (
            <button
              onClick={onReset}
              className="text-slate-500 hover:text-slate-800 hover:bg-slate-100 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center sm:justify-start gap-2 border border-slate-200 sm:border-transparent"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
              {t('admin_setup.step_card.reset_setup')}
            </button>
          ) : <div className="hidden sm:block" />}

          {actionContent && (
            <div className="flex flex-col sm:flex-row justify-end gap-3 flex-1 sm:ml-4 items-stretch sm:items-center [&>button]:w-full sm:[&>button]:w-auto">
              {actionContent}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
