"use client";

import Head from "next/head";
import MovementPageBody from "@/components/hr_management/movement/movement_page_body";
import { useTranslation } from "@/i18n/i18n_context";

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
      <MovementPageBody />
    </>
  );
}
