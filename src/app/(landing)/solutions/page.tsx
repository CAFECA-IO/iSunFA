import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Check, Globe, Shield, Zap, TrendingUp, Users } from "lucide-react";

export const metadata: Metadata = {
  title: "iSunFA 專業碳管理解決方案",
  description:
    "提供 ISO 14064-1 組織碳盤查、ISO 14067 產品碳足跡及碳足跡標章申請服務。針對微型、中小企業及大型企業量身打造的碳管理路徑，結合 AI 技術提升效率並確保合規性。",
  keywords: [
    "組織碳盤查",
    "產品碳足跡",
    "碳標章申請",
    "碳健檢",
    "IFRS S1/S2",
    "ISO 14064",
    "ISO 14067",
    "微型企業碳盤查",
    "SME 永續發展",
  ],
};

export default function SolutionsLandingPage() {
  const solutions = [
    {
      id: "org",
      title: "組織碳盤查 (ISO 14064-1)",
      desc: "依據 GHG Protocol 與 ISO 14064-1 標準，協助企業建立完整的溫室氣體排放清冊。",
      features: [
        "組織與報告邊界設定",
        "排放源鑑別與分類",
        "活動數據收集與量化計算",
        "數據品質與不確定性評估",
        "內外部查證與軌跡追溯",
        "碳盤查報告書產製",
      ],
      icon: Globe,
    },
    {
      id: "product",
      title: "產品碳足跡 (ISO 14067)",
      desc: "針對單一產品或服務，進行生命週期 (LCA) 的碳排放建模與計算。",
      features: [
        "功能單位與系統邊界界定",
        "製程流程圖與生命週期地圖建模",
        "分配與截斷準則處理",
        "生命週期活動數據換算",
        "碳排熱點分析與減碳設計",
        "產品碳足跡報告書",
      ],
      icon: Zap,
    },
    {
      id: "label",
      title: "碳足跡標章申請",
      desc: "協助企業向政府或國際組織申請產品碳標籤與減碳標籤輔導。",
      features: [
        "功能單位與 PCR 適用性確認",
        "質量平衡與生命週期數據收集",
        "碳足跡量化計算與熱點分析",
        "ISO 14067 合規報告書編製",
        "數據品質稽核與查證聲明書",
        "碳標籤行政申辦與審查",
      ],
      icon: Shield,
    },
  ];

  const tiers = [
    {
      name: "微型企業",
      target: "場域 ≤ 1,000 坪 | 年營收 ≤ 1 億",
      focus: "輕量入門級方案",
      pricing: "NT$ 94,500",
      benefit:
        "專為微型企業設計，提供完整的導入功能與合規報告，滿足供應鏈初步要求。",
    },
    {
      name: "中小企業 (SME)",
      target: "場域 1,000-5,000 坪 | 年營收 1-5 億",
      focus: "專業成長級方案",
      pricing: "NT$ 283,500",
      benefit:
        "提供高效的數據自動化工具，縮短盤查週期，並針對熱點提供減碳分析建議。",
    },
    {
      name: "大型企業",
      target: "場域 ≥ 5,000 坪 | 年營收 ≥ 5 億",
      focus: "旗艦企業級方案",
      pricing: "NT$ 567,000",
      benefit:
        "跨站點數據整合與全球合規支持，應對 CBAM 等國際碳關稅挑戰與 ESG 申報。",
    },
  ];

  return (
    <div className="bg-white">
      {/* Info: (20260705 - Luphia) Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-32">
        <div className="absolute inset-0 -z-10">
          <Image
            src="/images/solutions_hero_bg.jpg"
            alt="Solutions Hero Background"
            fill
            priority
            unoptimized
            sizes="100vw"
            className="object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-white/20 to-white" />
        </div>
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              無痛完成專業碳管理
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              告別繁瑣的手工計算！我們運用 AI
              技術協助微型、中小及大型企業完成組織盤查與產品碳足跡報告，讓永續合規變得前所未有的簡單。
            </p>
          </div>
        </div>
      </section>

      {/* Info: (20260705 - Luphia) Services Grid */}
      <section className="bg-gray-50 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base leading-7 font-semibold text-orange-600">
              專業服務
            </h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              全方位的永續數位化工具
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
              {solutions.map((solution) => (
                <div
                  key={solution.id}
                  className="flex flex-col rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-200"
                >
                  <dt className="flex items-center gap-x-3 text-lg leading-7 font-semibold text-gray-900">
                    <solution.icon
                      className="h-6 w-6 flex-none text-orange-600"
                      aria-hidden="true"
                    />
                    {solution.title}
                  </dt>
                  <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                    <p className="flex-auto">{solution.desc}</p>
                    <ul className="mt-6 space-y-3">
                      {solution.features.map((feature) => (
                        <li key={feature} className="flex gap-x-3 text-sm">
                          <Check
                            className="h-5 w-5 flex-none text-green-600"
                            aria-hidden="true"
                          />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* Info: (20260705 - Luphia) Tiers Section */}
      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base leading-7 font-semibold text-orange-600">
              適用對象
            </h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              量身打造的永續成長路徑
            </p>
          </div>
          <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 lg:mx-0 lg:max-w-none lg:grid-cols-3">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className="flex flex-col justify-between rounded-3xl bg-white p-8 ring-1 ring-gray-200 transition-shadow hover:shadow-lg xl:p-10"
              >
                <div>
                  <div className="flex items-center justify-between gap-x-4">
                    <h3 className="text-lg leading-8 font-semibold text-gray-900">
                      {tier.name}
                    </h3>
                  </div>
                  <p className="mt-4 text-sm leading-6 font-medium text-orange-600">
                    {tier.target}
                  </p>
                  <p className="mt-4 text-base leading-7 font-bold text-gray-600">
                    {tier.focus}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-gray-500">
                    {tier.benefit}
                  </p>
                  <div className="mt-6 flex items-baseline gap-x-1">
                    <span className="text-2xl font-bold tracking-tight text-gray-900">
                      {tier.pricing}
                    </span>
                  </div>
                </div>
                <Link
                  href="/pricing/solutions"
                  className="mt-8 block rounded-md bg-orange-600 px-3 py-2 text-center text-sm leading-6 font-semibold text-white shadow-sm hover:bg-orange-500"
                >
                  立即預約諮詢
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Info: (20260705 - Luphia) Why Choose Us */}
      <section className="bg-gray-900 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-y-16 lg:grid-cols-2 lg:items-center lg:gap-x-16">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                讓綠色數位化成為日常
              </h2>
              <p className="mt-6 text-lg leading-8 text-gray-300">
                iSunFA 結合 <strong>外部專家團隊與先進 AI 技術</strong>
                ，全程代辦您的碳盤查工作。企業{" "}
                <strong>無需額外編制或投入內部人力</strong>
                ，即可從繁瑣的數據收集與報告編製中解脫，讓永續轉型真正實現零負擔。
              </p>
              <dl className="mt-10 max-w-xl space-y-8 text-base leading-7 text-gray-300 lg:max-w-none">
                <div className="relative pl-9">
                  <dt className="inline font-semibold text-white">
                    <TrendingUp className="absolute top-1 left-1 h-5 w-5 text-orange-500" />
                    AI 智慧加速：
                  </dt>
                  <dd className="inline">
                    {" "}
                    自動化係數匹配與報告生成，節省大量人力與時間。
                  </dd>
                </div>
                <div className="relative pl-9">
                  <dt className="inline font-semibold text-white">
                    <Shield className="absolute top-1 left-1 h-5 w-5 text-orange-500" />
                    100% 國際合規：
                  </dt>
                  <dd className="inline">
                    {" "}
                    遵循 IFRS S1 / S2、ISO 14064 與 ISO 14067 標準。
                  </dd>
                </div>
                <div className="relative pl-9">
                  <dt className="inline font-semibold text-white">
                    <Users className="absolute top-1 left-1 h-5 w-5 text-orange-500" />
                    供應鏈協同：
                  </dt>
                  <dd className="inline">
                    {" "}
                    支援供應鏈上下游數據串接，輕鬆達成集團減碳目標。
                  </dd>
                </div>
              </dl>
            </div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl shadow-2xl ring-1 ring-white/10">
              <Image
                src="/images/carbon_sankey_futuristic.jpg"
                alt="Futuristic Carbon Emission Flow"
                fill
                unoptimized
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Info: (20260705 - Luphia) CTA Section */}
      <section className="relative isolate mt-32 px-6 py-32 sm:mt-56 sm:py-40 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            準備好開啟您的永續轉型了嗎？
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-gray-600">
            聯絡我們的永續顧問，為您的企業量身打造最合適的盤查路徑。
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link
              href="/pricing/solutions"
              className="rounded-md bg-orange-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-500"
            >
              聯繫解決方案專家
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
