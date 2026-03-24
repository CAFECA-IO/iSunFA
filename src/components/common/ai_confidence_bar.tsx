export default function AiConfidenceBar({
  confidence,
}: {
  confidence: number;
}) {
  return (
    <div className="flex items-center justify-center gap-3">
      <div className="h-2 w-16 shrink-0 overflow-hidden rounded-full bg-slate-200">
        <div
          // Info: (20260324 - Julian) 85 以上為綠色
          className={`h-full rounded-full ${confidence >= 85 ? "bg-emerald-400" : "bg-orange-500"}`}
          style={{ width: `${confidence}%` }}
        ></div>
      </div>
      <span className="text-sm font-bold whitespace-nowrap text-slate-700">
        {confidence}%
      </span>
    </div>
  );
}
