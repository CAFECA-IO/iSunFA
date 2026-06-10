"use client";

import Head from "next/head";
import ReportDetailPageBody from "@/components/business_monitor/report_detail_page_body";

export default function ReportDetailPage() {
  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta content="iSunFA Business Monitor" property="og:title" />
        <meta content="" property="og:description" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>iSunFA Business Monitor</title>
      </Head>

      <ReportDetailPageBody />
    </>
  );
}
