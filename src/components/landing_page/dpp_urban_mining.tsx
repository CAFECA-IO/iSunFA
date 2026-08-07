"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "@/i18n/i18n_context";
import {
  QrCode,
  ShieldCheck,
  Link2,
  Recycle,
  Cpu,
  Coins,
  ArrowRight,
  Sparkles,
  Layers,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";

export default function DPPUrbanMining() {
  const { t } = useTranslation();
  const [isScanning, setIsScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [scanStep, setScanStep] = useState<1 | 2 | 3>(1);

  const startScan = () => {
    setIsScanning(true);
    setScanComplete(false);
    setScanStep(1);

    setTimeout(() => {
      setScanStep(2);
    }, 500);

    setTimeout(() => {
      setScanStep(3);
    }, 1000);

    setTimeout(() => {
      setIsScanning(false);
      setScanComplete(true);
    }, 1500);
  };

  // Info: (20260529 - Luphia) Auto trigger a scan on load for visual wow factor, or let users click
  useEffect(() => {
    const timer = setTimeout(() => {
      startScan();
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    // Info: (20260807 - Luphia) dark:bg-* 的 `!` 見 globals.css「刻意深色的表面」區塊
    <div className="dark:bg-surface-raised! relative overflow-hidden bg-slate-900 py-24 text-white sm:py-32">
      {/* Info: (20260529 - Luphia) Background Gradients */}
      <div className="absolute inset-y-0 left-1/2 -z-10 w-[200%] -translate-x-1/2 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.15),transparent_45%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(34,197,94,0.1),transparent_45%)]" />
      </div>

      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Info: (20260529 - Luphia) Header */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-x-2 rounded-full bg-orange-500/10 px-4 py-1.5 text-sm font-semibold text-orange-400 ring-1 ring-orange-500/20">
            <Sparkles className="h-4 w-4" />
            {t("dpp_urban_mining.title")}
          </div>
          <h2 className="bg-gradient-to-r from-orange-400 via-amber-200 to-green-400 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent sm:text-5xl">
            {t("dpp_urban_mining.subtitle")}
          </h2>
          <p className="mt-6 text-lg leading-8 text-slate-300">
            {t("dpp_urban_mining.description")}
          </p>
        </div>

        {/* Info: (20260529 - Luphia) Dual Cards Grid */}
        <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Info: (20260529 - Luphia) Card 1: DPP */}
          {/* Info: (20260807 - Luphia) 深色下 hover 由外圈承擔：底色在近黑頁面上動不了 ——
              `bg-slate-800/40 → /60` 疊出來只差 1.04:1，就算拉到 100% 也只有 1.12:1。
              橘環拉到 /70 才對卡片有 3.39:1，過得了 WCAG 1.4.11 的 3:1。 */}
          <div className="group dark:ring-border-default relative flex flex-col justify-between rounded-3xl bg-slate-800/40 p-8 ring-1 ring-slate-700/50 backdrop-blur-md transition-all duration-300 hover:bg-slate-800/60 hover:ring-orange-500/50 dark:hover:ring-orange-500/70">
            <div>
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-400 ring-1 ring-orange-500/30 transition-transform group-hover:scale-110">
                <QrCode className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-2xl font-bold text-slate-100">
                {t("dpp_urban_mining.dpp.title")}
              </h3>
              <p className="mb-8 text-sm text-slate-400">
                {t("dpp_urban_mining.dpp.desc")}
              </p>

              <dl className="space-y-6">
                <div className="flex gap-4">
                  <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-orange-500/10 text-orange-400">
                    <Layers className="h-4 w-4" />
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-200">
                      {t("dpp_urban_mining.dpp.feature1_title")}
                    </dt>
                    <dd className="mt-1 text-sm leading-relaxed text-slate-400">
                      {t("dpp_urban_mining.dpp.feature1_desc")}
                    </dd>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-orange-500/10 text-orange-400">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-200">
                      {t("dpp_urban_mining.dpp.feature2_title")}
                    </dt>
                    <dd className="mt-1 text-sm leading-relaxed text-slate-400">
                      {t("dpp_urban_mining.dpp.feature2_desc")}
                    </dd>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-orange-500/10 text-orange-400">
                    <Link2 className="h-4 w-4" />
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-200">
                      {t("dpp_urban_mining.dpp.feature3_title")}
                    </dt>
                    <dd className="mt-1 text-sm leading-relaxed text-slate-400">
                      {t("dpp_urban_mining.dpp.feature3_desc")}
                    </dd>
                  </div>
                </div>
              </dl>
            </div>
          </div>

          {/* Info: (20260529 - Luphia) Card 2: Urban Mining */}
          {/* Info: (20260807 - Luphia) hover 的處理同 Card 1 */}
          <div className="group dark:ring-border-default relative flex flex-col justify-between rounded-3xl bg-slate-800/40 p-8 ring-1 ring-slate-700/50 backdrop-blur-md transition-all duration-300 hover:bg-slate-800/60 hover:ring-green-500/50 dark:hover:ring-green-500/70">
            <div>
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-green-500/10 text-green-400 ring-1 ring-green-500/30 transition-transform group-hover:scale-110">
                <Recycle className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-2xl font-bold text-slate-100">
                {t("dpp_urban_mining.urban.title")}
              </h3>
              <p className="mb-8 text-sm text-slate-400">
                {t("dpp_urban_mining.urban.desc")}
              </p>

              <dl className="space-y-6">
                <div className="flex gap-4">
                  <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-green-500/10 text-green-400">
                    <Coins className="h-4 w-4" />
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-200">
                      {t("dpp_urban_mining.urban.feature1_title")}
                    </dt>
                    <dd className="mt-1 text-sm leading-relaxed text-slate-400">
                      {t("dpp_urban_mining.urban.feature1_desc")}
                    </dd>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-green-500/10 text-green-400">
                    <Cpu className="h-4 w-4" />
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-200">
                      {t("dpp_urban_mining.urban.feature2_title")}
                    </dt>
                    <dd className="mt-1 text-sm leading-relaxed text-slate-400">
                      {t("dpp_urban_mining.urban.feature2_desc")}
                    </dd>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-green-500/10 text-green-400">
                    <Recycle className="h-4 w-4" />
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-200">
                      {t("dpp_urban_mining.urban.feature3_title")}
                    </dt>
                    <dd className="mt-1 text-sm leading-relaxed text-slate-400">
                      {t("dpp_urban_mining.urban.feature3_desc")}
                    </dd>
                  </div>
                </div>
              </dl>
            </div>
          </div>
        </div>

        {/* Info: (20260529 - Luphia) Interactive Scanner Demo Section */}
        <div className="dark:ring-border-default relative mx-auto mt-24 max-w-5xl overflow-hidden rounded-3xl bg-slate-950/60 p-8 ring-1 ring-slate-800/80 backdrop-blur-sm">
          <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-orange-500/5 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-green-500/5 blur-3xl" />

          <div className="flex flex-col items-center gap-10 lg:flex-row">
            {/* Info: (20260529 - Luphia) Left: Scan Controller / QR Area */}
            <div className="flex w-full flex-col items-center justify-center text-center lg:w-2/5">
              <h4 className="mb-4 text-xl font-bold text-slate-200">
                {t("dpp_urban_mining.interactive.scan_demo")}
              </h4>

              {/* Info: (20260529 - Luphia) Scan Frame */}
              <div className="group dark:border-border-default relative flex h-56 w-56 items-center justify-center overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900 p-6 shadow-inner">
                {/* Info: (20260529 - Luphia) QR Code Graphic */}
                <div
                  className={`transition-opacity duration-300 ${isScanning ? "opacity-30" : "opacity-90"}`}
                >
                  <QrCode className="h-32 w-32 text-orange-500/80" />
                </div>

                {/* Info: (20260529 - Luphia) Scan Corner Borders */}
                <div className="absolute top-3 left-3 h-5 w-5 rounded-tl-md border-t-2 border-l-2 border-orange-500" />
                <div className="absolute top-3 right-3 h-5 w-5 rounded-tr-md border-t-2 border-r-2 border-orange-500" />
                <div className="absolute bottom-3 left-3 h-5 w-5 rounded-bl-md border-b-2 border-l-2 border-orange-500" />
                <div className="absolute right-3 bottom-3 h-5 w-5 rounded-br-md border-r-2 border-b-2 border-orange-500" />

                {/* Info: (20260529 - Luphia) Laser line sweeping up and down */}
                {isScanning && (
                  <div
                    className="absolute right-0 left-0 h-0.5 animate-pulse bg-gradient-to-r from-transparent via-green-400 to-transparent shadow-[0_0_8px_rgba(74,222,128,0.8)]"
                    style={{
                      animation: "scanMotion 1.5s ease-in-out infinite",
                      top: "10%",
                    }}
                  />
                )}
              </div>

              {/* Info: (20260529 - Luphia) Action Button */}
              {/* Info: (20260807 - Luphia) hover 不動底色，理由見 hero.tsx 的同款按鈕 */}
              <button
                onClick={startScan}
                disabled={isScanning}
                className="mt-6 inline-flex items-center gap-x-2 rounded-xl bg-orange-700 px-5 py-3 font-semibold text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:ring-2 hover:ring-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isScanning ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    {t("dpp_urban_mining.interactive.scanning")}
                  </span>
                ) : scanComplete ? (
                  <>
                    <RotateCcw className="h-4 w-4" />
                    {t("dpp_urban_mining.interactive.rescan")}
                  </>
                ) : (
                  <>
                    {t("dpp_urban_mining.interactive.scan_dpp")}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>

            {/* Info: (20260529 - Luphia) Right: Results / DPP Mockup Card */}
            <div className="flex w-full flex-col lg:w-3/5">
              {scanComplete ? (
                <div className="dark:border-border-default scale-100 rounded-2xl border border-slate-700/60 bg-slate-900/90 p-6 opacity-100 shadow-2xl transition-all duration-500">
                  {/* Info: (20260529 - Luphia) Status Banner */}
                  <div className="mb-4 flex w-fit items-center gap-2 rounded-full bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-400">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {t("dpp_urban_mining.interactive.scan_success")}
                  </div>

                  {/* Info: (20260529 - Luphia) Product Title */}
                  <h5 className="dark:border-border-default mb-4 border-b border-slate-800 pb-2 text-xl font-bold text-slate-100">
                    {t("dpp_urban_mining.interactive.product_identity")}
                  </h5>

                  {/* Info: (20260529 - Luphia) Meta info */}
                  <div className="mb-6 grid grid-cols-2 gap-4 rounded-xl bg-slate-950/40 p-4 text-sm">
                    <div>
                      <span className="block text-xs text-slate-400">
                        {t("dpp_urban_mining.interactive.category")}
                      </span>
                      <span className="font-semibold text-slate-200">
                        {t("dpp_urban_mining.interactive.category_val")}
                      </span>
                    </div>
                    <div>
                      <span className="block text-xs text-slate-400">
                        {t("dpp_urban_mining.interactive.manufacturer")}
                      </span>
                      <span className="font-semibold text-slate-200">
                        {t("dpp_urban_mining.interactive.manufacturer_val")}
                      </span>
                    </div>
                  </div>

                  {/* Info: (20260529 - Luphia) Carbon & Recyclability */}
                  <div className="mb-6 grid grid-cols-2 gap-6">
                    <div>
                      <div className="mb-1.5 flex items-center justify-between text-xs text-slate-400">
                        <span>
                          {t("dpp_urban_mining.interactive.carbon_footprint")}
                        </span>
                        <span className="font-bold text-orange-400">
                          0.85 kg CO2e/Wh
                        </span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400"
                          style={{ width: "65%" }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="mb-1.5 flex items-center justify-between text-xs text-slate-400">
                        <span>
                          {t("dpp_urban_mining.interactive.recyclability_rate")}
                        </span>
                        <span className="font-bold text-green-400">96.5%</span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400"
                          style={{ width: "96.5%" }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Info: (20260529 - Luphia) Composition / Urban Mining BOM */}
                  <div className="mb-6">
                    <h6 className="mb-3 text-xs font-bold tracking-wider text-slate-400 uppercase">
                      {t("dpp_urban_mining.interactive.materials_composition")}
                    </h6>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                      <div className="dark:border-border-default flex items-center justify-between border-b border-slate-800/40 py-1.5">
                        <span className="text-slate-300">
                          {t("dpp_urban_mining.interactive.material_gold")}
                        </span>
                        <span className="font-mono font-bold text-amber-400">
                          0.24 g
                        </span>
                      </div>
                      <div className="dark:border-border-default flex items-center justify-between border-b border-slate-800/40 py-1.5">
                        <span className="text-slate-300">
                          {t("dpp_urban_mining.interactive.material_copper")}
                        </span>
                        <span className="font-mono text-slate-200">32.0 g</span>
                      </div>
                      <div className="dark:border-border-default flex items-center justify-between border-b border-slate-800/40 py-1.5">
                        <span className="text-slate-300">
                          {t("dpp_urban_mining.interactive.material_lithium")}
                        </span>
                        <span className="font-mono text-green-400">8.6 g</span>
                      </div>
                      <div className="dark:border-border-default flex items-center justify-between border-b border-slate-800/40 py-1.5">
                        <span className="text-slate-300">
                          {t("dpp_urban_mining.interactive.material_cobalt")}
                        </span>
                        <span className="font-mono text-blue-400">2.4 g</span>
                      </div>
                    </div>
                  </div>

                  {/* Info: (20260529 - Luphia) AI Disassembly Safety Guide */}
                  <div className="flex gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 animate-pulse text-red-400" />
                    <div>
                      <h6 className="mb-1 text-xs font-bold text-red-400">
                        {t("dpp_urban_mining.interactive.disassembly_safety")}
                      </h6>
                      <p className="text-xs leading-relaxed text-slate-300">
                        {t("dpp_urban_mining.interactive.safety_warning")}
                      </p>
                    </div>
                  </div>
                </div>
              ) : isScanning ? (
                <div className="dark:border-border-default flex h-[350px] scale-100 flex-col justify-center rounded-2xl border border-slate-800/60 bg-slate-900/50 p-8 opacity-90 shadow-inner transition-all duration-300">
                  <div className="mb-6 flex items-center gap-2">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
                    <span className="text-sm font-bold text-slate-200">
                      {t("dpp_urban_mining.interactive.pipeline_title")}
                    </span>
                  </div>
                  <div className="space-y-4">
                    {/* Info: (20260529 - Luphia) Step 1 */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">
                        {t("dpp_urban_mining.interactive.step1_title")}
                      </span>
                      {scanStep === 1 ? (
                        <span className="animate-pulse font-mono text-orange-400">
                          {t("dpp_urban_mining.interactive.status_extracting")}
                        </span>
                      ) : (
                        <span className="font-mono text-green-400">
                          {t("dpp_urban_mining.interactive.status_resolved")}
                        </span>
                      )}
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                      <div
                        className={`h-full rounded-full bg-orange-500 transition-all duration-500 ${
                          scanStep === 1
                            ? "w-2/3 animate-pulse"
                            : "w-full bg-green-400"
                        }`}
                      />
                    </div>

                    {/* Info: (20260529 - Luphia) Step 2 */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">
                        {t("dpp_urban_mining.interactive.step2_title")}
                      </span>
                      {scanStep === 1 ? (
                        <span className="font-mono text-slate-600">
                          {t("dpp_urban_mining.interactive.status_waiting")}
                        </span>
                      ) : scanStep === 2 ? (
                        <span className="animate-pulse font-mono text-orange-400">
                          {t("dpp_urban_mining.interactive.status_extracting")}
                        </span>
                      ) : (
                        <span className="font-mono text-green-400">
                          {t("dpp_urban_mining.interactive.status_resolved")}
                        </span>
                      )}
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          scanStep === 1
                            ? "w-0 bg-slate-700"
                            : scanStep === 2
                              ? "w-2/3 animate-pulse bg-orange-500"
                              : "w-full bg-green-400"
                        }`}
                      />
                    </div>

                    {/* Info: (20260529 - Luphia) Step 3 */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">
                        {t("dpp_urban_mining.interactive.step3_title")}
                      </span>
                      {scanStep < 3 ? (
                        <span className="font-mono text-slate-600">
                          {t("dpp_urban_mining.interactive.status_waiting")}
                        </span>
                      ) : (
                        <span className="animate-pulse font-mono text-orange-400">
                          {t("dpp_urban_mining.interactive.status_extracting")}
                        </span>
                      )}
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          scanStep < 3
                            ? "w-0 bg-slate-700"
                            : "w-2/3 animate-pulse bg-orange-500"
                        }`}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="dark:border-border-default flex h-[350px] scale-98 flex-col items-center justify-center rounded-2xl border border-slate-800/60 bg-slate-900/40 p-8 text-center opacity-70 shadow-inner transition-all duration-500">
                  <QrCode className="mb-4 h-16 w-16 text-slate-600" />
                  <p className="max-w-sm text-sm text-slate-400">
                    {t("dpp_urban_mining.interactive.scan_placeholder")}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Info: (20260529 - Luphia) Embedded CSS for custom scanning laser line motion */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes scanMotion {
          0% {
            top: 10%;
          }
          50% {
            top: 90%;
          }
          100% {
            top: 10%;
          }
        }
      `,
        }}
      />
    </div>
  );
}
