import { Pickaxe } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { IBlockchainDashboardData } from "@/services/admin.blockchain.service";

interface IBlockchainMiningStatusProps {
  data: IBlockchainDashboardData | null;
  isTogglingMining: boolean;
  handleToggleMining: () => void;
}

export default function BlockchainMiningStatus({
  data,
  isTogglingMining,
  handleToggleMining,
}: IBlockchainMiningStatusProps) {
  const { t } = useTranslation();

  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md">
      <div
        className={`absolute top-0 left-0 h-full w-1.5 ${data?.isMining ? "bg-emerald-500" : "bg-gray-300"}`}
      />
      <div className="flex items-center justify-between pl-3 sm:pl-4">
        <div className="flex items-center gap-4">
          <div
            className={`rounded-2xl p-3 shadow-inner ${data?.isMining
                ? "bg-emerald-50 text-emerald-600 ring-2 ring-emerald-100"
                : "bg-gray-100 text-gray-400"
              }`}
          >
            <Pickaxe className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {t("admin_blockchain.page.consensus_node")}
            </h3>
            <p className="mt-1 text-sm font-medium text-gray-500">
              {data?.isMining
                ? t("admin_blockchain.page.mining_active")
                : t("admin_blockchain.page.mining_paused")}
            </p>
          </div>
        </div>
        <button
          disabled={!data || isTogglingMining}
          onClick={handleToggleMining}
          aria-label="Toggle Mining"
          className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition-colors focus:ring-4 focus:ring-emerald-500/20 focus:outline-none disabled:opacity-50 ${data?.isMining
              ? "bg-emerald-500 hover:bg-emerald-600"
              : "bg-gray-300 hover:bg-gray-400"
            }`}
        >
          <span
            className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out ${data?.isMining ? "translate-x-7" : "translate-x-1"
              }`}
          />
        </button>
      </div>
    </div>
  );
}
