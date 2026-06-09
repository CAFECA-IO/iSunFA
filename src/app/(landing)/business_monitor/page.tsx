"use client";

import Head from "next/head";
import BusinessMonitorPageBody from "@/components/business_monitor/business_monitor_page_body";

export default function BusinessMonitorPage() {
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

      <BusinessMonitorPageBody />
    </>
  );
}
