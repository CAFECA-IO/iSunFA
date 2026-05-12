import { Decimal } from "decimal.js";

export type IReceiptItem = {
  name: string;
  quantity: number | string;
  unitPrice: number | string;
  amount: number | string;
  remark: string;
};

/**
 * Info: (20260410 - Luphia)
 * Shared utility to build consistent invoice items for PDF receipt and 3rd party gateways (OEN).
 * This ensures that OEN records perfectly match the Receipt PDF generator items output.
 */
export function generateReceiptItems(
  amount: bigint | number | string,
  orderData: Record<string, unknown>,
): IReceiptItem[] {
  let items: IReceiptItem[] = [];

  if (orderData.planId) {
    items = [
      {
        name: (orderData.title as string) || "會員訂閱",
        quantity: 1,
        unitPrice: amount.toString(),
        amount: amount.toString(),
        remark:
          orderData.billingInterval === "year" ? "會員卡年費" : "會員卡月費",
      },
    ];
  } else {
    let base = new Decimal(
      (orderData.baseCredits as string | number) ||
        (orderData.credits as string | number) ||
        amount.toString(),
    );
    let bonus = new Decimal((orderData.bonusCredits as string | number) || 0);

    if (
      !orderData.bonusCredits &&
      orderData.credits &&
      new Decimal(orderData.credits as string | number).gt(amount.toString())
    ) {
      base = new Decimal(amount.toString());
      bonus = new Decimal(orderData.credits as string | number).minus(
        amount.toString(),
      );
    }

    items.push({
      name: `iSunFA ${base.toString()} 點`,
      quantity: 1,
      unitPrice: amount.toString(),
      amount: amount.toString(),
      remark: `購買 ${base.toString()} 點`,
    });

    if (bonus.gt(0)) {
      items.push({
        name: `iSunFA ${bonus.toString()} 點（贈品）`,
        quantity: 1,
        unitPrice: 0,
        amount: 0,
        remark: `贈送 ${bonus.toString()} 點`,
      });
    }
  }

  return items;
}

/**
 * Info: (20260410 - Luphia)
 * Build the payload sent to OEN `token/transactions` ensuring we pass
 * precise productDetails that map to the actual invoice items.
 */
export function buildOenTransactionPayload(
  dbUser: { id: string; name: string | null },
  pmData: Record<string, unknown> | undefined,
  orderId: string,
  amount: bigint | number | string,
  orderData: Record<string, unknown>,
  providerToken: string,
) {
  const items = generateReceiptItems(amount, orderData);

  return {
    merchantId: "mermer",
    amount: amount.toString(),
    currency: "TWD",
    token: providerToken,
    orderId: orderId,
    userName: pmData?.buyerName || dbUser.name || "Unknown",
    userEmail: pmData?.email || `${dbUser.id}@isunfa.tw`,
    productDetails: items.map((item, idx) => ({
      productionCode: `ISUNFA-ITM-${idx}`,
      description: item.name,
      quantity: Number(item.quantity) || 1,
      unit: "pcs",
      unitPrice: Number(item.unitPrice), // Info: (20260410 - Luphia) mapped explicitly to each item tax/price structure
    })),
  };
}

/**
 * Info: (20260410 - Luphia)
 * Helper to compute standardized receipt fields to be written into the DB JSON blob.
 * This guarantees the DB fields (invoiceNumber, invoiceType, salesAmount, items) perfectly
 * match and decouple from what the PDF downloads later.
 */
export function buildReceiptDataToSave(
  orderId: string,
  amount: bigint | number | string,
  orderData: Record<string, unknown>,
  pmData: Record<string, unknown> | undefined,
  dbUser?: { name: string | null } | null,
) {
  // Info: (20260410 - Luphia) Same logic as PDF Generator
  const targetId = orderId;
  const digits = targetId.replace(/\D/g, "");
  const numericPart = digits.padEnd(8, "0").substring(0, 8);
  const invoiceNumber = `ZM${numericPart}`;

  const amountDec = new Decimal(amount.toString());
  const taxAmount = amountDec.minus(amountDec.div(1.05)).round().toString();
  const salesAmount = amountDec.minus(taxAmount).toString();

  const resolvedBuyerName =
    pmData?.buyerName || orderData?.buyerName || dbUser?.name || "Unknown";
  const resolvedBuyerTaxId = pmData?.taxId || orderData?.buyerTaxId || null;
  const invoiceType = resolvedBuyerTaxId ? "B2B" : "B2C";
  const items = generateReceiptItems(amount, orderData);

  return {
    invoiceType,
    invoiceNumber,
    buyerName: resolvedBuyerName,
    buyerTaxId: resolvedBuyerTaxId,
    items,
    salesAmount,
    taxAmount,
    amount,
  };
}
