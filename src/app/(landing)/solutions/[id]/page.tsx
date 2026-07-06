"use client";

import { use } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CheckCircle2,
  ShieldCheck,
  Cpu,
  Leaf,
  FileText,
  LineChart,
  BadgeCheck,
  ArrowLeft,
} from "lucide-react";
import { SOLUTION_PLAN_PRICE } from "@/constants/price";
import SolutionApplicationForm from "@/components/solutions/solution_application_form";
import { useTranslation } from "@/i18n/i18n_context";

interface IProps {
  params: Promise<{ id: string }>;
}

export default function SolutionDetailPage({ params }: IProps) {
  const { id } = use(params);

  if (id === "2025_1") {
    return <Solution2025p1 />;
  }

  if (id === "2026_1") {
    return <Solution2026p1 />;
  }

  return notFound();
}

function Solution2025p1() {
  const { t } = useTranslation();

  return (
    <div className="bg-white">
      {/* Info: (20260706 - Luphia) Back Button */}
      <div className="border-b border-emerald-900/50 bg-emerald-950">
        <div className="mx-auto max-w-7xl px-6 py-4 lg:px-8">
          <Link
            href="/solutions"
            className="inline-flex cursor-pointer items-center gap-x-2 text-sm font-semibold text-emerald-400 transition-colors hover:text-emerald-300"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("solutions.back_to_catalog")}
          </Link>
        </div>
      </div>

      {/* Info: (20260706 - Luphia) Hero */}
      <section className="relative bg-emerald-950 py-24 text-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:gap-x-16">
            <div className="lg:max-w-2xl">
              <div className="flex items-center gap-x-3 text-emerald-400">
                <Leaf className="h-6 w-6" />
                <span className="text-sm font-bold tracking-widest uppercase">
                  {t("solutions.year_2025_project")}
                </span>
              </div>
              <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-6xl">
                {t("solutions.title_2025_1")}
              </h1>
              <p className="mt-6 text-lg leading-8 text-emerald-100">
                {t("solutions.hero_desc_2025_1")}
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-x-6">
                  <span className="text-3xl font-bold text-white">
                    {t("solutions.self_pay")} NT$ 40,000
                  </span>
                  <span className="text-emerald-300 line-through">
                    {t("solutions.original_price")} NT${" "}
                    {SOLUTION_PLAN_PRICE.PRO.toLocaleString()}
                  </span>
                </div>
                <Link
                  href="#apply"
                  className="cursor-pointer rounded-full bg-emerald-600 px-8 py-3 text-sm font-bold text-white shadow-lg hover:bg-emerald-500"
                >
                  {t("solutions.apply_now")}
                </Link>
              </div>
            </div>
            <div className="mt-16 flex-1 lg:mt-0">
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl shadow-2xl">
                <Image
                  src="/images/solution_2025_1_carbon_neutrality.png"
                  alt="Carbon Neutrality"
                  fill
                  unoptimized
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Info: (20260706 - Luphia) Deliverables */}
      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              {t("solutions.deliverables_title")}
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              {t("solutions.deliverables_subtitle")}
            </p>
          </div>
          <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 sm:mt-20 lg:max-w-none lg:grid-cols-4">
            {[
              {
                title: t("solutions.iso_report"),
                desc: t("solutions.iso_report_desc"),
                icon: ShieldCheck,
              },
              {
                title: t("solutions.inventory"),
                desc: t("solutions.inventory_desc"),
                icon: FileText,
              },
              {
                title: t("solutions.health_check"),
                desc: t("solutions.health_check_desc"),
                icon: BadgeCheck,
              },
              {
                title: t("solutions.pathway"),
                desc: t("solutions.pathway_desc"),
                icon: LineChart,
              },
            ].map((item) => (
              <div
                key={item.title}
                className="flex flex-col rounded-3xl bg-gray-50 p-8 ring-1 ring-gray-200"
              >
                <item.icon className="h-10 w-10 text-emerald-600" />
                <h3 className="mt-6 text-lg font-bold text-gray-900">
                  {item.title}
                </h3>
                <p className="mt-4 text-sm leading-6 text-gray-600">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Info: (20260706 - Luphia) Form Section */}
      <section id="apply" className="bg-emerald-50 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 text-center lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight text-emerald-950 sm:text-4xl">
            {t("solutions.form_subtitle_2025")}
          </h2>
          <p className="mt-4 text-lg text-emerald-800">
            {t("solutions.form_desc_2025")}
          </p>
          <div className="mt-16">
            <SolutionApplicationForm
              planId="2025_1"
              planName={t("solutions.title_2025_1")}
              theme="emerald"
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function Solution2026p1() {
  const { t } = useTranslation();

  return (
    <div className="bg-white">
      {/* Info: (20260706 - Luphia) Back Button */}
      <div className="border-b border-blue-900/50 bg-blue-950">
        <div className="mx-auto max-w-7xl px-6 py-4 lg:px-8">
          <Link
            href="/solutions"
            className="inline-flex cursor-pointer items-center gap-x-2 text-sm font-semibold text-blue-400 transition-colors hover:text-blue-300"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("solutions.back_to_catalog")}
          </Link>
        </div>
      </div>

      {/* Info: (20260706 - Luphia) Hero */}
      <section className="relative bg-blue-950 py-24 text-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:gap-x-16">
            <div className="lg:max-w-2xl">
              <div className="flex items-center gap-x-3 text-blue-400">
                <Cpu className="h-6 w-6" />
                <span className="text-sm font-bold tracking-widest uppercase">
                  {t("solutions.year_2026_project")}
                </span>
              </div>
              <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-6xl">
                {t("solutions.title_2026_1")}
              </h1>
              <p className="mt-6 text-lg leading-8 text-blue-100">
                {t("solutions.hero_desc_2026_1")}
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-x-6">
                  <span className="text-3xl font-bold text-white">
                    {t("solutions.phase_1")} {t("solutions.self_pay")} NT$
                    10,000
                  </span>
                </div>
                <Link
                  href="#apply"
                  className="cursor-pointer rounded-full bg-blue-600 px-8 py-3 text-sm font-bold text-white shadow-lg hover:bg-blue-500"
                >
                  {t("solutions.apply_now")}
                </Link>
              </div>
            </div>
            <div className="mt-16 flex-1 lg:mt-0">
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl shadow-2xl">
                <Image
                  src="/images/solution_2026_1_digital_transformation.png"
                  alt="Digital Transformation"
                  fill
                  unoptimized
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Info: (20260706 - Luphia) Three-Phase Roadmap */}
      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              {t("solutions.roadmap_title")}
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              {t("solutions.roadmap_subtitle")}
            </p>
          </div>

          <div className="mx-auto mt-16 max-w-2xl lg:max-w-none">
            <div className="grid grid-cols-1 gap-y-12 lg:grid-cols-3 lg:gap-x-12">
              {/* Info: (20260706 - Luphia) Phase 1 */}
              <div className="relative flex flex-col rounded-3xl border-2 border-blue-100 p-8 shadow-sm">
                <div className="absolute -top-4 left-8 rounded-full bg-blue-600 px-4 py-1 text-xs font-bold text-white">
                  {t("solutions.phase_1").toUpperCase()}
                </div>
                <h3 className="text-xl font-bold text-gray-900">
                  {t("solutions.phase_1_title")}
                </h3>
                <div className="mt-4 flex items-baseline gap-x-2">
                  <span className="text-2xl font-bold text-blue-600">
                    $ 10,000
                  </span>
                  <span className="text-sm text-gray-500">
                    {t("solutions.self_pay")}
                  </span>
                </div>
                <p className="mt-6 text-sm leading-6 text-gray-600">
                  {t("solutions.phase_1_desc")}
                </p>
                <ul className="mt-8 space-y-3">
                  <li className="flex gap-x-3 text-xs font-medium text-gray-700">
                    <CheckCircle2 className="h-4 w-4 text-blue-500" />{" "}
                    {t("solutions.iso_report")}
                  </li>
                  <li className="flex gap-x-3 text-xs font-medium text-gray-700">
                    <CheckCircle2 className="h-4 w-4 text-blue-500" />{" "}
                    {t("solutions.health_check")}
                  </li>
                </ul>
              </div>

              {/* Info: (20260706 - Luphia) Phase 2 */}
              <div className="relative flex flex-col rounded-3xl bg-blue-50 p-8 shadow-md ring-2 ring-blue-600">
                <div className="absolute -top-4 left-8 rounded-full bg-blue-600 px-4 py-1 text-xs font-bold text-white">
                  {t("solutions.phase_2").toUpperCase()}
                </div>
                <h3 className="text-xl font-bold text-gray-900">
                  {t("solutions.phase_2_title")}
                </h3>
                <div className="mt-4 flex items-baseline gap-x-2">
                  <span className="text-2xl font-bold text-blue-600">
                    $ 100,000
                  </span>
                  <span className="text-sm font-medium text-blue-700">
                    {t("solutions.government_subsidy")}
                  </span>
                </div>
                <p className="mt-6 text-sm leading-6 text-gray-600">
                  {t("solutions.phase_2_desc")}
                </p>
                <ul className="mt-8 space-y-3">
                  <li className="flex gap-x-3 text-xs font-medium text-gray-700">
                    <CheckCircle2 className="h-4 w-4 text-blue-500" />{" "}
                    {t("solutions.ai_deployment")}
                  </li>
                  <li className="flex gap-x-3 text-xs font-medium text-gray-700">
                    <CheckCircle2 className="h-4 w-4 text-blue-500" />{" "}
                    {t("solutions.auto_accounting")}
                  </li>
                </ul>
              </div>

              {/* Info: (20260706 - Luphia) Phase 3 */}
              <div className="relative flex flex-col rounded-3xl border-2 border-blue-100 p-8 shadow-sm">
                <div className="absolute -top-4 left-8 rounded-full bg-blue-600 px-4 py-1 text-xs font-bold text-white">
                  {t("solutions.phase_3").toUpperCase()}
                </div>
                <h3 className="text-xl font-bold text-gray-900">
                  {t("solutions.phase_3_title")}
                </h3>
                <div className="mt-4 flex items-baseline gap-x-2">
                  <span className="text-2xl font-bold text-blue-600">
                    UP TO $ 5,000,000
                  </span>
                  <span className="text-sm text-gray-500">
                    {t("solutions.subsidy_up_to")} 50%
                  </span>
                </div>
                <p className="mt-6 text-sm leading-6 text-gray-600">
                  {t("solutions.phase_3_desc")}
                </p>
                <ul className="mt-8 space-y-3">
                  <li className="flex gap-x-3 text-xs font-medium text-gray-700">
                    <CheckCircle2 className="h-4 w-4 text-blue-500" />{" "}
                    {t("solutions.ai_investment_analysis")}
                  </li>
                  <li className="flex gap-x-3 text-xs font-medium text-gray-700">
                    <CheckCircle2 className="h-4 w-4 text-blue-500" />{" "}
                    {t("solutions.subsidy_agency")}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Info: (20260706 - Luphia) Form Section */}
      <section id="apply" className="bg-blue-50 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 text-center lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight text-blue-950 sm:text-4xl">
            {t("solutions.form_subtitle_2026")}
          </h2>
          <p className="mt-4 text-lg text-blue-800">
            {t("solutions.form_desc_2026")}
          </p>
          <div className="mt-16">
            <SolutionApplicationForm
              planId="2026_1"
              planName={t("solutions.title_2026_1")}
              theme="blue"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
