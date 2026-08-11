"use client";

import Head from "next/head";
import DashboardPageBody from "@/components/hr_management/dashboard/dashboard_page_body";
import { useTranslation } from "@/i18n/i18n_context";

export default function HrManagementDashboardPage() {
  const { t } = useTranslation();

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>
          iSunFA - {t("hr_management.system_name")} |{" "}
          {t("hr_management.dashboard.title")}
        </title>
      </Head>

      {/* Info: (20260810 - Julian) Main body */}
      <DashboardPageBody />
    </>
  );
}
