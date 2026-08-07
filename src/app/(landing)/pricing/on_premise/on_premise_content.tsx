"use client";

import { useState } from "react";
import Image from "next/image";
import { Minus, Plus, Lock, Check } from "lucide-react";
import { ENTERPRISE_PLAN_PRICE } from "@/constants/price";
import { MODULES } from "@/constants/modules";
import { usePricing } from "@/contexts/pricing_context";
import { useTranslation } from "@/i18n/i18n_context";

export default function OnPremiseContent() {
  const { onSelectCustomPlan } = usePricing();
  const { t } = useTranslation();
  const [selectedMachine, setSelectedMachine] =
    useState<keyof typeof ENTERPRISE_PLAN_PRICE.MACHINE>("X86_5060TI");
  const [userCount, setUserCount] = useState(1);
  const [updateYears, setUpdateYears] = useState(0);
  const [selectedModules, setSelectedModules] = useState<string[]>(
    MODULES.filter((m) => m.basic).map((m) => m.key),
  );

  const totalPrice =
    ENTERPRISE_PLAN_PRICE.MACHINE[selectedMachine] +
    userCount * ENTERPRISE_PLAN_PRICE.USER +
    updateYears * ENTERPRISE_PLAN_PRICE.UPDATE +
    selectedModules.length * ENTERPRISE_PLAN_PRICE.MODULE;

  const toggleModule = (moduleKey: string) => {
    const targetModule = MODULES.find((m) => m.key === moduleKey);
    if (targetModule?.basic) return;

    setSelectedModules((prev) =>
      prev.includes(moduleKey)
        ? prev.filter((k) => k !== moduleKey)
        : [...prev, moduleKey],
    );
  };

  return (
    <div className="mx-auto max-w-7xl px-6 pt-10 pb-24 lg:px-8">
      {/* Info: (20260807 - Luphia) 本卡為「刻意深色」的展示設計，兩種主題下都應維持深底。
          gray/slate 色階會被主題過渡層整組翻轉（globals.css 的中性色盤反轉，即 variant trap：
          高色階當背景違反位置性假設），深色模式下 gray-900 底會翻成近白、text-white 變白底白字。
          故本檔一律使用不參與翻轉的 zinc 色盤，嚴禁改回 gray/slate。 */}
      <div className="rounded-3xl bg-gradient-to-b from-zinc-900 to-zinc-800 p-1 shadow-2xl ring-1 shadow-orange-900/20 ring-white/10">
        <div className="rounded-[22px] bg-zinc-900/50 px-6 py-8 backdrop-blur-xl sm:px-12 lg:px-12 lg:py-12">
          <div className="mx-auto flex max-w-2xl flex-col gap-16 lg:mx-0 lg:max-w-none lg:flex-row lg:items-start">
            <div className="w-full flex-auto">
              <ul className="mt-8 grid grid-cols-1 gap-x-8 gap-y-4 text-base leading-7 text-zinc-300 sm:grid-cols-2">
                {t<string[]>("pricing.ai_adoption.features").map(
                  (feature, index) => (
                    <li key={index} className="flex items-center gap-x-3">
                      <div className="flex-none rounded-full bg-orange-500/10 p-1">
                        <Check
                          className="h-5 w-5 text-orange-400"
                          aria-hidden="true"
                        />
                      </div>
                      {feature}
                    </li>
                  ),
                )}
              </ul>

              <div className="mt-12 border-t border-white/10 pt-10">
                <div className="space-y-10">
                  <div className="flex flex-col justify-between gap-6 border-b border-white/5 pb-8 sm:flex-row sm:items-center">
                    <div>
                      <span className="block text-lg font-medium text-white">
                        {selectedMachine === "X86_5060TI"
                          ? t("pricing.ai_adoption.machine_x86")
                          : t("pricing.ai_adoption.machine_gx10")}
                      </span>
                      <span className="mt-1 block text-sm font-medium text-orange-400/80">
                        {selectedMachine === "X86_5060TI"
                          ? t("pricing.ai_adoption.capacity_x86")
                          : t("pricing.ai_adoption.capacity_gx10")}
                      </span>
                      <span className="mt-1 block text-sm text-zinc-400">
                        {t("pricing.ai_adoption.add_module_price", {
                          price:
                            ENTERPRISE_PLAN_PRICE.MACHINE[
                              selectedMachine
                            ].toLocaleString(),
                        })}
                      </span>
                    </div>
                    <div className="flex w-full items-center justify-between gap-x-4 rounded-xl bg-black/20 p-1.5 ring-1 ring-white/10 sm:w-auto">
                      <button
                        onClick={() => setSelectedMachine("X86_5060TI")}
                        className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                          selectedMachine === "X86_5060TI"
                            ? "bg-orange-600 text-white shadow-lg"
                            : "text-zinc-400 hover:text-white"
                        }`}
                      >
                        X86
                      </button>
                      <button
                        onClick={() => setSelectedMachine("ASUS_ASCENT_GX10")}
                        className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                          selectedMachine === "ASUS_ASCENT_GX10"
                            ? "bg-orange-600 text-white shadow-lg"
                            : "text-zinc-400 hover:text-white"
                        }`}
                      >
                        GX10
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col justify-between gap-6 border-b border-white/5 pb-8 sm:flex-row sm:items-center">
                    <div>
                      <span className="block text-lg font-medium text-white">
                        {t("pricing.ai_adoption.user_count")}
                      </span>
                      <span className="mt-1 block text-sm text-zinc-400">
                        {t("pricing.ai_adoption.add_user_price", {
                          price: (
                            userCount * ENTERPRISE_PLAN_PRICE.USER
                          ).toLocaleString(),
                        })}
                      </span>
                    </div>
                    <div className="flex w-full items-center justify-between gap-x-4 rounded-xl bg-black/20 p-1.5 ring-1 ring-white/10 sm:w-auto">
                      <button
                        onClick={() =>
                          setUserCount((prev) => Math.max(1, prev - 1))
                        }
                        className="rounded-lg p-2 text-white transition-all hover:scale-105 hover:bg-white/10 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
                        disabled={userCount <= 1}
                      >
                        <Minus className="h-5 w-5" />
                      </button>
                      <span className="w-12 text-center text-lg font-bold text-white tabular-nums">
                        {userCount}
                      </span>
                      <button
                        onClick={() => setUserCount((prev) => prev + 1)}
                        className="rounded-lg p-2 text-white transition-all hover:scale-105 hover:bg-white/10 active:scale-95"
                      >
                        <Plus className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col justify-between gap-6 border-b border-white/5 pb-8 sm:flex-row sm:items-center">
                    <div>
                      <span className="block text-lg font-medium text-white">
                        {t("pricing.ai_adoption.software_update")}
                      </span>
                      <span className="mt-1 block text-sm text-zinc-400">
                        {t("pricing.ai_adoption.software_update_price", {
                          price: (
                            updateYears * ENTERPRISE_PLAN_PRICE.UPDATE
                          ).toLocaleString(),
                        })}
                      </span>
                    </div>
                    <div className="flex w-full items-center justify-between gap-x-4 rounded-xl bg-black/20 p-1.5 ring-1 ring-white/10 sm:w-auto">
                      <button
                        onClick={() =>
                          setUpdateYears((prev) => Math.max(0, prev - 1))
                        }
                        className="rounded-lg p-2 text-white transition-all hover:scale-105 hover:bg-white/10 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
                        disabled={updateYears <= 0}
                      >
                        <Minus className="h-5 w-5" />
                      </button>
                      <span className="w-12 text-center text-lg font-bold text-white tabular-nums">
                        {updateYears}
                      </span>
                      <button
                        onClick={() =>
                          setUpdateYears((prev) => Math.min(3, prev + 1))
                        }
                        className="rounded-lg p-2 text-white transition-all hover:scale-105 hover:bg-white/10 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
                        disabled={updateYears >= 3}
                      >
                        <Plus className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="mb-8 flex items-center justify-between gap-x-4">
                      <div>
                        <span className="block text-lg font-medium text-white">
                          {t("pricing.ai_adoption.add_module")}
                        </span>
                        <span className="mt-1 block text-sm text-zinc-400">
                          {t("pricing.ai_adoption.add_module_price", {
                            price: (
                              selectedModules.length *
                              ENTERPRISE_PLAN_PRICE.MODULE
                            ).toLocaleString(),
                          })}
                        </span>
                      </div>
                      <span className="inline-flex items-center rounded-full bg-orange-400/10 px-3 py-1 text-sm font-medium text-orange-400 ring-1 ring-orange-400/20 ring-inset">
                        {selectedModules.length}{" "}
                        {t("pricing.ai_adoption.selected")}
                      </span>
                    </div>
                    <ul className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
                      {MODULES.map((mod) => {
                        const isSelected = selectedModules.includes(mod.key);
                        const isMandatory = mod.basic;

                        return (
                          <li key={mod.key}>
                            <button
                              type="button"
                              onClick={() =>
                                !isMandatory && toggleModule(mod.key)
                              }
                              disabled={isMandatory}
                              className={`group relative flex h-full w-full flex-row items-center gap-3 overflow-hidden rounded-lg px-3 py-2.5 text-left transition-all duration-200 ${
                                isSelected
                                  ? "bg-gradient-to-br from-orange-600 to-orange-700 text-white shadow-lg ring-1 shadow-orange-900/20 ring-orange-500"
                                  : "bg-white/5 text-zinc-400 ring-1 ring-white/10 hover:bg-white/10 hover:text-zinc-200 hover:ring-white/20"
                              } ${isMandatory ? "cursor-not-allowed" : "cursor-pointer active:scale-[0.98]"} `}
                            >
                              <div
                                className={`flex-none rounded-md p-1.5 transition-colors ${isSelected ? "bg-white/20 text-white" : "bg-white/5 text-zinc-400 group-hover:text-zinc-300"} `}
                              >
                                <mod.icon className="h-4 w-4" />
                              </div>
                              <span className="truncate text-sm leading-tight font-medium">
                                {t(`features.items.${mod.key}.title`)}
                              </span>

                              {isMandatory && (
                                <div className="ml-auto text-white/40">
                                  <Lock className="h-3.5 w-3.5" />
                                </div>
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex w-full flex-none flex-col gap-6 lg:sticky lg:top-24 lg:w-96">
              <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-zinc-800 object-cover shadow-2xl ring-1 ring-white/10">
                <Image
                  src="/images/hardware_lease.webp"
                  alt="Hardware Lease"
                  fill
                  priority
                  unoptimized
                  sizes="(max-width: 1024px) 100vw, 384px"
                  className="object-cover opacity-80 grayscale-[0.2]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/40 to-transparent" />
                <div className="absolute right-0 bottom-0 left-0 p-8">
                  <p className="mb-2 text-sm font-medium text-orange-400">
                    On-Premise Solution
                  </p>
                  <h4 className="mb-2 text-2xl font-bold text-white">
                    {t("pricing.ai_adoption.local_node")}
                  </h4>
                  <p className="text-sm leading-relaxed text-zinc-300">
                    {t("pricing.ai_adoption.local_node_tooltip")}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl bg-white/5 p-6 ring-1 ring-white/10 backdrop-blur-sm">
                <div className="flex flex-col gap-y-2">
                  <span className="text-base leading-7 font-semibold text-zinc-300">
                    {t("pricing.ai_adoption.total_estimated")}
                  </span>
                  <div className="flex items-baseline gap-x-2">
                    <h3 className="text-3xl font-bold tracking-tight text-white">
                      {t("pricing.currency_prefix")}
                      {totalPrice.toLocaleString()}
                    </h3>
                  </div>
                </div>

                <div className="mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      const details = [
                        selectedMachine === "X86_5060TI"
                          ? t("pricing.ai_adoption.machine_x86")
                          : t("pricing.ai_adoption.machine_gx10"),
                        `${t("pricing.ai_adoption.user_count")}: ${userCount}`,
                        ...(updateYears > 0
                          ? [
                              `${t(
                                "pricing.ai_adoption.software_update",
                              )}: ${updateYears} 年`,
                            ]
                          : []),
                        ...selectedModules.map((modKey) =>
                          t(`features.items.${modKey}.title`),
                        ),
                      ];
                      onSelectCustomPlan(
                        "on_premise",
                        t("pricing.ai_adoption.title"),
                        totalPrice,
                        undefined,
                        details,
                      );
                    }}
                    className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-orange-900/20 transition-all duration-300 hover:scale-[1.02] hover:from-orange-400 hover:to-orange-500 hover:shadow-orange-900/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      {t("pricing.select_plan")}
                    </span>
                    <div className="absolute inset-0 -translate-x-full bg-white/20 transition-transform duration-300 group-hover:translate-x-0" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
