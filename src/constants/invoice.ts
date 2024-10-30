// Info: (20241031 - Tzuhan) @Murky 這個enum的值我想改成翻譯檔的key，這樣可以直接用i18n的方式取得對應的語言檔
export enum InvoiceTypeUpdate {
  TRIPLACATE_INPUT = 'TRIPLACATE_INPUT',
  DUPILCATE_INPUT = 'DUPILCATE_INPUT',
  PROOF_OF_RETRUN_TRIPLACATE = 'PROOF_OF_RETRUN_TRIPLACATE',
  PROOF_OF_RETRUN_DUPILCATE = 'PROOF_OF_RETRUN_DUPILCATE',
  TRIPLACATE_GENERAL_TAX = 'TRIPLACATE_GENERAL_TAX',
  SUMMRY_REGISTRATION_TRIPLACATE = 'SUMMRY_REGISTRATION_TRIPLACATE',
  SUMMRY_REGISTRATION_DUPILCATE = 'SUMMRY_REGISTRATION_DUPILCATE',
  CUSTUMS_PAYMENT_CERTIFICATE = 'CUSTUMS_PAYMENT_CERTIFICATE',
  CUSTUMS_REFUND_DECLARATION = 'CUSTUMS_REFUND_DECLARATION',
}

export enum InvoiceType {
  /**
   * Info: (20241024 - Murky)
   * @description 進項三聯式、電子計算機統一發票
   */
  PURCHASE_TRIPLICATE_AND_ELECTRONIC = 'PurchaseTriplicateAndElectronic',

  /**
   * Info: (20241024 - Murky)
   * @description 進項二聯式、二聯式收銀機統一發票
   */
  PURCHASE_DUPLICATE_CASH_REGISTER_AND_OTHER = 'PurchaseDuplicateCashRegisterAndOther',

  /**
   * Info: (20241024 - Murky)
   * @description 三聯式、電子計算機及三聯式收銀機統一發票及一般稅額計算之電子發票之銷貨退回或折讓證明單
   */
  PURCHASE_RETURNS_TRIPLICATE_AND_ELECTRONIC = 'PurchaseReturnsTriplicateAndElectronic',

  /**
   * Info: (20241024 - Murky)
   * @description 二聯式收銀機統一發票及載有稅額之其他憑證之進貨退出或折讓證明單
   */
  PURCHASE_RETURNS_DUPLICATE_CASH_REGISTER_AND_OTHER = 'PurchaseReturnsDuplicateCashRegisterAndOther',

  /**
   * Info: (20241024 - Murky)
   * @description 進項三聯式收銀機統一發票及一般稅額計算之電子發票，每張稅額五百元以下之進項三聯式收銀機統一發票及一般稅額計算之電子發票
   */
  PURCHASE_TRIPLICATE_CASH_REGISTER_AND_ELECTRONIC = 'PurchaseTriplicateCashRegisterAndElectronic',

  /**
   * Info: (20241024 - Murky)
   * @description 進項公用事業電子發票字軌號碼得以公用事業產製抬頭為一百零五年一月以後已繳納之繳費通知單或已繳費憑證之載具流水號替代登錄
   */
  PURCHASE_UTILITY_ELECTRONIC_INVOICE = 'PurchaseUtilityElectronicInvoice',

  // Info: (20240718 - Jacky)
  /**
   * Info: (20241024 - Murky)
   * @description 彙總登錄每張稅額五百元以下之進項三聯式、電子計算機統一發票
   */
  PURCHASE_SUMMARIZED_TRIPLICATE_AND_ELECTRONIC = 'PurchaseSummarizedTriplicateAndElectronic',

  // Info: (20240718 - Jacky)
  /**
   * Info: (20241024 - Murky)
   * @description 彙總登錄每張稅額五百元以下之進項二聯式收銀機統一發票、載有稅額之其他憑證
   */
  PURCHASE_SUMMARIZED_DUPLICATE_CASH_REGISTER_AND_OTHER = 'PurchaseSummarizedDuplicateCashRegisterAndOther',

  /**
   * Info: (20241024 - Murky)
   * @description 進項海關代徵營業稅繳納證
   */
  PURCHASE_CUSTOMS_DUTY_PAYMENT = 'PurchaseCustomsDutyPayment',

  /**
   * Info: (20241024 - Murky)
   * @description  進項海關退還溢繳營業稅申報單
   */
  PURCHASE_CUSTOMS_DUTY_REFUND = 'PurchaseCustomsDutyRefund',

  /**
   * Info: (20241024 - Murky)
   * @description 銷項三聯式統一發票
   */
  SALES_TRIPLICATE_INVOICE = 'SalesTriplicateInvoice',

  /**
   * Info: (20241024 - Murky)
   * @description 銷項二聯式、二聯式收銀機統一發票
   */
  SALES_DUPLICATE_CASH_REGISTER_INVOICE = 'SalesDuplicateCashRegisterInvoice',

  /**
   * Info: (20241024 - Murky)
   * @description 三聯式、電子計算機、三聯式收銀機統一發票及一般稅額計算之電子發票之銷貨退回或折讓證明單
   */
  SALES_RETURNS_TRIPLICATE_AND_ELECTRONIC = 'SalesReturnsTriplicateAndElectronic',

  /**
   * Info: (20241024 - Murky)
   * @description 二聯式、二聯式收銀機統一發票及銷項免用統一發票之銷貨退回或折讓證明單
   */
  SALES_RETURNS_DUPLICATE_AND_NON_UNIFORM = 'SalesReturnsDuplicateAndNonUniform',

  /**
   * Info: (20241024 - Murky)
   * @description 銷項三聯式收銀機統一發票及一般稅額計算之電子發票
   */
  SALES_TRIPLICATE_CASH_REGISTER_AND_ELECTRONIC = 'SalesTriplicateCashRegisterAndElectronic',

  /**
   * Info: (20241024 - Murky)
   * @description 銷項免用統一發票
   */
  SALES_NON_UNIFORM_INVOICE = 'SalesNonUniformInvoice',

  /**
   * Info: (20241024 - Murky)
   * @description 銷項憑證、特種稅額計算之電子發票
   */
  SALES_SPECIAL_TAX_CALCULATION = 'SalesSpecialTaxCalculation',

  /**
   * Info: (20241024 - Murky)
   * @description 特種稅額之銷貨退回或折讓證明單
   */
  SALES_SPECIAL_TAX_RETURNS = 'SalesSpecialTaxReturns',

  /**
   * Info: (20241024 - Murky)
   * @description 進口勞務費用支付證明
   */
  FOREIGN_SERVICE_PAYMENT = 'ForeignServicePayment',

  /**
   * Info: (20241024 - Murky)
   * @description 進口免稅物品進口證明
   */
  FOREIGN_TAX_EXEMPT_GOODS = 'ForeignTaxExemptGoods',
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

/**
 * Info: (20241024 - Murky)
 * @direction Invoice 發生是因為產生收益還是費損
 * @enum [INPUT, OUTPUT] INPUT/OUTPUT
 */
export enum InvoiceTransactionDirection {
  INPUT = 'input',
  OUTPUT = 'output',
}

/**
 * Info: (20241024 - Murky)
 * @description 發票是應稅還是免稅, 零稅率包含在應稅
 */
export enum InvoiceTaxType {
  /**
   * Info: (20241024 - Murky)
   * @note 包含零稅率
   */
  TAXABLE = 'taxable',
  /**
   * Info: (20241024 - Murky)
   * @note ex: 離島機場免稅商店
   */
  TAX_FREE = 'tax free',
}
