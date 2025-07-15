import { PrismaClient } from '@prisma/client';

export default async function globalTeardown() {
  const prisma = new PrismaClient();
  const ctx = globalThis.TEST_CTX;
  if (ctx) {
    const { userId, teamId, accountBookId } = ctx;

    // eslint-disable-next-line no-console
    console.log(
      `Global Teardown: Deleting userId: ${userId}, teamId: ${teamId}, accountBookId: ${accountBookId}`
    );

    /**  Info: (20250715 - Tzuhan) 暫時不刪除
    // Info: (20250715 - Tzuhan) 1. 刪除 InvoiceRC2 測試資料，避免 FK 限制
    await prisma.invoiceRC2.deleteMany({ where: { accountBookId } });

    // Info: (20250715 - Tzuhan) 2. 刪除會計設定和公司設定
    await prisma.accountingSetting.deleteMany({ where: { companyId: accountBookId } });
    await prisma.companySetting.deleteMany({ where: { companyId: accountBookId } });

    // Info: (20250715 - Tzuhan) 3. 刪除其他與公司相關資源
    await prisma.voucher.deleteMany({ where: { companyId: accountBookId } });
    await prisma.contract.deleteMany({ where: { companyId: accountBookId } });
    await prisma.counterparty.deleteMany({ where: { companyId: accountBookId } });
    await prisma.asset.deleteMany({ where: { companyId: accountBookId } });
    await prisma.auditReport.deleteMany({ where: { companyId: accountBookId } });
    await prisma.department.deleteMany({ where: { companyId: accountBookId } });
    await prisma.employee.deleteMany({ where: { companyId: accountBookId } });
    await prisma.incomeExpense.deleteMany({ where: { companyId: accountBookId } });
    await prisma.journal.deleteMany({ where: { companyId: accountBookId } });
    await prisma.ocr.deleteMany({ where: { companyId: accountBookId } });
    await prisma.order.deleteMany({ where: { companyId: accountBookId } });
    await prisma.project.deleteMany({ where: { companyId: accountBookId } });
    await prisma.report.deleteMany({ where: { companyId: accountBookId } });
    await prisma.subscription.deleteMany({ where: { companyId: accountBookId } });

    // Info: (20250715 - Tzuhan) 4. 刪除所有 userId 關聯的公司 (accountBook)
    await prisma.company.deleteMany({ where: { userId } });

    // Info: (20250715 - Tzuhan) 5. 刪除 team
    await prisma.team.delete({ where: { id: teamId } });

    // Info: (20250715 - Tzuhan) 6. 刪除 user 相關資料
    await prisma.authentication.deleteMany({ where: { userId } });
    await prisma.userAgreement.deleteMany({ where: { userId } });
    await prisma.userRole.deleteMany({ where: { userId } });
    await prisma.userSetting.deleteMany({ where: { userId } });
    await prisma.externalUser.deleteMany({ where: { userId } });
    await prisma.userActionLog.deleteMany({ where: { userId } });

    // Info: (20250715 - Tzuhan) 7. 最後刪除 user
    await prisma.user.delete({ where: { id: userId } });
    */
  }
  await prisma.$disconnect();
}
