"use client";

import Head from "next/head";
import AttendanceAuthGate from "@/components/hr_management/attendance/attendance_auth_gate";
import MovementPageBody from "@/components/hr_management/movement/movement_page_body";
import { useTranslation } from "@/i18n/i18n_context";

/**
 * Info: (20260818 - Julian) 沿用簽到的登入閘門。
 * ToDo: (20260818 - Julian) 接上真實 API 之後，再評估閘門要不要留著。
 */
export default function MovementPage() {
  const { t } = useTranslation();

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>
          iSunFA - {t("hr_management.system_name")} |{" "}
          {t("hr_management.movement.title")}
        </title>
      </Head>

      {/* Info: (20260811 - Julian) Main body */}
      <AttendanceAuthGate>
        <MovementPageBody />
      </AttendanceAuthGate>
    </>
  );
}
