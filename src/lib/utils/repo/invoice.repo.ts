// // Info (20240526 - Murky): Prisma

// import prisma from '@/client';
// import { ProgressStatus } from '@/constants/account';
// import { JOURNAL_EVENT } from '@/constants/journal';
// import { STATUS_MESSAGE } from '@/constants/status_code';
// import { IInvoice, IInvoiceBeta } from '@/interfaces/invoice';
// import { IPayment, IPaymentBeta } from '@/interfaces/payment';
// import { timestampInSeconds } from '@/lib/utils/common';
// import { Ocr, Prisma } from '@prisma/client';
// import loggerBack, { loggerError } from '@/lib/utils/logger_back';

// export async function findUniqueOcrInPrisma(ocrId: number | undefined): Promise<{
//   id: number;
//   imageFileId: number;
// } | null> {
//   if (!ocrId) {
//     return null;
//   }
//   let ocrIdInDB: {
//     id: number;
//     imageFileId: number;
//   } | null;

//   try {
//     ocrIdInDB = await prisma.ocr.findUnique({
//       where: {
//         id: ocrId,
//         OR: [{ deletedAt: 0 }, { deletedAt: null }],
//       },
//       select: {
//         id: true,
//         imageFileId: true,
//       },
//     });
//   } catch (error) {
//     const logError = loggerError(
//       0,
//       'find unique ocr in findUniqueOcrInPrisma failed',
//       error as Error
//     );
//     logError.error(
//       'Prisma related find unique ocr in findUniqueOcrInPrisma in invoice.repo.ts failed'
//     );
//     throw new Error(STATUS_MESSAGE.DATABASE_READ_FAILED_ERROR);
//   }

//   return ocrIdInDB;
// }

// export async function updateOcrStatusInPrisma(ocrId: number, status: ProgressStatus) {
//   const now = Date.now();
//   const updatedAt = timestampInSeconds(now);

//   let ocr: Ocr;

//   try {
//     ocr = await prisma.ocr.update({
//       where: {
//         id: ocrId,
//       },
//       data: {
//         status,
//         updatedAt,
//       },
//     });
//   } catch (error) {
//     const logError = loggerError(
//       0,
//       'update ocr status in updateOcrStatusInPrisma failed',
//       error as Error
//     );
//     logError.error(
//       'Prisma related update ocr status in updateOcrStatusInPrisma in invoice.repo.ts failed'
//     );
//     throw new Error(STATUS_MESSAGE.DATABASE_UPDATE_FAILED_ERROR);
//   }

//   return ocr;
// }

// export async function findUniqueCompanyInPrisma(companyId: number) {
//   let company: {
//     id: number;
//   } | null = null;

//   try {
//     company = await prisma.company.findUnique({
//       where: { id: companyId, OR: [{ deletedAt: 0 }, { deletedAt: null }] },
//       select: { id: true },
//     });
//   } catch (error) {
//     const logError = loggerError(
//       0,
//       'find unique company in findUniqueCompanyInPrisma failed',
//       error as Error
//     );
//     logError.error(
//       'Prisma related find unique company in findUniqueCompanyInPrisma in invoice.repo.ts failed'
//     );
//     throw new Error(STATUS_MESSAGE.DATABASE_READ_FAILED_ERROR);
//   }

//   if (!company) {
//     throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
//   }

//   return company;
// }

// export async function findUniqueJournalInPrisma(journalId: number, companyId?: number) {
//   let journal: {
//     id: number;
//     projectId: number | null;
//     invoice: {
//       id: number;
//     } | null;
//   } | null;

//   try {
//     journal = await prisma.journal.findUnique({
//       where: { id: journalId, companyId, OR: [{ deletedAt: 0 }, { deletedAt: null }] },
//       select: {
//         id: true,
//         projectId: true,
//         invoice: {
//           select: {
//             id: true,
//           },
//         },
//       },
//     });
//   } catch (error) {
//     const logError = loggerError(
//       0,
//       'find unique journal in findUniqueJournalInPrisma failed',
//       error as Error
//     );
//     logError.error(
//       'Prisma related find unique journal in findUniqueJournalInPrisma in invoice.repo.ts failed'
//     );
//     throw new Error(STATUS_MESSAGE.DATABASE_READ_FAILED_ERROR);
//   }
//   return journal;
// }

