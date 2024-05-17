import { IVoucher, IVoucherMetaData } from "@/interfaces/voucher";
import { isIPayment } from "@/lib/utils/type_guard/payment";
import { isILineItem } from "@/lib/utils/type_guard/line_item";

function isIVoucherMetaData(arg: IVoucherMetaData): arg is IVoucherMetaData {
  if (
    typeof arg.date !== 'number' ||
    typeof arg.voucherType !== 'string' ||
    typeof arg.companyId !== 'string' ||
    typeof arg.companyName !== 'string' ||
    typeof arg.description !== 'string' ||
    typeof arg.reason !== 'string' ||
    typeof arg.projectId !== 'string' ||
    typeof arg.project !== 'string' ||
    typeof arg.contractId !== 'string' ||
    typeof arg.contract !== 'string' ||
    isIPayment(arg.payment)
  ) {
    return false;
  }
  return true;
}

export function isIVoucher(arg: IVoucher): arg is IVoucher {
  if (arg.voucherIndex === undefined || arg.invoiceIndex === undefined) {
    return false;
  }
  const isIVoucherMetaDataReturn = arg.metadatas.every(isIVoucherMetaData);
  if (isIVoucherMetaDataReturn) {
    return false;
  }
  const isILineItemReturn = arg.lineItems.every(isILineItem);
  if (!isILineItemReturn) {
    return false;
  }
  return true;
}
