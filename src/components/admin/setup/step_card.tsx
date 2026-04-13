import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { StepStatus } from "@/components/admin/setup/setup_types";

export interface IStepCardProps {
  step: number;
  title: string;
  description: string;
  isActive: boolean;
  status: StepStatus;
  errorMessage?: string;
  children?: React.ReactNode;
}

export function StepCard({ step, title, description, isActive, status, errorMessage, children }: IStepCardProps) {
  const renderStatusIcon = () => {
    if (status === StepStatus.LOADING) return <Loader2 className="w-6 h-6 animate-spin text-orange-500" />;
    if (status === StepStatus.SUCCESS) return <CheckCircle2 className="w-6 h-6 text-green-500" />;
    if (status === StepStatus.ERROR) return <XCircle className="w-6 h-6 text-red-500" />;
    return <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-medium ${isActive ? "border-orange-500 text-orange-600" : "border-gray-300 text-gray-400"}`}>{step}</div>;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-4 mb-6">
        <div className="shrink-0">{renderStatusIcon()}</div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">
            {title}
          </h3>
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        </div>
      </div>
      
      {errorMessage && status === StepStatus.ERROR && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700 animate-in fade-in slide-in-from-top-2">
          <XCircle className="w-5 h-5 shrink-0 mt-0.5 opacity-90" />
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <h4 className="text-sm font-bold mb-0.5">Execution Failed</h4>
            <div className="text-xs break-all leading-relaxed whitespace-pre-wrap font-mono mt-1 w-full bg-red-100/50 p-2 rounded-lg">{errorMessage}</div>
          </div>
        </div>
      )}

      <div className="flex-1 bg-white">
        {children}
      </div>
    </div>
  );
}
