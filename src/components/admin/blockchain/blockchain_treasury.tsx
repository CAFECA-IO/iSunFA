import QRCode from "react-qr-code";
import { Landmark, Copy } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { IBlockchainDashboardData } from "@/services/admin.blockchain.service";

interface IBlockchainTreasuryProps {
  data: IBlockchainDashboardData | null;
  handleCopy: (text: string) => void;
}

export default function BlockchainTreasury({
  data,
  handleCopy,
}: IBlockchainTreasuryProps) {
  const { t } = useTranslation();

  return (
    <div className="flex h-full flex-col items-center justify-between rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
      <div className="w-full">
        <div className="mb-8 flex items-center gap-3 border-b border-gray-100 pb-4">
          <div className="rounded-lg bg-orange-50 p-2 text-orange-500">
            <Landmark className="h-5 w-5" />
          </div>
          <h3 className="font-bold text-gray-900">
            {t("admin_blockchain.page.admin_treasury")}
          </h3>
        </div>

        <div className="group relative mx-auto flex aspect-square w-full max-w-[240px] items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-4 transition hover:border-orange-300 hover:bg-orange-50/30">
          {data ? (
            <div className="overflow-hidden rounded-xl bg-white p-2 shadow-sm transition transform group-hover:scale-105">
              <QRCode
                value={data.address}
                size={200}
                style={{ height: "100%", width: "100%" }}
              />
            </div>
          ) : (
            <div className="h-[200px] w-[200px] animate-pulse rounded-xl bg-gray-200" />
          )}
        </div>
      </div>

      <div className="mt-8 w-full text-center">
        <p className="mb-3 text-xs font-bold tracking-widest text-gray-400 uppercase">
          {t("admin_blockchain.page.public_address")}
        </p>
        {data ? (
          <button
            onClick={() => handleCopy(data.address)}
            className="group flex w-full items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-3 transition hover:border-orange-300 hover:bg-white hover:shadow-md active:bg-orange-50"
          >
            <span className="max-w-[85%] text-gray-600 truncate font-mono text-sm font-medium transition group-hover:text-orange-700">
              {data.address}
            </span>
            <Copy className="h-4 w-4 text-gray-400 transition group-hover:text-orange-500 shrink-0" />
          </button>
        ) : (
          <div className="h-12 w-full animate-pulse rounded-xl bg-gray-100" />
        )}
      </div>
    </div>
  );
}
