import { ILedgerHeader } from '@/interfaces/export_ledger';
import { exportLedgerFieldsSchema } from '@/lib/utils/zod_schema/export_ledger';

export enum ExportLedgerFileType {
  CSV = 'csv',
}

export const LedgerFieldsMap: Record<ILedgerHeader, string> = {
  accountId: '科目代碼',
  no: '科目編號',
  accountingTitle: '會計科目',
  voucherNumber: '傳票編號',
  voucherDate: '傳票日期',
  particulars: '摘要',
  debitAmount: '借方金額',
  creditAmount: '貸方金額',
  balance: '餘額',
};

export const ledgerAvailableFields = exportLedgerFieldsSchema.options.map((option) => option);
