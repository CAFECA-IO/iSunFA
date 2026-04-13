'use client';

export default function FormulaManagementTab() {
   return (
<>
  {/* Info: (20260413 - Julian) Formula Section */}
  <div className="grid grid-flow-row grid-cols-1 gap-y-4 lg:grid-cols-2 lg:gap-x-4">
    {/* Info: (20260413 - Julian) Formula Card */}
    <div className="flex flex-col gap-4 p-6 bg-white shadow-sm rounded-xl">
      {/* Info: (20260413 - Julian) Header */}
      <div className="flex items-center">
        <div className="flex flex-col gap-1 font-bold">
          <h2 className="text-sm text-slate-800 lg:text-base">電力排放公式 (台灣 2023)</h2>
          <p className="text-[10px] text-gray-400 lg:text-xs">經濟部能源署 • 最後更新 2023-12-01</p>
        </div>
      </div>
      {/* Info: (20260413 - Julian) Description */}
      <div className="flex flex-col gap-2">
        <p className="text-xs text-gray-500 lg:text-sm">根據經濟部能源署公布之電力排碳係數計算</p>
      </div>
      {/* Info: (20260413 - Julian) Formula */}
      <div className="flex flex-col font-semibold gap-4 bg-gray-50 p-4 rounded-lg">
        <p className="text-xs text-gray-400 lg:text-sm">計算邏輯</p>
        <div className="bg-white px-3 py-2 rounded-lg border border-gray-100">
          <p className="text-sm text-slate-800 lg:text-base">度數 (kWh) * 0.495</p>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-xs flex gap-2 items-center lg:text-sm">
            <p className="text-gray-400">排放係數 (EF)</p>
            <p className="text-slate-800">0.495</p>
          </div>
          <p className="text-xs text-gray-400 lg:text-sm">kgCO2e/kWh</p>
        </div>
      </div>
    </div>
  </div>
  </>
   )
}