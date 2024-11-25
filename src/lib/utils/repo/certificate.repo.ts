import prisma from '@/client';

import { PUBLIC_COUNTER_PARTY } from '@/constants/counterparty';
import { CurrencyType } from '@/constants/currency';
import { InvoiceTaxType, InvoiceTransactionDirection, InvoiceType } from '@/constants/invoice';
import loggerBack from '@/lib/utils/logger_back';
import { PostCertificateResponse } from '@/interfaces/certificate';

export async function countMissingCertificate(companyId: number) {
  const missingCertificatesCount = await prisma.certificate.count({
    where: {
      companyId, // 指定公司 ID
      NOT: {
        voucherCertificates: {
          some: {},
        },
      },
    },
  });

  return missingCertificatesCount;
}

export async function getOneCertificateByIdWithoutInclude(certificateId: number) {
  const certificate = await prisma.certificate.findUnique({
    where: {
      id: certificateId,
    },
  });

  return certificate;
}

export async function createCertificateWithEmptyInvoice(options: {
  nowInSecond: number;
  companyId: number;
  uploaderId: number;
  fileId: number;
  aiResultId?: string;
}) {
  const { nowInSecond, companyId, uploaderId, fileId, aiResultId } = options;

  let certificate: PostCertificateResponse | null = null;

  try {
    certificate = await prisma.certificate.create({
      data: {
        company: {
          connect: {
            id: companyId,
          },
        },
        uploader: {
          connect: {
            id: uploaderId,
          },
        },
        file: {
          connect: {
            id: fileId,
          },
        },
        aiResultId,
        createdAt: nowInSecond,
        updatedAt: nowInSecond,
        deletedAt: null,
        invoices: {
          create: {
            counterParty: {
              connect: {
                id: PUBLIC_COUNTER_PARTY.id,
              },
            },
            name: '',
            inputOrOutput: InvoiceTransactionDirection.INPUT,
            date: nowInSecond,
            no: '',
            currencyAlias: CurrencyType.TWD,
            priceBeforeTax: 0,
            taxType: InvoiceTaxType.TAXABLE,
            taxRatio: 0,
            taxPrice: 0,
            totalPrice: 0,
            type: InvoiceType.SALES_TRIPLICATE_INVOICE,
            deductible: false,
            createdAt: nowInSecond,
            updatedAt: nowInSecond,
            deletedAt: null,
          },
        },
      },
      include: {
        voucherCertificates: {
          include: {
            voucher: true,
          },
        },
        file: true,
        UserCertificate: true,
        invoices: {
          include: {
            counterParty: true,
          },
        },
        uploader: true,
      },
    });
  } catch (error) {
    loggerBack.error('createCertificateWithEmptyInvoice error', error);
  }

  return certificate;
}
