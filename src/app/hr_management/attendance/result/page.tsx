"use client";

import Head from "next/head";
import AttendanceAuthGate from "@/components/hr_management/attendance/attendance_auth_gate";
import ResultPageBody from "@/components/hr_management/attendance/result_page_body";
import { useTranslation } from "@/i18n/i18n_context";

export default function AttendanceResultPage() {
  const { t } = useTranslation();

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>
          iSunFA - {t("hr_management.system_name")} |{" "}
          {t("hr_management.attendance_result.title")}
        </title>
      </Head>

      {/* Info: (20260813 - Julian) Main body。未登入時閘門會擋住，子元件不會 mount */}
      <AttendanceAuthGate>
        <ResultPageBody />
      </AttendanceAuthGate>
    </>
  );
}