// export async function createPaymentInPrisma(paymentData: IPaymentBeta) {
//   const now = Date.now();
//   const nowTimestamp = timestampInSeconds(now);
//   let payment: {
//     id: number;
//   };

//   try {
//     payment = await prisma.payment.create({
//       data: {
//         ...paymentData,
//         createdAt: nowTimestamp,
//         updatedAt: nowTimestamp,
//       },
//       select: {
//         id: true,
//       },
//     });
//   } catch (error) {
//     const logError = loggerError(
//       0,
//       'create payment in createPaymentInPrisma failed',
//       error as Error
//     );
//     logError.error(
//       'Prisma related create payment in createPaymentInPrisma in invoice.repo.ts failed'
//     );
//     throw new Error(STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR);
//   }
//   return payment;
// }

// export async function updatePaymentInPrisma(paymentId: number, paymentData: IPayment) {
//   const now = Date.now();
//   const updatedAt = timestampInSeconds(now);
//   const payment = await prisma.payment.update({
//     where: {
//       id: paymentId,
//     },
//     data: {
//       ...paymentData,
//       updatedAt,
//     },
//     select: {
//       id: true,
//     },
//   });
//   return payment;
// }

// export async function findUniqueInvoiceInPrisma(invoiceId: number, companyId?: number) {
//   let invoice: IInvoiceIncludePaymentJournal | null = null;

//   const where: Prisma.InvoiceWhereUniqueInput = {
//     id: invoiceId,
//     journal: {
//       companyId,
//     },
//   };

//   const include = {
//     payment: true,
//     journal: {
//       include: {
//         project: true,
//         contract: true,
//       },
//     },
//   };

//   try {
//     invoice = await prisma.invoice.findUnique({
//       where,
//       include,
//     });

//     if (!invoice) {
//       loggerBack.error('Invoice not found');
//     }
//   } catch (error) {
//     const logError = loggerError(
//       0,
//       'find unique invoice in findUniqueInvoiceInPrisma failed',
//       error as Error
//     );
//     logError.error(
//       'Prisma related find unique invoice in findUniqueInvoiceInPrisma in invoice.repo.ts failed'
//     );
//     throw new Error(STATUS_MESSAGE.DATABASE_READ_FAILED_ERROR);
//   }
//   return invoice;
// }

// export async function createInvoiceInPrisma(
//   invoiceData: IInvoiceBeta,
//   paymentId: number,
//   journalId: number,
//   imageFileId: number | undefined
// ) {
//   let invoice: {
//     id: number;
//   };

//   const now = Date.now();
//   const nowTimestamp = timestampInSeconds(now);
//   const invoiceCreatedDate = timestampInSeconds(invoiceData.date);
//   try {
//     invoice = await prisma.invoice.create({
//       data: {
//         number: invoiceData.number,
//         type: invoiceData.type,
//         date: invoiceCreatedDate,
//         eventType: invoiceData.eventType,
//         paymentReason: invoiceData.paymentReason,
//         description: invoiceData.description,
//         vendorTaxId: invoiceData.vendorTaxId,
//         vendorOrSupplier: invoiceData.vendorOrSupplier,
//         deductible: invoiceData.deductible,
//         imageFileId,
//         paymentId,
//         journalId,
//         createdAt: nowTimestamp,
//         updatedAt: nowTimestamp,
//       },
//       select: {
//         id: true,
//       },
//     });
//   } catch (error) {
//     const logError = loggerError(
//       0,
//       'create invoice in createInvoiceInPrisma failed',
//       error as Error
//     );
//     logError.error(
//       'Prisma related create invoice in createInvoiceInPrisma in invoice.repo.ts failed'
//     );
//     throw new Error(STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR);
//   }

//   return invoice;
// }

// export async function createInvoiceAndPaymentInPrisma(
//   invoiceData: IInvoiceBeta,
//   journalId: number,
//   imageFileId: number | undefined
// ) {
//   const paymentData = invoiceData.payment;
//   // Info (20240807 - Jacky): 這邊是為了讓payment的taxPrice可以被存入prisma
//   const taxPrice = paymentData.price * paymentData.taxPercentage;
//   const paymentDataBeta = { ...paymentData, taxPrice };

