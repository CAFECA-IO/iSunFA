import { useTranslation } from "@/i18n/i18n_context";

interface IRewardScreenProps {
  rewardData: { points: string; modules: string[] };
  onRewardAccept: () => void;
}

export default function RewardScreen({
  rewardData,
  onRewardAccept,
}: IRewardScreenProps) {
  const { t } = useTranslation();

  return (
    <div className="animate-in fade-in zoom-in flex flex-col items-center justify-center py-6 text-center duration-500">
      <div className="relative mb-6">
        <div className="absolute -inset-4 animate-pulse rounded-full bg-gradient-to-r from-orange-300 via-amber-300 to-yellow-300 opacity-70 blur-xl"></div>
        <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-orange-100 to-white shadow-2xl">
          <span className="text-5xl">🎁</span>
        </div>
      </div>

      <h3 className="mb-2 text-2xl font-extrabold tracking-tight text-gray-900">
        {t("auth_modal.reward.title")}
      </h3>
      <p className="mb-8 text-sm text-gray-500">
        {t("auth_modal.reward.subtitle")}
      </p>

      <div className="mb-8 w-full overflow-hidden rounded-2xl border border-orange-100 bg-gradient-to-b from-orange-50 to-white p-6 shadow-sm">
        <div className="mb-2 text-sm font-medium text-orange-800">
          {t("auth_modal.reward.reward_label")}
        </div>
        <div className="flex items-center justify-center gap-2">
          <span className="text-4xl font-black text-orange-600">
            {rewardData.points}
          </span>
          <span className="text-lg font-bold text-orange-800">
            {t("auth_modal.reward.points_unit")}
          </span>
        </div>
        {rewardData.modules.length > 0 && (
          <div className="mt-4 border-t border-orange-100 pt-4">
            <div className="mb-2 text-xs text-orange-600">
              {t("auth_modal.reward.modules_label")}
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {rewardData.modules.map((m) => (
                <span
                  key={m}
                  className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-800"
                >
                  {m}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <button
        onClick={onRewardAccept}
        className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 py-3.5 text-base font-bold text-white shadow-lg transition-all hover:from-orange-600 hover:to-amber-600 hover:shadow-orange-500/30 active:scale-95"
      >
        {t("auth_modal.reward.start_btn")}
      </button>
    </div>
  );
}
