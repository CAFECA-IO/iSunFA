import { IJournal, IJournalListItem } from '@/interfaces/journal';
import { sumLineItemsAndReturnBiggest } from '@/lib/utils/line_item';
import { assertIsJournalEvent } from '@/lib/utils/type_guard/journal';
import {
  Account,
  Certificate,
  File,
  Invoice,
  InvoiceVoucherJournal,
  Journal,
  LineItem,
  Voucher,
} from '@prisma/client';
import { formatIInvoice } from './invoice.formatter';

export function formatSingleIJournalListItem(
  invoiceVoucherJournal: InvoiceVoucherJournal & {
    journal: Journal | null;
    invoice: Invoice | null;
    voucher: (Voucher & { lineItems: (LineItem & { account: Account })[] }) | null;
  }
): IJournalListItem {
  const { credit, debit } = sumLineItemsAndReturnBiggest(invoiceVoucherJournal?.voucher?.lineItems);

  assertIsJournalEvent(invoiceVoucherJournal.voucher?.status);
  return {
    id: invoiceVoucherJournal.journalId,
    date: invoiceVoucherJournal.invoice?.date || invoiceVoucherJournal.createdAt,
    type: invoiceVoucherJournal.voucher?.type,
    particulars: invoiceVoucherJournal.description,
    fromTo: invoiceVoucherJournal.vendorOrSupplier,
    event: invoiceVoucherJournal.voucher.status,
    account: [debit, credit],
    projectName: '',
    projectImageId: '',
    voucherId: invoiceVoucherJournal.voucher?.id,
    voucherNo: invoiceVoucherJournal.voucher?.no,
  };
}

export function formatIJournalListItems(
  journalsFromPrisma: (InvoiceVoucherJournal & {
    journal: Journal | null;
    invoice: Invoice | null;
    voucher: (Voucher & { lineItems: (LineItem & { account: Account })[] }) | null;
  })[]
): IJournalListItem[] {
  const journalLineItems = journalsFromPrisma.map((invoiceVoucherJournal) => {
    return formatSingleIJournalListItem(invoiceVoucherJournal);
  });
  return journalLineItems;
}

export function formatIJournal(
  invoiceVoucherJournal: InvoiceVoucherJournal & {
    journal: Journal | null;
    invoice: (Invoice & { certificate: Certificate & { file: File } }) | null;
    voucher: (Voucher & { lineItems: (LineItem & { account: Account })[] }) | null;
  }
): IJournal {
  assertIsJournalEvent(invoiceVoucherJournal.voucher?.status);
  return {
    id: invoiceVoucherJournal.journalId,
    tokenContract: '',
    tokenId: '',
    aichResultId: invoiceVoucherJournal.journal?.aichResultId || '',
    projectId: 0,
    contractId: 0,
    imageUrl: invoiceVoucherJournal.invoice?.certificate.file.url || '',
    event: invoiceVoucherJournal.voucher.status,
    invoice: formatIInvoice(invoiceVoucherJournal),
    voucher: {
      journalId: invoiceVoucherJournal.journalId,
      lineItems: invoiceVoucherJournal.voucher.lineItems.map((lineItem) => {
        return {
          lineItemIndex: lineItem.id.toString(),
          amount: lineItem.amount,
          debit: lineItem.debit,
          account: `${lineItem.account.code} - ${lineItem.account.name}`,
          description: lineItem.description,
          accountId: lineItem.account.id,
        };
      }),
    },
  };
}
