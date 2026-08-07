"use client";

import { useTranslation } from "@/i18n/i18n_context";
import {
  ReceiptText,
  Cpu,
  FileBarChart,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export default function SimulationWorkflow() {
  const { t } = useTranslation();

  return (
    // Info: (20260807 - Luphia) dark:bg-* 的 `!` 見 globals.css「刻意深色的表面」區塊
    <section className="dark:bg-surface-raised! relative overflow-hidden bg-slate-900 py-24 sm:py-32">
      {/* Info: (20260611 - Luphia) Background Gradients */}
      <div className="absolute inset-y-0 left-1/2 -z-10 w-[200%] -translate-x-1/2 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(249,115,22,0.1),transparent_40%)]" />
      </div>

      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-x-2 rounded-full bg-orange-500/10 px-4 py-1.5 text-sm font-semibold text-orange-400 ring-1 ring-orange-500/20">
            <Sparkles className="h-4 w-4" />
            {t("simulation_workflow.title")}
          </div>
          <h2 className="bg-gradient-to-r from-orange-400 via-amber-200 to-green-400 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent sm:text-5xl">
            {t("simulation_workflow.subtitle")}
          </h2>
          <p className="mt-6 text-lg leading-8 text-slate-300">
            {t("simulation_workflow.description")}
          </p>
        </div>

        <div className="mx-auto mt-20 max-w-5xl">
          <div className="relative grid grid-cols-1 gap-12 lg:grid-cols-3">
            {/* Info: (20260611 - Luphia) Connecting lines for desktop */}
            <div className="absolute top-12 left-[16%] hidden w-[68%] border-t-2 border-dashed border-slate-700/60 lg:block">
              {/* Info: (20260611 - Luphia) Animated glowing dot moving across the line */}
              <div className="absolute -top-1.5 left-0 h-3 w-3 animate-[scanMotion_3s_ease-in-out_infinite] rounded-full bg-orange-400 shadow-[0_0_10px_rgba(249,115,22,0.8)]" />
            </div>

            {/* Info: (20260611 - Luphia) Step 1 */}
            <div className="group relative z-10 flex flex-col items-center text-center">
              <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-slate-800/40 ring-1 ring-slate-700/50 backdrop-blur-md transition-all duration-300 group-hover:-translate-y-2 group-hover:bg-slate-800/60 group-hover:shadow-[0_0_30px_rgba(249,115,22,0.2)] group-hover:ring-orange-500/50">
                <ReceiptText className="h-10 w-10 text-orange-400 transition-transform duration-300 group-hover:scale-110" />
              </div>
              <div className="mb-3 flex items-center justify-center rounded-full bg-slate-800/80 px-3 py-1 text-xs font-bold text-slate-300 ring-1 ring-slate-700/60">
                {t("simulation_workflow.step1_title")}
              </div>
              <p className="text-sm leading-relaxed text-slate-400">
                {t("simulation_workflow.step1_desc")}
              </p>
              <ArrowRight className="mt-8 h-6 w-6 text-slate-600 lg:hidden" />
            </div>

            {/* Info: (20260611 - Luphia) Step 2 */}
            <div className="group relative z-10 flex flex-col items-center text-center">
              <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-slate-800/40 ring-1 ring-slate-700/50 backdrop-blur-md transition-all duration-300 group-hover:-translate-y-2 group-hover:bg-slate-800/60 group-hover:shadow-[0_0_30px_rgba(34,197,94,0.2)] group-hover:ring-green-500/50">
                <Cpu className="h-10 w-10 text-green-400 transition-transform duration-300 group-hover:scale-110" />
              </div>
              <div className="mb-3 flex items-center justify-center rounded-full bg-slate-800/80 px-3 py-1 text-xs font-bold text-slate-300 ring-1 ring-slate-700/60">
                {t("simulation_workflow.step2_title")}
              </div>
              <p className="text-sm leading-relaxed text-slate-400">
                {t("simulation_workflow.step2_desc")}
              </p>
              <ArrowRight className="mt-8 h-6 w-6 text-slate-600 lg:hidden" />
            </div>

            {/* Info: (20260611 - Luphia) Step 3 */}
            <div className="group relative z-10 flex flex-col items-center text-center">
              <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-slate-800/40 ring-1 ring-slate-700/50 backdrop-blur-md transition-all duration-300 group-hover:-translate-y-2 group-hover:bg-slate-800/60 group-hover:shadow-[0_0_30px_rgba(59,130,246,0.2)] group-hover:ring-blue-500/50">
                <FileBarChart className="h-10 w-10 text-blue-400 transition-transform duration-300 group-hover:scale-110" />
              </div>
              <div className="mb-3 flex items-center justify-center rounded-full bg-slate-800/80 px-3 py-1 text-xs font-bold text-slate-300 ring-1 ring-slate-700/60">
                {t("simulation_workflow.step3_title")}
              </div>
              <p className="text-sm leading-relaxed text-slate-400">
                {t("simulation_workflow.step3_desc")}
              </p>
            </div>
          </div>
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes scanMotion {
          0% { left: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { left: 100%; opacity: 0; }
        }
      `,
        }}
      />
    </section>
  );
}
