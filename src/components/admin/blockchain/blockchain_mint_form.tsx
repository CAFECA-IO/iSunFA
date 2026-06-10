import { FormEvent } from "react";
import { Coins, ArrowRight } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { IBlockchainDashboardData } from "@/services/admin.blockchain.service";
import { CURRENCY_UNIT } from "@/constants/price";

interface IBlockchainMintFormProps {
  data: IBlockchainDashboardData | null;
  mintAmount: string;
  setMintAmount: (amount: string) => void;
  isMinting: boolean;
  handleMintSubmit: (e: FormEvent<HTMLFormElement>) => void;
}

export default function BlockchainMintForm({
  data,
  mintAmount,
  setMintAmount,
  isMinting,
  handleMintSubmit,
}: IBlockchainMintFormProps) {
  const { t } = useTranslation();

  return (
    <div className="rounded-3xl border border-orange-100 bg-linear-to-b from-white to-orange-50/30 p-6 shadow-sm sm:p-8">
      <div className="flex flex-col items-start gap-5 sm:flex-row">
        <div className="hidden shrink-0 rounded-2xl bg-orange-100 p-4 text-orange-600 shadow-inner sm:block">
          <Coins size={32} />
        </div>
        <div className="w-full min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-3 sm:mb-0">
            <div className="shrink-0 rounded-xl bg-orange-100 p-2 text-orange-600 shadow-inner sm:hidden">
              <Coins size={20} />
            </div>
            <h3 className="text-xl font-bold text-gray-900">
              {t("admin_blockchain.page.mint_icp")}
            </h3>
          </div>
          <p className="mt-2 mb-8 text-sm leading-relaxed text-gray-600">
            {t("admin_blockchain.page.mint_desc")}
          </p>

          <form
            onSubmit={handleMintSubmit}
            className="flex flex-col gap-4 sm:flex-row"
          >
            <div className="relative flex-1">
              <label htmlFor="mint-amount" className="sr-only">
                {t("admin_blockchain.page.amount_aria")}
              </label>
              <input
                id="mint-amount"
                type="number"
                step="0.0001"
                min="0.0001"
                aria-label={t("admin_blockchain.page.amount_aria") || "Amount"}
                placeholder={
                  t("admin_blockchain.page.amount_placeholder") ||
                  "Amount to mint"
                }
                value={mintAmount}
                onChange={(e) => setMintAmount(e.target.value)}
                disabled={!data || isMinting}
                className="w-full rounded-2xl border-2 border-gray-200 py-3.5 pr-16 pl-5 font-semibold text-gray-900 transition hover:border-gray-300 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 focus:outline-none disabled:opacity-50"
              />
              <span className="absolute top-1/2 right-5 -translate-y-1/2 font-bold text-gray-400">
                {CURRENCY_UNIT.ICP}
              </span>
            </div>
            <button
              type="submit"
              disabled={!data || !mintAmount || isMinting}
              className="flex items-center justify-center gap-2 rounded-2xl bg-gray-900 px-8 py-3.5 font-bold text-white shadow-md transition hover:bg-gray-800 hover:shadow-lg focus:ring-4 focus:ring-gray-900/20 focus:outline-none disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none"
            >
              {t("admin_blockchain.page.confirm")} <ArrowRight size={20} />
            </button>
          </form>

          {data && data.collateralRate !== "0.0" && (
            <div className="mt-6 flex items-center gap-3 rounded-xl bg-orange-50/50 px-4 py-3 text-sm text-orange-800">
              <div className="h-1.5 w-1.5 rounded-full bg-orange-400" />
              <span className="font-medium">
                {t("admin_blockchain.page.live_rate")}
              </span>
              <span className="ml-auto font-bold">
                1 {CURRENCY_UNIT.ICP} ≈{" "}
                {parseFloat(data.collateralRate).toLocaleString()}{" "}
                {CURRENCY_UNIT.ISC}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
