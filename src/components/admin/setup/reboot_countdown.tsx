import { useTranslation } from "@/i18n/i18n_context";
import { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { apiRestartService } from "@/app/admin/setup/_api/config.api";

export interface IRebootCountdownProps {
  onComplete?: () => void;
  seconds?: number;
}

export function RebootCountdown({
  onComplete = undefined,
  seconds = 5,
}: IRebootCountdownProps) {
  const { t } = useTranslation();

  const [countdown, setCountdown] = useState<number>(seconds);

  useEffect(() => {
    // Info: (20260416 - Luphia) Initiate backend restart
    apiRestartService().catch(console.error);
  }, []);

  useEffect(() => {
    if (countdown <= 0) {
      if (onComplete) {
        onComplete();
      } else {
        window.location.href = "/";
      }
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, onComplete]);

  return (
    <div className="mt-3 flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-900 p-6 text-center">
      <RefreshCw className="mb-4 h-8 w-8 animate-spin text-blue-400" />
      <h4 className="mb-1 text-lg font-bold text-white">
        {t("admin_setup.reboot.title")}
      </h4>
      <p className="mb-4 text-sm text-slate-400">
        {t("admin_setup.reboot.desc")}
      </p>
      <div className="bg-gradient-to-br from-blue-400 to-indigo-500 bg-clip-text font-mono text-5xl font-bold text-transparent">
        00:0{countdown}
      </div>
    </div>
  );
}
