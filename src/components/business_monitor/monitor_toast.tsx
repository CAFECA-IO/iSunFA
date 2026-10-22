"use client";

import { FC, useCallback, useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

type ToastType = "success" | "error";

// Info: (20261022 - Luphia) 企業觀測站頁面共用的短暫提示（原本寫死在首頁，公司頁也需要）
export const useMonitorToast = () => {
  const [toast, setToast] = useState<{ type: ToastType; text: string } | null>(
    null,
  );
  const showToast = useCallback((type: ToastType, text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3000);
  }, []);
  return { toast, showToast };
};

const MonitorToast: FC<{ toast: { type: ToastType; text: string } | null }> = ({
  toast,
}) => {
  if (!toast) return null;
  return (
    <div
      role="status"
      className={`fixed top-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-lg px-6 py-3 text-white shadow-lg ${
        toast.type === "success" ? "bg-emerald-500" : "bg-red-500"
      }`}
    >
      {toast.type === "success" ? (
        <CheckCircle2 size={20} className="shrink-0" />
      ) : (
        <AlertCircle size={20} className="shrink-0" />
      )}
      <span className="font-medium">{toast.text}</span>
    </div>
  );
};

export default MonitorToast;
