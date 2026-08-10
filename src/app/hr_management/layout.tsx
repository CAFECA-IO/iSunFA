"use client";

import { ReactNode, useState } from "react";
import HrHeader from "@/components/hr_management/hr_header";
import HrSidebar from "@/components/hr_management/hr_sidebar";

/**
 * Info: (20260810 - Julian) 人事管理系統的外框：頂部列 + 左側選單 + 主內容區。
 */
export default function HrManagementLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <HrHeader onToggleSidebar={() => setIsSidebarOpen(true)} />

      <div className="flex">
        <HrSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
