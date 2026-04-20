import { LucideIcon, Clock, Power, RefreshCw } from "lucide-react";
import { SYSTEM_STATUS } from "@/constants/status";

export interface IAdminContainerCardProps {
  id: string;
  name: string;
  image: string;
  status: string;
  uptime: string;
  icon: LucideIcon;
  isRestarting?: boolean;
  isGlobalRestarting?: boolean;
  onRestart?: () => void;
  texts: {
    statusLabel: string;
    uptimeLabel: string;
    restartBtn: string;
    restartingBtn: string;
  };
}

export default function AdminContainerCard({
  id,
  name,
  image,
  status,
  uptime,
  icon: Icon,
  isRestarting = false,
  isGlobalRestarting = false,
  onRestart = () => {},
  texts,
}: IAdminContainerCardProps) {
  const isHealthy = status === SYSTEM_STATUS.HEALTHY;

  return (
    <div className="relative flex flex-col bg-white p-8 rounded-2xl shadow-sm ring-1 ring-gray-200/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
      <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${isHealthy ? 'bg-orange-600' : 'bg-rose-500'}`}>
          <Icon className="h-6 w-6 text-white" aria-hidden="true" />
        </div>
        <span className="truncate">{name}</span>
      </dt>
      <dd className="mt-4 flex flex-auto flex-col text-sm leading-6 text-gray-600">
        <div className="flex-auto space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-gray-500 font-medium tracking-tight">{texts.statusLabel}</span>
            <span className={`inline-flex items-center gap-1 rounded bg-gray-50 px-2 py-1 text-xs font-bold uppercase tracking-wider ${isHealthy ? 'text-emerald-600' : 'text-rose-600'}`}>
              <div className={`h-1.5 w-1.5 rounded-full ${isHealthy ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              {status}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500 font-medium tracking-tight">{texts.uptimeLabel}</span>
            <span className="inline-flex items-center gap-1 text-gray-700 font-mono text-xs font-semibold">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              {uptime}
            </span>
          </div>
          <div className="flex flex-col gap-1 pt-2">
            <span className="text-xs text-gray-400 font-mono truncate">{image}</span>
            <span className="text-[10px] text-gray-300 font-mono truncate">ID: {id}</span>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-100">
          <button
            onClick={onRestart}
            disabled={isRestarting || isGlobalRestarting}
            className={`
              w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition-all
              ${isRestarting 
                ? "bg-orange-100 text-orange-600 cursor-wait" 
                : isGlobalRestarting 
                  ? "bg-gray-50 text-gray-400 cursor-not-allowed" 
                  : "bg-white border border-gray-200 text-gray-700 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200"
              }
            `}
          >
            {isRestarting ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Power className="h-4 w-4" />
            )}
            {isRestarting ? texts.restartingBtn : texts.restartBtn}
          </button>
        </div>
      </dd>
    </div>
  );
}
