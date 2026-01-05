import prisma from '@/client';
import { ICreateCertificateOptions, IFaithCertificate } from '@/interfaces/faith';
import { getTimestampNow } from '@/lib/utils/common';
import { Prisma } from '@prisma/client';

const listCertificatesBySessionId = async (sessionId: number): Promise<IFaithCertificate[]> => {
  const certificates = await prisma.faithCertificate.findMany({
    where: { faithSessionId: sessionId },
    include: {
      taxInfo: true,
      voucherInfo: {
        include: {
          lineItems: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  const result: IFaithCertificate[] = certificates.map((certificate) => ({
    id: certificate.id.toString(),
    name: certificate.name,
    description: certificate.description,
    image: certificate.image,
    taxInfo: {
      invoiceNo: certificate.taxInfo[0].invoiceNo || null,
      issueDate: certificate.taxInfo[0].issueDate || null,
      tradingPartner: {
        name: certificate.taxInfo[0].tradingPartnerName || null,
        taxId: certificate.taxInfo[0].tradingPartnerTaxId || null,
      },
      taxType: certificate.taxInfo[0].taxType || null,
      taxRate: certificate.taxInfo[0].taxRate || null,
      salesAmount: certificate.taxInfo[0].salesAmount || null,
      tax: certificate.taxInfo[0].tax || null,
    },
    voucherInfo: {
      voucherType: certificate.voucherInfo[0].voucherType,
      voucherNo: certificate.voucherInfo[0].voucherNo,
      issueDate: certificate.voucherInfo[0].issueDate,
      description: certificate.voucherInfo[0].description,
      lineItems: certificate.voucherInfo[0].lineItems.map((item) => ({
        account: {
          name: item.accountName,
          code: item.accountCode,
        },
        description: item.description,
        debit: item.debit,
        amount: item.amount,
      })),
      sum: {
        debit: true,
        amount: new Prisma.Decimal(0),
      },
    },
  }));

  return result;
};

const createCertificate = async (
  options: ICreateCertificateOptions
): Promise<IFaithCertificate> => {
  const nowInSecond = getTimestampNow();
  const newCertificate = await prisma.faithCertificate.create({
    data: {
      faithSessionId: options.id,
      name: options.name,
      description: options.description,
      image: options.image,
      taxInfo: {
        create: {
          invoiceNo: options.taxInfo.invoiceNo,
          issueDate: options.taxInfo.issueDate,
          tradingPartnerName: options.taxInfo.tradingPartner.name,
          tradingPartnerTaxId: options.taxInfo.tradingPartner.taxId,
          taxType: options.taxInfo.taxType,
          taxRate: options.taxInfo.taxRate,
          salesAmount: options.taxInfo.salesAmount,
          tax: options.taxInfo.tax,
        },
      },
      voucherInfo: {
        create: {
          voucherType: options.voucherInfo.voucherType,
          voucherNo: options.voucherInfo.voucherNo,
          issueDate: options.voucherInfo.issueDate,
          description: options.voucherInfo.description,
          lineItems: {
            create: options.voucherInfo.lineItems.map((item) => ({
              accountName: item.account.name,
              accountCode: item.account.code,
              description: item.description,
              debit: item.debit,
              amount: item.amount,
            })),
          },
        },
      },
      createdAt: nowInSecond,
      updatedAt: nowInSecond,
    },
    include: {
      taxInfo: true,
      voucherInfo: {
        include: {
          lineItems: true,
        },
      },
    },
  });

  const sumAmount = newCertificate.voucherInfo[0].lineItems.reduce(
    (acc, item) => acc.plus(item.amount),
    new Prisma.Decimal(0)
  );

  const result: IFaithCertificate = {
    id: newCertificate.id.toString(),
    name: newCertificate.name,
    description: newCertificate.description,
    image: newCertificate.image,
    taxInfo: {
      invoiceNo: newCertificate.taxInfo[0]?.invoiceNo || null,
      issueDate: newCertificate.taxInfo[0]?.issueDate || null,
      tradingPartner: {
        name: newCertificate.taxInfo[0]?.tradingPartnerName || null,
        taxId: newCertificate.taxInfo[0]?.tradingPartnerTaxId || null,
      },
      taxType: newCertificate.taxInfo[0]?.taxType || null,
      taxRate: newCertificate.taxInfo[0]?.taxRate || null,
      salesAmount: newCertificate.taxInfo[0]?.salesAmount || null,
      tax: newCertificate.taxInfo[0]?.tax || null,
    },
    voucherInfo: {
      voucherType: newCertificate.voucherInfo[0].voucherType,
      voucherNo: newCertificate.voucherInfo[0].voucherNo,
      issueDate: newCertificate.voucherInfo[0].issueDate,
      description: newCertificate.voucherInfo[0].description,
      lineItems: newCertificate.voucherInfo[0].lineItems.map((item) => ({
        account: {
          name: item.accountName,
          code: item.accountCode,
        },
        description: item.description,
        debit: item.debit,
        amount: item.amount,
      })),
      sum: {
        debit: true,
        amount: sumAmount,
      },
    },
  };
  return result;
};

const deleteCertificate = async (id: number): Promise<void> => {
  // Info: (20251130 - Luphia) 若沒有指定 id，則不做任何處理
  if (!id) return;
  await prisma.faithCertificate.delete({ where: { id } });
};

export { listCertificatesBySessionId, createCertificate, deleteCertificate };
