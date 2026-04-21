"use client";

import { numberWithCommas } from "@/lib/utils/common";
import { Folder, Settings } from "lucide-react";
import { IEmissionSources } from "@/interfaces/emission_source";

export default function EmissionSourcesItem({
  emissionSource,
}: {
  emissionSource: IEmissionSources;
}) {
  const { coefficient } = emissionSource;

  // ToDo: (20260420 - Julian) Open Emission Source Setting Modal
  const clickAction = () => {
    console.log("clickAction");
  };

  // Info: (20260421 - Julian) 處理係數來源
  const coefSourceStr = coefficient?.source ?? "未設定";
  const coefFactor = coefficient ? (
    <p className="text-sm font-bold text-slate-800 uppercase">
      {numberWithCommas(coefficient.emissionFactor)}
      <span className="ml-1 text-[10px] text-slate-400">
        {coefficient.unit}
      </span>
    </p>
  ) : (
    <p className="text-xs font-bold text-slate-500">未設定</p>
  );

  return (
    <tr className="group/item border-b border-gray-100 transition-colors last:border-b-0 hover:bg-orange-50">
      <td aria-label="Emission Source Name" className="px-8 py-4">
        <div className="flex items-center gap-4">
          <div className="flex size-10 items-center justify-center rounded-lg bg-gray-100 text-slate-400 transition-colors group-hover/item:bg-white">
            <Folder size={20} />
          </div>
          <div className="flex flex-col font-bold">
            <p className="text-sm text-slate-800 transition-colors group-hover/item:text-orange-400">
              {emissionSource.name}
            </p>
            <p className="text-xs text-slate-400">{emissionSource.id}</p>
          </div>
        </div>
      </td>
      <td className="px-8 py-4 text-xs font-bold text-slate-500">
        {coefSourceStr}
      </td>
      <td className="px-8 py-4">{coefFactor}</td>
      <td className="px-8 py-4 text-center text-sm">
        <button
          type="button"
          onClick={clickAction}
          className="rounded-lg bg-transparent p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-800"
        >
          <Settings size={20} />
        </button>
      </td>
    </tr>
  );
}
