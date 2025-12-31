import { Clock, Zap, ShieldCheck } from 'lucide-react';

export default function Features() {
  const features = [
    {
      name: '持續審計',
      description: '每 24 小時產生一次財務報表實現真正的持續審計，讓您在企業估值與盡職調查過程中無往不利，始終從容應對。',
      icon: Clock,
    },
    {
      name: '效率提升',
      description: '節省 85% 的日常記錄工作，讓您不再被帳務瑣事困擾，專注投入產品、服務與客戶價值的創造。',
      icon: Zap,
    },
    {
      name: '智能優化',
      description: '將審計效率提高達 150 倍，自動比對帳務與發票，提前發現異常，並精準對接政府補助申請條件。',
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="bg-gray-50 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h2 className="text-base font-semibold leading-7 text-orange-600">更聰明的財務管理</h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            iSunFA 核心優勢
          </p>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            使用 iSunFA，輕鬆實現定期即時生成財務三大報表，讓您的財務狀況一目了然。
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.name} className="relative flex flex-col bg-white p-8 rounded-2xl shadow-sm ring-1 ring-gray-200/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-600">
                    <feature.icon className="h-6 w-6 text-white" aria-hidden="true" />
                  </div>
                  {feature.name}
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                  <p className="flex-auto">{feature.description}</p>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
