import prisma from '@/client';

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
