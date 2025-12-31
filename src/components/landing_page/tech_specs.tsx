import { Lock, Cpu, Globe } from 'lucide-react';

export default function TechSpecs() {
  const specs = [
    {
      title: '零知識證明與同態加密',
      description: '在不解密資料的情況下完成驗證與計算，有效保護隱私，滿足隱私需求，建立共識信任。',
      icon: Lock,
    },
    {
      title: 'TW-GAAP 大語言與視覺推理輔助',
      description: '整合先進 GPT 技術，提供符合台灣會計準則的自動化推理與輔助。',
      icon: Cpu,
    },
    {
      title: '高效率點對點網路架構',
      description: '透過生物感染路徑模型，實現高速運算與即時共識，運行效率接近傳統資料庫系統。',
      icon: Globe,
    },
  ];

  return (
    <div className="bg-slate-800 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h2 className="text-base font-semibold leading-7 text-orange-400">先進技術</h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            財務分析與推理模型
          </p>
          <p className="mt-6 text-lg leading-8 text-gray-300">
            超過八億筆財務數據進行訓練，打造最值得信賴的自動化會計平台。
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
          <div className="grid grid-cols-1 gap-x-8 gap-y-16 lg:grid-cols-3">
            {specs.map((spec) => (
              <div key={spec.title} className="flex flex-col items-start">
                <div className="rounded-xl bg-white/10 p-2 ring-1 ring-white/20 mb-4">
                  <spec.icon className="h-6 w-6 text-white" aria-hidden="true" />
                </div>
                <dt className="text-xl font-semibold leading-7 text-white">
                  {spec.title}
                </dt>
                <dd className="mt-1 flex flex-auto flex-col text-base leading-7 text-gray-400">
                  <p className="flex-auto">{spec.description}</p>
                </dd>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
