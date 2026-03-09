"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Download,
  Upload,
  ArrowRightLeft,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { timestampToString } from "@/lib/utils/common";
import VoucherDetailModal from "@/components/user/voucher/voucher_detail_modal";
import { IVoucher, TradingType, mockVouchers } from "@/interfaces/voucher";

const VoucherRow = ({
  voucher,
  onClick,
}: {
  voucher: IVoucher;
  onClick: () => void;
}) => {
  const renderIcon = (type: TradingType) => {
    switch (type) {
      case TradingType.INCOME:
        return <Download size={14} className="stroke-[2.5]" />;
      case TradingType.OUTCOME:
        return <Upload size={14} className="stroke-[2.5]" />;
      case TradingType.TRANSFER:
        return <ArrowRightLeft size={14} className="stroke-[2.5]" />;
      default:
        return null;
    }
  };

  const getTypeClasses = (style: TradingType) => {
    switch (style) {
      case TradingType.OUTCOME:
        return "bg-emerald-200 text-emerald-600";
      case TradingType.INCOME:
        return "bg-red-200 text-red-500";
      case TradingType.TRANSFER:
        return "bg-slate-200 text-slate-500";
      default:
        return "bg-slate-100 text-slate-600";
    }
  };

  return (
    <tr
      key={voucher.id}
      onClick={onClick}
      className="cursor-pointer border-b border-gray-100 transition-colors last:border-0 odd:bg-slate-50 even:bg-white hover:bg-orange-100"
    >
      <td className="relative px-3 py-4 text-xs font-medium text-gray-900 sm:px-6 sm:text-sm">
        {voucher.hasRead && (
          <div className="absolute top-1/2 -left-1 z-10 -mt-1 h-2 w-2 rounded-full bg-red-500 sm:left-2" />
        )}
        {timestampToString(voucher.tradingDate).dateAndTime}
      </td>
      <td className="px-3 py-4 sm:px-6">
        <span
          className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold whitespace-nowrap ${getTypeClasses(voucher.tradingType)}`}
        >
          {renderIcon(voucher.tradingType)} {voucher.tradingType}
        </span>
      </td>
      <td className="px-3 py-4 sm:px-6">
        <div className="flex items-baseline gap-1.5">
          <span className="text-xs font-semibold text-slate-400">
            {voucher.sourceId}
          </span>
          <span className="text-[13px] font-bold whitespace-nowrap text-slate-700">
            {voucher.sourceName}
          </span>
        </div>
      </td>
      <td className="px-3 py-4 sm:px-6">
        <div className="flex items-baseline gap-1.5">
          <span className="text-xs font-semibold text-slate-400">
            {voucher.reasonId}
          </span>
          <span className="text-[13px] font-bold whitespace-nowrap text-slate-700">
            {voucher.reasonName}
          </span>
        </div>
      </td>
      <td className="px-3 py-4 sm:px-6">
        <div className="flex flex-col gap-0.5">
          {voucher.partnerId && (
            <span className="text-[11px] font-semibold text-slate-400">
              {voucher.partnerId}
            </span>
          )}
          {voucher.partnerName && (
            <span className="mt-0.5 text-[13px] leading-none font-bold whitespace-nowrap text-slate-600">
              {voucher.partnerName}
            </span>
          )}
        </div>
      </td>
      <td className="flex items-baseline gap-1 px-3 py-4 text-left align-middle text-base font-black whitespace-nowrap text-slate-700 sm:px-6">
        {voucher.amount}{" "}
        <span className="text-[11px] font-bold text-slate-400">
          {voucher.currency}
        </span>
      </td>
      <td className="max-w-[250px] px-3 py-4 text-xs font-medium text-slate-400 sm:px-6">
        <div className="w-full truncate" title={voucher.note}>
          {voucher.note}
        </div>
      </td>
    </tr>
  );
};

export default function VoucherMainView() {
  const pathname = usePathname();

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedVoucherId, setSelectedVoucherId] = useState<string | null>(
    null,
  );
  const [vouchers /* , setVouchers */] = useState<IVoucher[]>(mockVouchers);

  // Info: (20260309 - Julian) 連接到 Journal
  const journalLink = pathname.replace("voucher", "journal");

  const displayedVoucher =
    vouchers.length > 0 ? (
      vouchers.map((v) => (
        <VoucherRow
          key={v.id}
          voucher={v}
          onClick={() => {
            setSelectedVoucherId(v.id);
            setIsModalOpen(true);
          }}
        />
      ))
    ) : (
      <tr>
        <td colSpan={7} className="px-3 py-4 text-center sm:px-6">
          目前尚無傳票，請
          <Link href={journalLink} className="text-blue-600 hover:underline">
            在此上傳檔案
          </Link>
        </td>
      </tr>
    );

  return (
    <div className="flex min-h-screen w-full flex-col bg-slate-50/50">
      <div className="flex justify-between px-8 py-6">
        <h1 className="text-2xl font-bold text-slate-800">傳票管理</h1>
      </div>

      <div className="flex w-full flex-col gap-4 px-4">
        {/* Main View Container */}
        <div className="mx-auto w-full max-w-[1400px]">
          {/* Table Container */}
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-slate-100 text-xs font-semibold text-gray-600 sm:text-base">
                <tr>
                  <th
                    scope="col"
                    aria-label="Sort by Trading Date"
                    className="w-[160px] px-3 py-3 sm:px-6"
                  >
                    <div className="group flex cursor-pointer items-center gap-1">
                      Trading Date
                      <div className="-gap-1 flex scale-75 flex-col opacity-80">
                        <ChevronUp size={14} className="translate-y-[2px]" />
                        <ChevronDown size={14} className="-translate-y-[2px]" />
                      </div>
                    </div>
                  </th>
                  <th scope="col" className="px-3 py-3 sm:px-6">
                    Trading Type
                  </th>
                  <th scope="col" className="px-3 py-3 sm:px-6">
                    Source
                  </th>
                  <th scope="col" className="px-3 py-3 sm:px-6">
                    Reason
                  </th>
                  <th scope="col" className="px-3 py-3 sm:px-6">
                    Trading Partner
                  </th>
                  <th
                    scope="col"
                    aria-label="Sort by Amount"
                    className="w-[180px] px-3 py-3 sm:px-6"
                  >
                    <div className="group flex cursor-pointer items-center gap-1">
                      Amount
                      <div className="-gap-1 flex scale-75 flex-col opacity-60">
                        <ChevronUp size={14} className="translate-y-[2px]" />
                        <ChevronDown size={14} className="-translate-y-[2px]" />
                      </div>
                    </div>
                  </th>
                  <th scope="col" className="min-w-[200px] px-3 py-3 sm:px-6">
                    Note
                  </th>
                </tr>
              </thead>
              <tbody className="align-middle text-sm">{displayedVoucher}</tbody>
            </table>
          </div>
        </div>
      </div>
      <VoucherDetailModal
        key={selectedVoucherId || "new"}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        voucherId={selectedVoucherId?.toString()}
        voucher={vouchers.find((v) => v.id === selectedVoucherId)}
      />
    </div>
  );
}
