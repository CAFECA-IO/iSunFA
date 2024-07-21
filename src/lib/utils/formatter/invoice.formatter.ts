import { IInvoice, IInvoiceIncludePaymentJournal } from "@/interfaces/invoice";
import { convertStringToEventType, convertStringToPaymentPeriodType, convertStringToPaymentStatusType } from "@/lib/utils/type_guard/account";

export function formatIInvoice(invoiceFromDB: IInvoiceIncludePaymentJournal): IInvoice {
    const invoice: IInvoice = {
      journalId: invoiceFromDB.journalId,
      date: invoiceFromDB.date,
      eventType: convertStringToEventType(invoiceFromDB.eventType),
      paymentReason: invoiceFromDB.paymentReason,
      description: invoiceFromDB.description,
      vendorOrSupplier: invoiceFromDB.vendorOrSupplier,
      projectId: invoiceFromDB.journal.projectId,
      project: invoiceFromDB.journal?.project?.name || null,
      contractId: invoiceFromDB.journal.contractId,
      contract: invoiceFromDB.journal?.contract?.name || null,
      payment: {
        isRevenue: invoiceFromDB.payment.isRevenue,
        price: invoiceFromDB.payment.price,
        hasTax: invoiceFromDB.payment.hasTax,
        taxPercentage: invoiceFromDB.payment.taxPercentage,
        hasFee: invoiceFromDB.payment.hasFee,
        fee: invoiceFromDB.payment.fee,
        method: invoiceFromDB.payment.method,
        period: convertStringToPaymentPeriodType(invoiceFromDB.payment.period),
        installmentPeriod: invoiceFromDB.payment.installmentPeriod,
        alreadyPaid: invoiceFromDB.payment.alreadyPaid,
        status: convertStringToPaymentStatusType(invoiceFromDB.payment.status),
        progress: invoiceFromDB.payment.progress,
      },
    };
    return invoice;
}
