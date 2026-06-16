"use client";

import { useState, useEffect } from "react";

import { useTranslation } from "@/i18n/i18n_context";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { request } from "@/lib/utils/request";
import { IApiResponse } from "@/lib/utils/response";
import {
  ShieldCheck,
  Loader2,
  FileText,
  AlertCircle,
  Activity,
  Settings,
  Truck,
  Scale,
  Compass,
} from "lucide-react";

interface IRecycledMaterial {
  material: string;
  preConsumerShare: number;
  postConsumerShare: number;
  primaryMaterial: number;
}

interface IChemicalElement {
  element: string;
  percentage: number;
}

interface IMaterialComposition {
  materialName: string;
  elements: IChemicalElement[];
}

interface IProductInfo {
  productId?: string;
  name?: string;
  modelNumber?: string;
  category?: string;
  cnCode?: string;
  manufacturedDate?: string;
  facility?: string;
  facilityUNLOCODE?: string;
  weightKg?: number;
}

interface ICarbonFootprint {
  total_tCO2e?: number;
  methodology?: string;
  breakdown?: {
    precursorsEmissions?: number;
    directEmissionsScope1?: number;
    indirectEmissionsScope2?: number;
  };
}

interface ICircularity {
  recycledContentShare?: IRecycledMaterial[];
}

interface ICompliance {
  rohsCompliant?: boolean;
  pfasFree?: boolean;
  iatf16949Compliant?: boolean;
  iatfCertificateId?: string;
  declarationDocument?: string;
}

interface ISocialImpact {
  ethicalSourcing?: boolean;
  laborStandardCompliant?: boolean;
}

interface IRepairability {
  physicalLifespanYears?: number;
  repairability?: string;
  disposal?: string;
}

interface ILogistics {
  companyName?: string;
  address?: string;
  eori?: string;
}

interface ICriticalRawMaterials {
  criticalRawMaterials?: string[];
}

interface IMaterialCompositionData {
  materialComposition?: IMaterialComposition[];
}

interface IDppPublicPassport {
  sku: {
    id: string;
    gtin: string;
    name: string;
    status: string;
    modulesData: Record<
      string,
      {
        extracted: boolean;
        data?: Record<string, unknown>;
      }
    > | null;
  };
  batch: {
    id: string;
    skuId: string;
    batchNumber: string;
    serialRange: string | null;
    manufactureDate: string;
    facilitySite: string;
    dynamicOverrides: Record<string, unknown> | null;
    publicUrl: string;
  };
}

const fetcher = (url: string) =>
  request<IApiResponse<IDppPublicPassport>>(url, { method: "GET" });

