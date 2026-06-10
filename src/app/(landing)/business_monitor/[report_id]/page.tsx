"use client";

import Head from "next/head";
import {
  ChevronLeft,
  CloudDownload,
  Share2,
  Calendar,
  CalendarRange,
  Globe,
  Info,
  Landmark,
  Shield,
  Building2,
} from "lucide-react";
import Link from "next/link";

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

      <main className="min-h-screen bg-gray-50/50 pt-8 pb-20">
        <div className="mx-auto flex max-w-6xl flex-col gap-y-4 px-4 md:px-8 lg:max-w-[calc(100vw-30px)] lg:gap-y-6 lg:px-12">
          {/* Info: (20260610 - Julian) Header */}
          <div>
            <Link
              href="/business_monitor"
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 focus:outline-none"
            >
              <ChevronLeft size={16} />
              回上一頁
            </Link>
          </div>

          <div className="flex flex-col gap-8 md:flex-row">
            {/* Info: (20260610 - Julian) Left Sidebar Card */}
            <div className="w-full shrink-0 md:w-80">
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                {/* Info: (20260610 - Julian) Card Header */}
                <div className="border-b border-orange-100 bg-orange-50 px-6 py-5">
                  <h2 className="mb-1 text-xl font-bold text-orange-900">
                    環拓科技股份有限公司
                  </h2>
                  <p className="text-sm font-medium text-orange-700">
                    2024 年永續報告書
                  </p>
                </div>

                {/* Info: (20260610 - Julian) Metadata List */}
                <div className="space-y-4 p-6">
                  <div className="flex items-start">
                    <Calendar className="mt-0.5 mr-3 size-5 shrink-0 text-slate-400" />
                    <div className="text-sm text-slate-600">
                      <span className="font-bold text-slate-700">
                        報告年度：
                      </span>
                      <span>2024</span>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <CalendarRange className="mt-0.5 mr-3 size-5 shrink-0 text-slate-400" />
                    <div className="text-sm text-slate-600">
                      <span className="font-bold text-slate-700">
                        揭露期間：
                      </span>
                      <span>2024/01/31 ~ 2024/12/31</span>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <Globe className="mt-0.5 mr-3 size-5 shrink-0 text-slate-400" />
                    <div className="text-sm text-slate-600">
                      <span className="font-bold text-slate-700">產業別：</span>
                      <span>綠能環保</span>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <Info className="mt-0.5 mr-3 size-5 shrink-0 text-slate-400" />
                    <div className="text-sm text-slate-600">
                      <span className="font-bold text-slate-700">
                        資本額區間：
                      </span>
                      <span>無</span>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <Landmark className="mt-0.5 mr-3 size-5 shrink-0 text-slate-400" />
                    <div className="text-sm text-slate-600">
                      <span className="font-bold text-slate-700">
                        查證機構：
                      </span>
                      <span>無</span>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <Shield className="mt-0.5 mr-3 size-5 shrink-0 text-slate-400" />
                    <div className="text-sm leading-relaxed text-slate-600">
                      <span className="font-bold text-slate-700">
                        查證採用標準：
                      </span>
                      <span>參考國際永續標準、準則與規範(GRI、TCFD、SASB)</span>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <Landmark className="mt-0.5 mr-3 size-5 shrink-0 text-slate-400" />
                    <div className="text-sm text-slate-600">
                      <span className="font-bold text-slate-700">
                        確信機構：
                      </span>
                      <span>無</span>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <Shield className="mt-0.5 mr-3 size-5 shrink-0 text-slate-400" />
                    <div className="text-sm text-slate-600">
                      <span className="font-bold text-slate-700">
                        確信採用標準：
                      </span>
                      <span>無</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Info: (20260610 - Julian) Right Main Content */}
            <div className="flex-1">
              {/* Info: (20260610 - Julian) Title & Buttons */}
              <div className="flex items-center justify-between">
                <h1 className="mb-6 flex items-center text-base font-bold text-slate-800 lg:text-2xl">
                  <Building2
                    size={24}
                    className="mr-2 shrink-0 text-orange-500"
                    strokeWidth={2.5}
                  />
                  歷年報告書
                </h1>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-4 py-2 text-orange-600 transition-colors outline-none hover:bg-orange-100 hover:text-orange-700 active:bg-orange-200"
                  >
                    <CloudDownload size={20} className="shrink-0" />
                    <span className="text-sm font-bold whitespace-nowrap">
                      下載
                    </span>
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-500 transition-colors outline-none hover:bg-gray-50 hover:text-gray-800 active:bg-gray-100"
                  >
                    <Share2 size={20} className="shrink-0" />
                    <span className="text-sm font-bold whitespace-nowrap">
                      分享
                    </span>
                  </button>
                </div>
              </div>

              {/* Info: (20260610 - Julian) Year Selection */}
              <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 font-bold text-slate-700">永續報告書</h3>
                <hr className="mb-4 border-slate-100" />
                <button
                  type="button"
                  className="rounded-lg bg-orange-600 px-6 py-2 text-sm font-bold text-white transition-colors hover:bg-orange-700"
                >
                  2024
                </button>
              </div>

              {/* Info: (20260610 - Julian) PDF Placeholder */}
              <div className="flex h-[600px] w-full items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white shadow-sm">
                <div className="text-center text-slate-400">
                  <div className="mb-4 flex justify-center">
                    <Building2
                      size={60}
                      className="shrink-0 text-slate-300"
                      strokeWidth={1.5}
                    />
                  </div>
                  <p className="mb-2 text-xl font-bold tracking-wide">
                    我是報告
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
