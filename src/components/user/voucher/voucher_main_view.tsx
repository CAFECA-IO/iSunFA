"use client";

import {
  Download,
  Upload,
  ArrowRightLeft,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { timestampToString } from "@/lib/utils/common";

enum TradingType {
  INCOME = "income",
  OUTCOME = "outcome",
  TRANSFER = "transfer",
}

interface IVoucherRow {
  id: number;
  tradingDate: number;
  hasRead: boolean;
  tradingType: TradingType;
  sourceId: string;
  sourceName: string;
  reasonId: string;
  reasonName: string;
  partnerId: string;
  partnerName: string;
  amount: string;
  currency: string;
  note: string;
}

const VoucherRow = ({ voucher }: { voucher: IVoucherRow }) => {
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
        return "bg-emerald-100/80 text-emerald-600";
      case TradingType.INCOME:
        return "bg-red-100/80 text-red-500";
      case TradingType.TRANSFER:
        return "bg-slate-200 text-slate-500";
      default:
        return "bg-slate-100 text-slate-600";
    }
  };

  return (
    <tr
      key={voucher.id}
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
      <td className="flex items-baseline gap-1 px-3 py-4 align-middle text-left text-base font-black whitespace-nowrap text-slate-700 sm:px-6">
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
  const vouchers: IVoucherRow[] = [
    {
      id: 1,
      tradingDate: 1703420984,
      hasRead: true,
      tradingType: TradingType.INCOME,
      sourceId: "1101",
      sourceName: "Cash on hand",
      reasonId: "4110",
      reasonName: "Sales Revenue",
      partnerId: "59373022",
      partnerName: "PX Mart",
      amount: "1,785,000",
      currency: "TWD",
      note: "One line note",
    },
    {
      id: 2,
      tradingDate: 1738882361,
      hasRead: true,
      tradingType: TradingType.OUTCOME,
      sourceId: "1101",
      sourceName: "Cash on hand",
      reasonId: "5111",
      reasonName: "Cost of Goods Sold",
      partnerId: "59373022",
      partnerName: "PX Mart",
      amount: "1,785,000",
      currency: "TWD",
      note: "",
    },
    {
      id: 3,
      tradingDate: 1723378219,
      hasRead: false,
      tradingType: TradingType.TRANSFER,
      sourceId: "1101",
      sourceName: "Cash on hand",
      reasonId: "1104",
      reasonName: "Cash in banks",
      partnerId: "",
      partnerName: "",
      amount: "1,785,000",
      currency: "TWD",
      note: "Save money to Tai shin bank",
    },
    {
      id: 4,
      tradingDate: 1718238194,
      hasRead: false,
      tradingType: TradingType.TRANSFER,
      sourceId: "1101",
      sourceName: "Cash on hand",
      reasonId: "4610",
      reasonName: "Service Revenue",
      partnerId: "59373022",
      partnerName: "PX Mart",
      amount: "1,785,000",
      currency: "TWD",
      note: "Sale a printer",
    },
    {
      id: 5,
      tradingDate: 1728461814,
      hasRead: false,
      tradingType: TradingType.OUTCOME,
      sourceId: "1101",
      sourceName: "Cash on hand",
      reasonId: "5111",
      reasonName: "Cost of Goods Sold",
      partnerId: "59373022",
      partnerName: "PX Mart",
      amount: "1,785,000",
      currency: "TWD",
      note: "This is where you can put note",
    },
    {
      id: 6,
      tradingDate: 1774538283,
      hasRead: false,
      tradingType: TradingType.INCOME,
      sourceId: "1101",
      sourceName: "Cash on hand",
      reasonId: "5111",
      reasonName: "Cost of Goods Sold",
      partnerId: "59373022",
      partnerName: "PX Mart",
      amount: "1,785,000",
      currency: "TWD",
      note: "",
    },
  ];

  const displayedVoucher =
    vouchers.length > 0 ? (
      vouchers.map((v) => <VoucherRow key={v.id} voucher={v} />)
    ) : (
      <tr>No Data</tr>
    );

  return (
    <div className="flex min-h-screen w-full flex-col bg-slate-50/50">
      <div className="flex justify-between px-8 py-6">
        <h1 className="text-2xl font-bold text-slate-800">
          傳票管理
        </h1>
      </div>

      <div className="flex w-full flex-col gap-4 px-4">
        {/* Main View Container */}
        <div className="mx-auto w-full max-w-[1400px]">
          {/* Table Container */}
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-slate-100 text-xs font-semibold text-gray-600 uppercase sm:text-base">
                <tr>
                  <th scope="col" aria-label="Sort by Trading Date" className="w-[160px] px-3 py-3 sm:px-6">
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
                  <th scope="col" aria-label="Sort by Amount" className="w-[180px] px-3 py-3 sm:px-6">
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
    </div>
  );
}