export default function PublicBatchPassportPage() {
  const { t } = useTranslation();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);
  const router = useRouter();
  const params = useParams();
  const skuId = params.sku_id as string;
  const batchNumber = params.batch_number as string;

  const {
    data: response,
    error,
    isLoading,
  } = useSWR(`/api/v1/dpp/sku/${skuId}/batch/${batchNumber}`, fetcher);

  const passport = response?.payload || null;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-600" />
          <p className="mt-4 text-sm font-semibold text-slate-600">
            {t("common.loading")}
          </p>
        </div>
      </div>
    );
  }

  if (error || !passport) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md rounded-3xl border border-red-100 bg-white p-8 text-center shadow-lg">
          <AlertCircle className="mx-auto h-16 w-16 text-red-500" />
          <h2 className="mt-6 text-2xl font-bold text-slate-900">
            Passport Not Found
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            We couldn&apos;t retrieve the Digital Product Passport for this
            product batch. It may not have been created yet, or the link might
            be incorrect.
          </p>
          <button
            onClick={() => router.push("/digital_product_passport")}
            className="mt-8 inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const { sku, batch } = passport;
  const modules = sku.modulesData || {};

  // Info: (20260612 - Tzuhan) Extract module data safely
  const productInfo = (modules["1_product_info"]?.data || {}) as IProductInfo;
  const envImpact = (modules["2_environmental_impact"]?.data ||
    {}) as ICarbonFootprint;
  const carbonBreakdown = envImpact.breakdown || {};
  const circularity = (modules["3_circularity"]?.data || {}) as ICircularity;
  const recycledContentShare = circularity.recycledContentShare || [];
  const compliance = (modules["4_compliance"]?.data || {}) as ICompliance;
  const socialImpact = (modules["5_social_impact"]?.data ||
    {}) as ISocialImpact;
  const repairability = (modules["6_repairability"]?.data ||
    {}) as IRepairability;
  const logistics = (modules["7_logistics"]?.data || {}) as ILogistics;
  const rawMaterials = (modules["8_critical_raw_materials"]?.data ||
    {}) as ICriticalRawMaterials;
  const criticalRawMaterials = rawMaterials.criticalRawMaterials || [];
  const compositionData = (modules["9_material_composition"]?.data ||
    {}) as IMaterialCompositionData;
  const materialComposition = compositionData.materialComposition || [];

  // Info: (20260612 - Tzuhan) Carbon footprint calculations
  const totalCO2e = Number(envImpact.total_tCO2e || 0);
  const precursors = Number(carbonBreakdown.precursorsEmissions || 0);
  const scope1 = Number(carbonBreakdown.directEmissionsScope1 || 0);
  const scope2 = Number(carbonBreakdown.indirectEmissionsScope2 || 0);

  const totalBreakdown = precursors + scope1 + scope2;
  const prePct = totalBreakdown > 0 ? (precursors / totalBreakdown) * 100 : 0;
  const s1Pct = totalBreakdown > 0 ? (scope1 / totalBreakdown) * 100 : 0;
  const s2Pct = totalBreakdown > 0 ? (scope2 / totalBreakdown) * 100 : 0;

  const conicBg = `conic-gradient(
    #f97316 0% ${prePct.toFixed(2)}%, 
    #3b82f6 ${prePct.toFixed(2)}% ${(prePct + s1Pct).toFixed(2)}%, 
    #10b981 ${(prePct + s1Pct).toFixed(2)}% 100%
  )`;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 antialiased">
      {/* Info: (20260612 - Tzuhan) Premium Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-slate-800 bg-[#0f172a] px-6 py-4 text-white shadow-md">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold tracking-wider text-orange-500">
            iSunFA
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-sm font-medium text-slate-300">
            陽光智能碳會計
          </span>
        </div>
        <div className="rounded-full border border-slate-700 bg-slate-800/50 px-3.5 py-1 text-xs font-semibold text-blue-400">
          Public Passport
        </div>
      </header>

      {/* Info: (20260612 - Tzuhan) Main Container */}
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-12">
        {/* Info: (20260612 - Tzuhan) Verification Status Banner */}
        <div className="mb-8 flex flex-col justify-between gap-4 rounded-3xl border border-emerald-100 bg-emerald-50/50 p-6 shadow-sm sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2 text-emerald-800">
              <ShieldCheck className="h-6 w-6 text-emerald-600" />
              <h1 className="text-xl font-bold">Digital Product Passport</h1>
            </div>
            <p className="mt-1 font-mono text-xs text-slate-500">
              Passport ID: {skuId}-{batchNumber}
            </p>
          </div>
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-extrabold tracking-wider text-white uppercase shadow-sm">
              ✔ VERIFIED BY TÜV Rheinland
            </span>
          </div>
        </div>

        {/* Info: (20260612 - Tzuhan) Info Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Info: (20260612 - Tzuhan) Card 1: General Product Information */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
            <h2 className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 text-xs font-bold tracking-wider text-slate-500 uppercase">
              <FileText className="h-4 w-4 text-blue-500" />
              General Information
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Product Name</span>
                <span className="font-bold text-slate-900">{sku.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Model Number</span>
                <span className="font-semibold text-slate-900">
                  {String(productInfo.modelNumber || "N/A")}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">GTIN</span>
                <span className="font-mono text-slate-900">{sku.gtin}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">CN Code</span>
                <span className="font-semibold text-slate-900">
                  {String(productInfo.cnCode || "7318.15")}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Category</span>
                <span className="text-slate-950">
                  {String(productInfo.category || "N/A")}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Weight</span>
                <span className="font-semibold text-slate-900">
                  {productInfo.weightKg
                    ? `${Number(productInfo.weightKg)} kg`
                    : "N/A"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Facility</span>
                <span className="text-right text-slate-900">
                  {String(productInfo.facility || batch.facilitySite)}
                  {productInfo.facilityUNLOCODE && (
                    <span className="ml-1 text-xs text-slate-500">
                      ({String(productInfo.facilityUNLOCODE)})
                    </span>
                  )}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Manufactured Date</span>
                <span className="text-slate-900">
                  {productInfo.manufacturedDate
                    ? String(productInfo.manufacturedDate)
                    : isMounted
                      ? new Date(batch.manufactureDate).toLocaleDateString()
                      : ""}
                </span>
              </div>

              <div className="mt-4 border-t border-slate-100 pt-4">
                <h3 className="mb-2 text-xs font-bold text-slate-700">
                  Batch details
                </h3>
                <div className="grid grid-cols-2 gap-4 rounded-2xl bg-slate-50 p-4">
                  <div>
                    <div className="text-[10px] font-semibold text-slate-400 uppercase">
                      Batch Number
                    </div>
                    <div className="font-mono text-sm font-bold text-slate-800">
                      {batch.batchNumber}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold text-slate-400 uppercase">
                      Serial Range
                    </div>
                    <div className="font-mono text-sm font-bold text-slate-800">
                      {batch.serialRange || "N/A"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Info: (20260612 - Tzuhan) Card 2: Carbon Footprint Summary */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
            <h2 className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 text-xs font-bold tracking-wider text-slate-500 uppercase">
              <Activity className="h-4 w-4 text-emerald-500" />
              Carbon Footprint Summary
            </h2>
            <div className="text-center">
              <div className="text-4xl font-extrabold text-emerald-600">
                {totalCO2e === 0
                  ? "0.0000"
                  : totalCO2e < 0.0001
                    ? totalCO2e.toExponential(2)
                    : totalCO2e.toFixed(4)}{" "}
                <span className="text-sm font-semibold text-slate-500">
                  tCO₂e
                </span>
              </div>
              <div className="mt-1 text-xs text-slate-400">
                Methodology:{" "}
                {String(envImpact.methodology || "ISO 14067 (Cradle-to-Gate)")}
              </div>

              {/* Info: (20260612 - Tzuhan) Conic Donut Chart */}
              <div className="my-6 flex items-center justify-center gap-8">
                <div
                  className="relative flex h-32 w-32 items-center justify-center rounded-full shadow-inner"
                  style={{ background: conicBg }}
                >
                  <div className="absolute inset-4 flex flex-col items-center justify-center rounded-full bg-white shadow-sm">
                    <span className="text-[9px] font-bold tracking-widest text-slate-400 uppercase">
                      Cradle
                    </span>
                    <span className="text-[9px] font-bold tracking-widest text-slate-400 uppercase">
                      to Gate
                    </span>
                  </div>
                </div>
                <div className="space-y-2 text-left text-xs font-semibold text-slate-600">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-sm bg-orange-500"></span>
                    <span>Precursors: {prePct.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-sm bg-blue-500"></span>
                    <span>Scope 1: {s1Pct.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500"></span>
                    <span>Scope 2: {s2Pct.toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              {/* Info: (20260612 - Tzuhan) Emissions breakdown list */}
              <div className="space-y-2.5 border-t border-slate-100 pt-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Precursors Emissions</span>
                  <span className="font-semibold text-slate-800">
                    {precursors === 0
                      ? "0.0000"
                      : precursors < 0.0001
                        ? precursors.toExponential(2)
                        : precursors.toFixed(4)}{" "}
                    tCO₂e
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">
                    Direct Emissions (Scope 1)
                  </span>
                  <span className="font-semibold text-slate-800">
                    {scope1 === 0
                      ? "0.0000"
                      : scope1 < 0.0001
                        ? scope1.toExponential(2)
                        : scope1.toFixed(4)}{" "}
                    tCO₂e
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">
                    Indirect Emissions (Scope 2)
                  </span>
                  <span className="font-semibold text-slate-800">
                    {scope2 === 0
                      ? "0.0000"
                      : scope2 < 0.0001
                        ? scope2.toExponential(2)
                        : scope2.toFixed(4)}{" "}
                    tCO₂e
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Info: (20260612 - Tzuhan) Card 3: Circularity & Material Composition */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md md:col-span-2">
            <h2 className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 text-xs font-bold tracking-wider text-slate-500 uppercase">
              <Compass className="h-4 w-4 text-orange-500" />
              Circularity & Material Composition
            </h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-700">
                  Recycled Content Share
                </h3>
                {recycledContentShare.length === 0 ? (
                  <div className="text-xs text-slate-500 italic">
                    No recycled content data available.
                  </div>
                ) : (
                  recycledContentShare.map((m, idx) => {
                    const preShareRaw = Number(m.preConsumerShare || 0);
                    const postShareRaw = Number(m.postConsumerShare || 0);
                    const primaryShareRaw = Number(m.primaryMaterial || 0);
                    const isFraction =
                      preShareRaw + postShareRaw + primaryShareRaw <= 1.01;

                    const multiplier = isFraction ? 100 : 1;
                    const preShare = preShareRaw * multiplier;
                    const postShare = postShareRaw * multiplier;
                    const primaryShare = primaryShareRaw * multiplier;
                    const totalRecycled = preShare + postShare;

                    return (
                      <div
                        key={idx}
                        className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4"
                      >
                        <div className="flex justify-between text-xs font-bold text-slate-800">
                          <span>{m.material}</span>
                          <span className="text-emerald-600">
                            Recycled: {totalRecycled.toFixed(1)}%
                          </span>
                        </div>

                        {/* Info: (20260612 - Tzuhan) Progress Bar */}
                        <div className="mt-2 flex h-3 w-full overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="bg-orange-500 transition-all duration-500"
                            style={{ width: `${preShare}%` }}
                            title={`Pre-consumer: ${preShare}%`}
                          ></div>
                          <div
                            className="bg-emerald-500 transition-all duration-500"
                            style={{ width: `${postShare}%` }}
                            title={`Post-consumer: ${postShare}%`}
                          ></div>
                          <div
                            className="bg-slate-400 transition-all duration-500"
                            style={{ width: `${primaryShare}%` }}
                            title={`Primary: ${primaryShare}%`}
                          ></div>
                        </div>

                        {/* Info: (20260612 - Tzuhan) Legend */}
                        <div className="mt-3 flex flex-wrap gap-4 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                          <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-orange-500"></span>
                            Pre-consumer ({preShare.toFixed(1)}%)
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                            Post-consumer ({postShare.toFixed(1)}%)
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-slate-400"></span>
                            Primary ({primaryShare.toFixed(1)}%)
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div>
                <h3 className="mb-4 text-sm font-bold text-slate-700">
                  Chemical Composition
                </h3>
                {materialComposition.length === 0 ? (
                  <div className="text-xs text-slate-500 italic">
                    No chemical composition data available.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {materialComposition.map((composition, idx) => (
                      <div
                        key={idx}
                        className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
                      >
                        <div className="mb-2 font-bold text-slate-800">
                          {composition.materialName}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {composition.elements.map((el, elIdx) => (
                            <span
                              key={elIdx}
                              className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700"
                            >
                              {el.element}: {Number(el.percentage).toFixed(3)}%
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {criticalRawMaterials.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-slate-450 mb-2 text-xs font-bold tracking-wider uppercase">
                      Critical Raw Materials
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {criticalRawMaterials.map((crm, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center rounded-lg border border-red-100 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700"
                        >
                          ⚠️ {crm}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Info: (20260612 - Tzuhan) Card 4: Durability & Technical Specs */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
            <h2 className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 text-xs font-bold tracking-wider text-slate-500 uppercase">
              <Settings className="h-4 w-4 text-purple-500" />
              Durability & Repairability
            </h2>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Physical Lifespan</span>
                <span className="font-semibold text-slate-900">
                  {repairability.physicalLifespanYears
                    ? `${Number(repairability.physicalLifespanYears)} Years`
                    : "N/A"}
                </span>
              </div>
              <div className="space-y-1">
                <div className="text-xs font-bold text-slate-500 uppercase">
                  Repairability Instructions
                </div>
                <p className="rounded-2xl bg-slate-50 p-4.5 text-xs leading-relaxed text-slate-600">
                  {String(
                    repairability.repairability ||
                      "No special repair instructions.",
                  )}
                </p>
              </div>
              <div className="space-y-1">
                <div className="text-xs font-bold text-slate-500 uppercase">
                  End of Life / Disposal
                </div>
                <p className="rounded-2xl bg-slate-50 p-4.5 text-xs leading-relaxed text-slate-600">
                  {String(
                    repairability.disposal ||
                      "Dispose in accordance with local e-waste regulations.",
                  )}
                </p>
              </div>
            </div>
          </section>

          {/* Info: (20260612 - Tzuhan) Card 5: Compliance, Certifications & Social Impact */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
            <h2 className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 text-xs font-bold tracking-wider text-slate-500 uppercase">
              <Scale className="h-4 w-4 text-amber-500" />
              Compliance & Certifications
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">IATF 16949</span>
                <span className="font-bold">
                  {compliance.iatf16949Compliant ? (
                    <span className="text-emerald-600">
                      ✅ Compliant (
                      {String(compliance.iatfCertificateId || "Certified")})
                    </span>
                  ) : (
                    <span className="text-slate-400">Not Certified</span>
                  )}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">RoHS Compliant</span>
                <span className="font-bold">
                  {compliance.rohsCompliant ? (
                    <span className="text-emerald-600">✅ Compliant</span>
                  ) : (
                    <span className="text-red-550">❌ Non-compliant</span>
                  )}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">PFAS Free</span>
                <span className="font-bold">
                  {compliance.pfasFree ? (
                    <span className="text-emerald-600">✅ PFAS Free</span>
                  ) : (
                    <span className="text-red-550">❌ Contains PFAS</span>
                  )}
                </span>
              </div>

              {/* Info: (20260612 - Tzuhan) Social Impact */}
              <div className="mt-4 border-t border-slate-100 pt-4">
                <h3 className="mb-2 text-xs font-bold text-slate-700">
                  Social Responsibility
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-3 text-center">
                    <div className="text-slate-450 text-[10px] font-semibold uppercase">
                      Ethical Sourcing
                    </div>
                    <div className="mt-1 text-xs font-bold text-slate-800">
                      {socialImpact.ethicalSourcing
                        ? "✅ Verified"
                        : "Not Audited"}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-3 text-center">
                    <div className="text-slate-450 text-[10px] font-semibold uppercase">
                      Labor Standards
                    </div>
                    <div className="mt-1 text-xs font-bold text-slate-800">
                      {socialImpact.laborStandardCompliant
                        ? "✅ Compliant"
                        : "Not Audited"}
                    </div>
                  </div>
                </div>
              </div>

              {compliance.declarationDocument && (
                <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                  <div className="mb-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                    Attached Declaration Document
                  </div>
                  <div className="truncate font-mono text-xs font-bold text-blue-600">
                    📄 {String(compliance.declarationDocument)}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Info: (20260612 - Tzuhan) Card 6: EU Importer / Logistics (if present) */}
          {(logistics.companyName || logistics.eori) && (
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md md:col-span-2">
              <h2 className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 text-xs font-bold tracking-wider text-slate-500 uppercase">
                <Truck className="h-4 w-4 text-cyan-600" />
                EU Importer & Logistics
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <div className="text-slate-450 text-[10px] font-bold tracking-wider uppercase">
                    Importer Company
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-800">
                    {String(logistics.companyName || "N/A")}
                  </div>
                </div>
                <div>
                  <div className="text-slate-450 text-[10px] font-bold tracking-wider uppercase">
                    EORI Number
                  </div>
                  <div className="mt-1 font-mono text-sm font-semibold text-slate-800">
                    {String(logistics.eori || "N/A")}
                  </div>
                </div>
                <div>
                  <div className="text-slate-450 text-[10px] font-bold tracking-wider uppercase">
                    Importer Address
                  </div>
                  <div className="text-slate-650 mt-1 text-sm">
                    {String(logistics.address || "N/A")}
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Info: (20260612 - Tzuhan) Footer info/disclaimer */}
        <footer className="mt-12 border-t border-slate-200 pt-8 text-center text-xs text-slate-400">
          <p className="leading-relaxed">
            * Carbon footprint evaluated according to ISO 14067 / CBAM
            Implementing Regulation (EU) 2023/1773. System boundary:
            Cradle-to-Gate.
          </p>
          <p className="mt-1">
            * Subject to Customs Nomenclature (CN) Code:{" "}
            <span className="font-semibold">
              {String(productInfo.cnCode || "7318.15")}
            </span>
            .
          </p>
          <p className="text-slate-350 mt-4 font-semibold">
            Powered by iSunFA Enterprise Carbon Accounting System &bull;
            Verified via Decentralized Trust Engine
          </p>
          <p className="mt-8 text-[10px]">
            &copy; {new Date().getFullYear()} iSunFA. All rights reserved.
          </p>
        </footer>
      </main>
    </div>
  );
}
