"use client";

import Image from "next/image";
import Link from "next/link";
import { Check, Cpu, Leaf, ChevronRight } from "lucide-react";
import SolutionApplicationForm from "@/components/solutions/solution_application_form";
import { useTranslation } from "@/i18n/i18n_context";

export default function SolutionsCatalogPage() {
  const { t } = useTranslation();

  const packages = [
    {
      id: "2026_1",
      year: "2026",
      title: t("solutions.title_2026_1"),
      desc: t("solutions.desc_2026_1"),
      image: "/images/solution_2026_1_digital_transformation.png",
      status: t("solutions.status_open"),
      highlight: t("solutions.highlight_2026_1"),
      featureTitle: t("solutions.roadmap_title"),
      features: [
        t("solutions.phase_1_title"),
        t("solutions.phase_2_title"),
        t("solutions.phase_3_title"),
      ],
      theme: "blue",
      icon: Cpu,
    },
    {
      id: "2025_1",
      year: "2025",
      title: t("solutions.title_2025_1"),
      desc: t("solutions.desc_2025_1"),
      image: "/images/solution_2025_1_carbon_neutrality.png",
      status: t("solutions.status_open"),
      highlight: t("solutions.highlight_2025_1"),
      featureTitle: t("solutions.deliverables_title"),
      features: [
        t("solutions.iso_report"),
        t("solutions.inventory"),
        t("solutions.health_check"),
        t("solutions.pathway"),
      ],
      theme: "emerald",
      icon: Leaf,
    },
  ];

  return (
    <div className="bg-white">
      {/* Info: (20260706 - Luphia) Hero Section */}
      <section className="relative overflow-hidden bg-gray-950 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:mx-0">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
              {t("solutions.catalog_title")}
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-300">
              {t("solutions.catalog_desc")}
            </p>
          </div>
        </div>
        <div className="absolute top-0 right-0 -z-10 h-full w-full opacity-20">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/30 to-blue-500/30 blur-3xl" />
        </div>
      </section>

      {/* Info: (20260706 - Luphia) Solutions List */}
      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className="group relative flex cursor-pointer flex-col overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-gray-200 transition-all hover:shadow-2xl"
              >
                <div className="relative w-full overflow-hidden rounded-2xl">
                  <Image
                    src={pkg.image}
                    alt={pkg.title}
                    width={800}
                    height={600}
                    unoptimized
                    className="aspect-[16/9] w-full object-cover transition-transform duration-500 hover:scale-110"
                  />
                  <div className="absolute top-4 left-4 flex gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ring-1 ring-inset ${
                        pkg.theme === "blue"
                          ? "bg-blue-50 text-blue-700 ring-blue-700/10"
                          : "bg-emerald-50 text-emerald-700 ring-emerald-700/10"
                      }`}
                    >
                      {pkg.status}
                    </span>
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-6 lg:p-8">
                  <div className="flex items-center gap-x-4 text-xs">
                    <span
                      className={`text-sm font-bold ${
                        pkg.theme === "blue"
                          ? "text-blue-600"
                          : "text-emerald-600"
                      }`}
                    >
                      {pkg.highlight}
                    </span>
                  </div>
                  <div className="group relative">
                    <h3 className="mt-3 text-2xl leading-8 font-bold text-gray-900 group-hover:text-gray-600">
                      <Link href={`/solutions/${pkg.id}`}>
                        <span className="absolute inset-0" />
                        {pkg.title}
                      </Link>
                    </h3>
                    <p className="mt-5 line-clamp-3 text-sm leading-6 text-gray-600">
                      {pkg.desc}
                    </p>
                  </div>

                  {/* Info: (20260706 - Luphia) Feature List Section */}
                  <div className="mt-8 flex-1">
                    <h4 className="mb-4 flex items-center gap-2 text-sm font-bold text-gray-900">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${pkg.theme === "blue" ? "bg-blue-600" : "bg-emerald-600"}`}
                      />
                      {pkg.featureTitle}
                    </h4>
                    <ul className="space-y-3 pb-6">
                      {pkg.features.map((feature) => (
                        <li key={feature} className="flex gap-x-3 text-sm">
                          <Check
                            className={`h-5 w-5 flex-none ${
                              pkg.theme === "blue"
                                ? "text-blue-600"
                                : "text-emerald-600"
                            }`}
                          />
                          <span className="text-gray-600">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-auto flex items-center justify-between border-t border-gray-100 pt-6">
                    <div className="flex items-center gap-x-4">
                      <div
                        className={`rounded-full p-2 ${
                          pkg.theme === "blue" ? "bg-blue-50" : "bg-emerald-50"
                        }`}
                      >
                        <pkg.icon
                          className={`h-6 w-6 ${
                            pkg.theme === "blue"
                              ? "text-blue-600"
                              : "text-emerald-600"
                          }`}
                        />
                      </div>
                      <span className="text-sm font-semibold text-gray-900">
                        {t("solutions.plan_id_label")}: {pkg.id}
                      </span>
                    </div>
                    <Link
                      href={`/solutions/${pkg.id}`}
                      className="flex cursor-pointer items-center gap-x-2 text-sm font-bold text-orange-600 hover:text-orange-500"
                    >
                      {t("solutions.view_details")}{" "}
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Info: (20260706 - Luphia) Global CTA Form */}
      <section id="apply" className="bg-gray-50 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              {t("solutions.not_sure_title")}
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              {t("solutions.not_sure_desc")}
            </p>
          </div>
          <div className="mt-16">
            <SolutionApplicationForm
              planId="general"
              planName={t("solutions.general_consult")}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
