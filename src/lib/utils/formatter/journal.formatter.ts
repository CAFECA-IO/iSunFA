import { IJournalFromPrismaIncludeProjectInvoiceVoucher, IJournalListItem } from "@/interfaces/journal";

export function formatSingleIJournalListItem(journalFromPrisma: IJournalFromPrismaIncludeProjectInvoiceVoucher): IJournalListItem {
  return {
    id: journalFromPrisma.id,
    date: journalFromPrisma.createdAt,
    type: journalFromPrisma.invoice?.eventType,
    particulars: journalFromPrisma.invoice?.description,
    fromTo: journalFromPrisma.invoice?.vendorOrSupplier,
    account: journalFromPrisma.voucher?.lineItems.map((lineItem) => {
      return {
          id: lineItem.id,
          debit: lineItem.debit,
          account: lineItem.account.name,
          amount: lineItem.amount,
      };
    }),
    projectName: journalFromPrisma.project?.name,
    projectImageId: journalFromPrisma.project?.imageId,
    voucherId: journalFromPrisma.voucher?.id,
    voucherNo: journalFromPrisma.voucher?.no,
  };
}

export function formatIJournalListItems(journalsFromPrisma: IJournalFromPrismaIncludeProjectInvoiceVoucher[]): IJournalListItem[] {
  const journalLineItems = journalsFromPrisma.map((journalFromPrisma) => formatSingleIJournalListItem(journalFromPrisma));
  return journalLineItems;
}
