export enum AICH_APIS_TYPES {
  UPLOAD_OCR = 'upload_ocr',
  GET_OCR_RESULT_ID = 'get_ocr_result_id',
  GET_OCR_RESULT = 'get_ocr_result',
  UPLOAD_INVOICE = 'upload_invoice',
  GET_INVOICE_RESULT_ID = 'get_invoice_result_id',
  GET_INVOICE_RESULT = 'get_invoice_result',
  GET_VOUCHER_RESULT = 'get_voucher_result',
  GET_CONTRACT_RESULT = 'get_contract_result',
}

/**
 * Info: (20241106 - Murky)
 * @description AICH 可以回傳的 AI 結果類型
 */
export enum AI_TYPE {
  CERTIFICATE = 'certificate',
  VOUCHER = 'voucher',
  HELP = 'help',
}
