import { IInvoice } from '@/interfaces/invoice';
import {
  IJournal,
  IJournalFromPrismaIncludeProjectContractInvoiceVoucher,
  IJournalListItem,
} from '@/interfaces/journal';
import { IVoucherDataForSavingToDB } from '@/interfaces/voucher';
import {
  convertStringToEventType,
  convertStringToPaymentPeriodType,
  convertStringToPaymentStatusType,
} from '@/lib/utils/type_guard/account';
import { sumLineItemsAndReturnBiggest } from '@/lib/utils/line_item';
import { assertIsJournalEvent } from '@/lib/utils/type_guard/journal';

export function formatSingleIJournalListItem(
  journalFromPrisma: IJournalFromPrismaIncludeProjectContractInvoiceVoucher
): IJournalListItem {
  const { credit, debit } = sumLineItemsAndReturnBiggest(journalFromPrisma?.voucher?.lineItems);

  assertIsJournalEvent(journalFromPrisma.event);
  return {
    id: journalFromPrisma.id,
    date: journalFromPrisma.createdAt,
    type: journalFromPrisma.invoice?.eventType,
    particulars: journalFromPrisma.invoice?.description,
    fromTo: journalFromPrisma.invoice?.vendorOrSupplier,
    event: journalFromPrisma.event,
    account: [debit, credit],
    projectName: journalFromPrisma.project?.name,
    projectImageId: journalFromPrisma.project?.imageId,
    voucherId: journalFromPrisma.voucher?.id,
    voucherNo: journalFromPrisma.voucher?.no,
  };
}

export function formatIJournalListItems(
  journalsFromPrisma: IJournalFromPrismaIncludeProjectContractInvoiceVoucher[]
): IJournalListItem[] {
  const journalLineItems = journalsFromPrisma.map((journalFromPrisma) => {
    return formatSingleIJournalListItem(journalFromPrisma);
  });
  return journalLineItems;
}

export function formatIJournal(
  journalFromPrisma: IJournalFromPrismaIncludeProjectContractInvoiceVoucher
): IJournal {
  const projectName = journalFromPrisma?.project?.name;
  const { projectId } = journalFromPrisma;
  const contractName = journalFromPrisma?.contract?.name;
  const { contractId } = journalFromPrisma;
  const imageUrl = journalFromPrisma.invoice?.imageUrl || null;

  const invoice: IInvoice = journalFromPrisma.invoice
    ? {
        journalId: journalFromPrisma.id,
        date: journalFromPrisma.invoice.date,
        eventType: convertStringToEventType(journalFromPrisma.invoice.eventType),
        paymentReason: journalFromPrisma.invoice.paymentReason,
        description: journalFromPrisma.invoice.description,
        vendorOrSupplier: journalFromPrisma.invoice.vendorOrSupplier,
        projectId,
        project: projectName || null,
        contractId,
        contract: contractName || null,
        payment: {
          isRevenue: journalFromPrisma.invoice.payment.isRevenue,
          price: journalFromPrisma.invoice.payment.price,
          hasTax: journalFromPrisma.invoice.payment.hasTax,
          taxPercentage: journalFromPrisma.invoice.payment.taxPercentage,
          hasFee: journalFromPrisma.invoice.payment.hasFee,
          fee: journalFromPrisma.invoice.payment.fee,
          method: journalFromPrisma.invoice.payment.method,
          period: convertStringToPaymentPeriodType(journalFromPrisma.invoice.payment.period),
          installmentPeriod: journalFromPrisma.invoice.payment.installmentPeriod,
          alreadyPaid: journalFromPrisma.invoice.payment.alreadyPaid,
          status: convertStringToPaymentStatusType(journalFromPrisma.invoice.payment.status),
          progress: journalFromPrisma.invoice.payment.progress,
        },
      }
    : ({} as IInvoice);

  const voucher: IVoucherDataForSavingToDB = journalFromPrisma.voucher
    ? {
        journalId: journalFromPrisma.id,
        lineItems: journalFromPrisma.voucher.lineItems.map((lineItem) => {
          return {
            lineItemIndex: lineItem.id.toString(),
            amount: lineItem.amount,
            debit: lineItem.debit,
            account: lineItem.account.name,
            description: lineItem.description,
            accountId: lineItem.account.id,
          };
        }),
      }
    : ({} as IVoucherDataForSavingToDB);

  assertIsJournalEvent(journalFromPrisma.event);
  return {
    id: journalFromPrisma.id,
    tokenContract: journalFromPrisma.tokenContract || '',
    tokenId: journalFromPrisma.tokenId || '',
    aichResultId: journalFromPrisma.aichResultId || '',
    projectId: projectId || 0,
    contractId: contractId || 0,
    imageUrl: imageUrl || '',
    event: journalFromPrisma.event,
    invoice,
    voucher,
  };
}