//   let createdInvoiceId: number;
//   try {
//     createdInvoiceId = await prisma.$transaction(async () => {
//       const payment = await createPaymentInPrisma(paymentDataBeta);
//       const invoice = await createInvoiceInPrisma(invoiceData, payment.id, journalId, imageFileId);
//       return invoice.id;
//     });
//   } catch (error) {
//     const logError = loggerError(
//       0,
//       'create invoice and payment in createInvoiceAndPaymentInPrisma failed',
//       error as Error
//     );
//     logError.error(
//       'Prisma related create invoice or payment in createInvoiceAndPaymentInPrisma in invoice.repo.ts failed'
//     );
//     throw new Error(STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR);
//   }

//   return createdInvoiceId;
// }

// export async function updateInvoiceInPrisma(
//   invoiceId: number,
//   paymentId: number,
//   invoiceData: IInvoice,
//   journalId: number,
//   imageFileId: number | undefined
// ) {
//   let invoice: {
//     id: number;
//   };

//   const now = Date.now();
//   const updatedAt = timestampInSeconds(now);
//   const invoiceCreatedDate = timestampInSeconds(invoiceData.date);

//   try {
//     invoice = await prisma.invoice.update({
//       where: {
//         id: invoiceId,
//       },
//       data: {
//         date: invoiceCreatedDate,
//         eventType: invoiceData.eventType,
//         paymentReason: invoiceData.paymentReason,
//         description: invoiceData.description,
//         vendorOrSupplier: invoiceData.vendorOrSupplier,
//         updatedAt,
//         imageFileId,
//         paymentId,
//         journalId,
//       },
//     });
//   } catch (error) {
//     const logError = loggerError(
//       0,
//       'update invoice in updateInvoiceInPrisma failed',
//       error as Error
//     );
//     logError.error(
//       'Prisma related update invoice in updateInvoiceInPrisma in invoice.repo.ts failed'
//     );
//     throw new Error(STATUS_MESSAGE.DATABASE_UPDATE_FAILED_ERROR);
//   }

//   return invoice;
// }

// export async function updateInvoiceAndPaymentInPrisma(
//   invoiceIdToBeUpdated: number,
//   invoiceData: IInvoice,
//   journalId: number,
//   imageFileId?: number
// ) {
//   const paymentData = invoiceData.payment;

//   let updatedInvoiceId: number = -1;

//   try {
//     const invoiceInDB = await findUniqueInvoiceInPrisma(invoiceIdToBeUpdated);

//     if (!invoiceInDB) {
//       throw new Error(STATUS_MESSAGE.DATABASE_UPDATE_FAILED_ERROR);
//     }

//     const payment = await updatePaymentInPrisma(invoiceInDB.paymentId, paymentData);
//     const invoice = await updateInvoiceInPrisma(
//       invoiceIdToBeUpdated,
//       payment.id,
//       invoiceData,
//       journalId,
//       imageFileId
//     );

//     updatedInvoiceId = invoice.id;
//   } catch (error) {
//     const logError = loggerError(
//       0,
//       'update invoice and payment in updateInvoiceAndPaymentInPrisma failed',
//       error as Error
//     );
//     logError.error(
//       'Prisma related update invoice or payment in updateInvoiceAndPaymentInPrisma in invoice.repo.ts failed'
//     );
//   }
//   return updatedInvoiceId;
// }

// export async function createJournalInPrisma(
//   projectId: number | null,
//   aichResultId: string,
//   contractId: number | null,
//   companyId: number,
//   event: JOURNAL_EVENT = JOURNAL_EVENT.UPLOADED
// ) {
//   const now = Date.now();
//   const nowTimestamp = timestampInSeconds(now);
//   const data: Prisma.JournalCreateInput = {
//     company: {
//       connect: {
//         id: companyId,
//       },
//     },
//     aichResultId,
//     event,
//     createdAt: nowTimestamp,
//     updatedAt: nowTimestamp,
//   };

//   if (projectId !== null) {
//     data.project = {
//       connect: {
//         id: projectId,
//       },
//     };
//   }

//   if (contractId !== null) {
//     data.contract = {
//       connect: {
//         id: contractId,
//       },
//     };
//   }

//   let journal: {
//     id: number;
//   };

//   try {
//     journal = await prisma.journal.create({
//       data,
//       select: {
//         id: true,
//       },
//     });
//   } catch (error) {
//     const logError = loggerError(
//       0,
//       'create journal in createJournalInPrisma failed',
//       error as Error
//     );
//     logError.error(
//       'Prisma related create journal in createJournalInPrisma in invoice.repo.ts failed'
//     );
//     throw new Error(STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR);
//   }

