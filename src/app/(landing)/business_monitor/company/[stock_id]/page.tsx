"use client";

import Head from "next/head";
import CompanyPageBody from "@/components/business_monitor/company_page_body";

export default function BusinessMonitorCompanyPage() {
  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta content="iSunFA Business Monitor" property="og:title" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>iSunFA Business Monitor</title>
      </Head>

      <CompanyPageBody />
    </>
  );
}
