export enum InvoiceType {
  PURCHASE_TRIPLICATE_AND_ELECTRONIC = 'PurchaseTriplicateAndElectronic', // 進項三聯式、電子計算機統一發票
  PURCHASE_DUPLICATE_CASH_REGISTER_AND_OTHER = 'PurchaseDuplicateCashRegisterAndOther', // 銷項二聯式、二聯式收銀機統一發票
  PURCHASE_RETURNS_TRIPLICATE_AND_ELECTRONIC = 'PurchaseReturnsTriplicateAndElectronic', // 三聯式、電子計算機及三聯式收銀機統一發票及一般稅額計算之電子發票之銷貨退回或折讓證明單
  PURCHASE_RETURNS_DUPLICATE_CASH_REGISTER_AND_OTHER = 'PurchaseReturnsDuplicateCashRegisterAndOther', // 二聯式收銀機統一發票及載有稅額之其他憑證之進貨退出或折讓證明單
  PURCHASE_TRIPLICATE_CASH_REGISTER_AND_ELECTRONIC = 'PurchaseTriplicateCashRegisterAndElectronic', // 進項三聯式收銀機統一發票及一般稅額計算之電子發票，每張稅額五百元以下之進項三聯式收銀機統一發票及一般稅額計算之電子發票
  PURCHASE_UTILITY_ELECTRONIC_INVOICE = 'PurchaseUtilityElectronicInvoice', // 進項公用事業電子發票字軌號碼得以公用事業產製抬頭為一百零五年一月以後已繳納之繳費通知單或已繳費憑證之載具流水號替代登錄
  PURCHASE_SUMMARIZED_TRIPLICATE_AND_ELECTRONIC = 'PurchaseSummarizedTriplicateAndElectronic', // 彙總登錄每張稅額五百元以下之進項三聯式、電子計算機統一發票
  PURCHASE_SUMMARIZED_DUPLICATE_CASH_REGISTER_AND_OTHER = 'PurchaseSummarizedDuplicateCashRegisterAndOther', // 彙總登錄每張稅額五百元以下之進項二聯式收銀機統一發票、載有稅額之其他憑證
  PURCHASE_CUSTOMS_DUTY_PAYMENT = 'PurchaseCustomsDutyPayment', // 進項海關代徵營業稅繳納證
  PURCHASE_CUSTOMS_DUTY_REFUND = 'PurchaseCustomsDutyRefund', // 進項海關退還溢繳營業稅申報單
  SALES_TRIPLICATE_INVOICE = 'SalesTriplicateInvoice', // 銷項三聯式統一發票
  SALES_DUPLICATE_CASH_REGISTER_INVOICE = 'SalesDuplicateCashRegisterInvoice', // 銷項二聯式、二聯式收銀機統一發票
  SALES_RETURNS_TRIPLICATE_AND_ELECTRONIC = 'SalesReturnsTriplicateAndElectronic', // 三聯式、電子計算機、三聯式收銀機統一發票及一般稅額計算之電子發票之銷貨退回或折讓證明單
  SALES_RETURNS_DUPLICATE_AND_NON_UNIFORM = 'SalesReturnsDuplicateAndNonUniform', // 二聯式、二聯式收銀機統一發票及銷項免用統一發票之銷貨退回或折讓證明單
  SALES_TRIPLICATE_CASH_REGISTER_AND_ELECTRONIC = 'SalesTriplicateCashRegisterAndElectronic', // 銷項三聯式收銀機統一發票及一般稅額計算之電子發票
  SALES_NON_UNIFORM_INVOICE = 'SalesNonUniformInvoice', // 銷項免用統一發票
  SALES_SPECIAL_TAX_CALCULATION = 'SalesSpecialTaxCalculation', // 銷項憑證、特種稅額計算之電子發票
  SALES_SPECIAL_TAX_RETURNS = 'SalesSpecialTaxReturns', // 特種稅額之銷貨退回或折讓證明單
  FOREIGN_SERVICE_PAYMENT = 'ForeignServicePayment', // 進口勞務費用支付證明
  FOREIGN_TAX_EXEMPT_GOODS = 'ForeignTaxExemptGoods', // 進口免稅物品進口證明
}

export const salesCategories = {
  [InvoiceType.SALES_TRIPLICATE_INVOICE]: 'triplicateAndElectronic',
  [InvoiceType.SALES_DUPLICATE_CASH_REGISTER_INVOICE]: 'duplicateAndCashRegister',
  [InvoiceType.SALES_RETURNS_TRIPLICATE_AND_ELECTRONIC]: 'returnsAndAllowances',
  [InvoiceType.SALES_RETURNS_DUPLICATE_AND_NON_UNIFORM]: 'returnsAndAllowances',
  [InvoiceType.SALES_TRIPLICATE_CASH_REGISTER_AND_ELECTRONIC]: 'cashRegisterTriplicate',
  [InvoiceType.SALES_NON_UNIFORM_INVOICE]: 'invoiceExempt',
};

export const purchasesCategories = {
  [InvoiceType.PURCHASE_TRIPLICATE_AND_ELECTRONIC]: 'uniformInvoice',
  [InvoiceType.PURCHASE_DUPLICATE_CASH_REGISTER_AND_OTHER]: 'otherTaxableVouchers',
  [InvoiceType.PURCHASE_RETURNS_TRIPLICATE_AND_ELECTRONIC]: 'returnsAndAllowances',
  [InvoiceType.PURCHASE_RETURNS_DUPLICATE_CASH_REGISTER_AND_OTHER]: 'returnsAndAllowances',
  [InvoiceType.PURCHASE_TRIPLICATE_CASH_REGISTER_AND_ELECTRONIC]: 'cashRegisterAndElectronic',
  [InvoiceType.PURCHASE_UTILITY_ELECTRONIC_INVOICE]: 'uniformInvoice',
  [InvoiceType.PURCHASE_SUMMARIZED_TRIPLICATE_AND_ELECTRONIC]: 'cashRegisterAndElectronic',
  [InvoiceType.PURCHASE_SUMMARIZED_DUPLICATE_CASH_REGISTER_AND_OTHER]: 'otherTaxableVouchers',
  [InvoiceType.PURCHASE_CUSTOMS_DUTY_PAYMENT]: 'customsDutyPayment',
  [InvoiceType.PURCHASE_CUSTOMS_DUTY_REFUND]: 'customsDutyPayment',
};

export const importsCategories = {
  [InvoiceType.FOREIGN_TAX_EXEMPT_GOODS]: 'taxExemptGoods',
  [InvoiceType.FOREIGN_SERVICE_PAYMENT]: 'foreignServices',
};
