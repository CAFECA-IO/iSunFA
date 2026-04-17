import { useTranslation } from "@/i18n/i18n_context";
import { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";

export interface IRebootCountdownProps {
  onComplete?: () => void;
  seconds?: number;
}

export function RebootCountdown({ onComplete = undefined, seconds = 5 }: IRebootCountdownProps) {
  const { t } = useTranslation();

  const [countdown, setCountdown] = useState<number>(seconds);

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
    <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl mt-3 flex flex-col items-center justify-center text-center">
      <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mb-4" />
      <h4 className="text-white font-bold text-lg mb-1">{t('admin_setup.reboot.title')}</h4>
      <p className="text-slate-400 text-sm mb-4">{t('admin_setup.reboot.desc')}</p>
      <div className="text-5xl font-mono font-bold text-transparent bg-clip-text bg-gradient-to-br from-blue-400 to-indigo-500">
        00:0{countdown}
      </div>
    </div>
  );
}