//   return journal.id;
// }

// export async function updateJournalInPrisma(
//   journalId: number,
//   aichResultId: string,
//   projectId: number | null,
//   contractId: number | null
// ) {
//   const data: Prisma.JournalUpdateInput = {
//     aichResultId,
//   };

//   if (projectId !== null) {
//     data.project = {
//       connect: {
//         id: projectId,
//       },
//     };
//   }

//   if (contractId !== null) {
//     data.contract = {
//       connect: {
//         id: contractId,
//       },
//     };
//   }

//   let journal: {
//     id: number;
//   };
//   try {
//     journal = await prisma.journal.update({
//       where: {
//         id: journalId,
//       },
//       data,
//       select: {
//         id: true,
//       },
//     });
//   } catch (error) {
//     const logError = loggerError(
//       0,
//       'update journal in updateJournalInPrisma failed',
//       error as Error
//     );
//     logError.error(
//       'Prisma related update journal in updateJournalInPrisma in invoice.repo.ts failed'
//     );
//     throw new Error(STATUS_MESSAGE.DATABASE_UPDATE_FAILED_ERROR);
//   }

//   return journal.id;
// }

// // Info: (20240524 - Murky) Main logics
// export async function handlePrismaSavingLogic(
//   formattedInvoice: IInvoiceBeta,
//   aichResultId: string,
//   companyId: number,
//   ocrId: number | undefined
// ) {
//   try {
//     const { projectId, contractId } = formattedInvoice;

//     let journalIdBeCreated: number = -1;

//     try {
//       const ocrIdInDB = await findUniqueOcrInPrisma(ocrId);

//       const company = await findUniqueCompanyInPrisma(companyId);

//       journalIdBeCreated = await createJournalInPrisma(
//         projectId,
//         aichResultId,
//         contractId,
//         company.id
//       );

//       await createInvoiceAndPaymentInPrisma(
//         formattedInvoice,
//         journalIdBeCreated,
//         ocrIdInDB?.imageFileId
//       );

//       // Info: (20240524 - Murky) 更新ocr的狀態, 等到其他db操作都沒有錯誤後才更新
//       if (ocrIdInDB?.id) {
//         await updateOcrStatusInPrisma(ocrIdInDB.id, ProgressStatus.HAS_BEEN_USED);
//       }
//     } catch (error) {
//       const logError = loggerError(0, 'handlePrismaSavingLogic failed', error as Error);
//       logError.error('Prisma related func. in handlePrismaSavingLogic in invoice.repo.ts failed');
//     }

//     return journalIdBeCreated;
//   } catch (error) {
//     const logError = loggerError(0, 'handlePrismaSavingLogic failed', error as Error);
//     logError.error('Prisma related func. in handlePrismaSavingLogic in invoice.repo.ts failed');
//     throw new Error(STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR);
//   }
// }

// export async function handlePrismaUpdateLogic(
//   formattedInvoice: IInvoice,
//   aichResultId: string,
//   companyId: number
// ) {
//   const { journalId, projectId, contractId } = formattedInvoice;
//   if (!journalId) {
//     throw new Error(STATUS_MESSAGE.INVALID_INPUT_TYPE);
//   }

//   let journalIdBeUpdated: number = -1;
//   try {
//     const journalInDB = await findUniqueJournalInPrisma(journalId, companyId);

//     if (!journalInDB || !journalInDB.invoice) {
//       throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
//     }

//     const invoiceIdToBeUpdated = journalInDB.invoice.id;

//     if (!invoiceIdToBeUpdated) {
//       throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
//     }

//     const invoiceBeUpdated = await updateInvoiceAndPaymentInPrisma(
//       invoiceIdToBeUpdated,
//       formattedInvoice,
//       journalId
//     );

//     if (invoiceBeUpdated === -1) {
//       throw new Error(STATUS_MESSAGE.DATABASE_UPDATE_FAILED_ERROR);
//     }

//     journalIdBeUpdated = await updateJournalInPrisma(
//       journalId,
//       aichResultId,
//       projectId,
//       contractId
//     );
//   } catch (error) {
//     const logError = loggerError(0, 'handlePrismaUpdateLogic failed', error as Error);
//     logError.error('Prisma related func. in handlePrismaUpdateLogic in invoice.repo.ts failed');
//   }

//   return journalIdBeUpdated;
// }
