"use client";

import { RebootCountdown } from "@/components/admin/setup/reboot_countdown";

export default function RebootPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <RebootCountdown />
      </div>
    </div>
  );
}
