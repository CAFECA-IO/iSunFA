import { APITestHelper } from '@/tests/integration/setup/api_helper';
import { TestDataFactory } from '@/tests/integration/setup/test_data_factory';
import prisma from '@/client';
import { Registry } from '@/tests/integration/setup/test_data_registry';

/**
 * 在整個整合測試階段持有「所有測試資料的 ID」
 * 方便在 globalTeardown / afterAll 做一次性清理。
 */
export interface SharedContext {
  helper: APITestHelper;
  cookies: string[];
  userId: number;
  teamId: number;
  accountBookId: number;
}

export class BaseTestContext {
  /** 真正存放資料的單例 */
  private static ctx: SharedContext | null = null;

  /** 解決多個 getSharedContext() 併發呼叫時的 race condition */
  private static initializing: Promise<SharedContext> | null = null;

  private constructor() {
    /* 禁止實例化 */
  }

  /**
   * 取得全域 SharedContext（lazy 初始化 + 併發安心）
   */
  static async getSharedContext(): Promise<SharedContext> {
    if (this.ctx) return this.ctx;

    // 若已有初始化中的 Promise，直接等那個
    if (this.initializing) return this.initializing;

    this.initializing = (async () => {
      // 建立空殼，確保 recordXXX 在初始化途中也能安全使用
      this.ctx = {
        helper: undefined as unknown as APITestHelper,
        cookies: [],
        userId: 0,
        teamId: 0,
        accountBookId: 0,
      };

      // === ↓ 真正呼叫 API、產生測試基礎資料 ↓ ===
      const helper = await APITestHelper.createHelper({
        email: TestDataFactory.PRIMARY_TEST_EMAIL,
      });

      // Info: (20250717 - Tzuhan) Complete user registration with default values
      await helper.agreeToTerms();
      await helper.createUserRole();
      await helper.selectUserRole();

      // 建立 Team
      const teamRes = await helper.createTeam('IT Shared Team');
      const teamId = teamRes.body.payload!.id as number;

      // 取得 User
      const status = await helper.getStatusInfo();
      const userId = (status.body.payload!.user as { id: number }).id;

      // 建立帳本
      const bookRes = await helper.createAccountBook('IT Shared Book', teamId, `${userId}`);
      const accountBookId = bookRes.body.payload!.id as number;

      Object.assign(this.ctx, {
        helper,
        cookies: helper.getCurrentSession(),
        userId,
        teamId,
        accountBookId,
      });

      return this.ctx;
    })();

    return this.initializing;
  }

  // -----------------------------------------
  //  資料記錄工具
  // -----------------------------------------
  private static ensureCtx() {
    if (!this.ctx) throw new Error('BaseTestContext not initialized yet');
  }

  // -----------------------------------------
  //  清理 / 重設
  // -----------------------------------------
  /** 刪除 DB 中所有測試期間建立的資料，並斷線 */
  static async cleanup(): Promise<void> {
    if (!this.ctx) return;

    // 依 FK 先子後母順序刪除，缺省為最佳猜測，可依 Schema 調整
    const { voucherIds, invoiceIds, accountBookIds, teamIds, userIds } = Registry.getSnapshot();

    // eslint-disable-next-line no-console
    console.log(
      `[BaseTestContext] Cleaning up test data: userIds: ${userIds}, teamIds: ${teamIds}, accountBookIds: ${accountBookIds}, invoiceIds: ${invoiceIds}, voucherIds: ${voucherIds}`
    );

    const orphanAccountBookIds = await prisma.company
      .findMany({
        where: { userId: { in: userIds } },
        select: { id: true },
      })
      .then((abs) => abs.map((ab) => ab.id));

    const orphanTeamIds = await prisma.team
      .findMany({
        where: { ownerId: { in: userIds } },
        select: { id: true },
      })
      .then((teams) => teams.map((team) => team.id));

    const voucherIdsToPurge = await prisma.voucher
      // ① 先拿要清的 voucherId：自己 record 的 + 同一本帳的
      .findMany({
        where: { companyId: { in: orphanAccountBookIds } },
        select: { id: true },
      })
      .then((vs) => vs.map((v) => v.id));

    const invoiceIdsToPurge = await prisma.invoiceRC2
      .findMany({
        where: { accountBookId: { in: orphanAccountBookIds } },
        select: { id: true },
      })
      .then((ins) => ins.map((i) => i.id));

    // const accountingSettingIds = await prisma.accountingSetting
    //   .findMany({
    //     where: {
    //       companyId: { in: orphanAccountBookIds },
    //     },
    //     select: { id: true },
    //   })
    //   .then((settings) => settings.map((setting) => setting.id));

    // const companySettingIds = await prisma.companySetting
    //   .findMany({
    //     where: {
    //       companyId: { in: orphanAccountBookIds },
    //     },
    //     select: { id: true },
    //   })
    //   .then((settings) => settings.map((setting) => setting.id));

    const teamSubscriptionIds = await prisma.teamSubscription
      .findMany({
        where: {
          teamId: { in: orphanTeamIds },
        },
        select: { id: true },
      })
      .then((subs) => subs.map((sub) => sub.id));

    const teamMemberIds = await prisma.teamMember
      .findMany({
        where: {
          teamId: { in: orphanTeamIds },
        },
        select: { id: true },
      })
      .then((members) => members.map((member) => member.id));

    const invitedTeamMemberIds = await prisma.inviteTeamMember
      .findMany({
        where: {
          teamId: { in: orphanTeamIds },
        },
        select: { id: true },
      })
      .then((invites) => invites.map((invite) => invite.id));

    const notificationIds = await prisma.notification
      .findMany({
        where: {
          userId: { in: userIds },
        },
        select: { id: true },
      })
      .then((notifications) => notifications.map((notification) => notification.id));

    const userActionLogIds = await prisma.userActionLog
      .findMany({
        where: {
          userId: { in: userIds },
        },
        select: { id: true },
      })
      .then((logs) => logs.map((log) => log.id));

    const userAgreementIds = await prisma.userAgreement
      .findMany({
        where: {
          userId: { in: userIds },
        },
        select: { id: true },
      })
      .then((agreements) => agreements.map((agreement) => agreement.id));

    const userRoleIds = await prisma.userRole
      .findMany({
        where: {
          userId: { in: userIds },
        },
        select: { id: true },
      })
      .then((roles) => roles.map((role) => role.id));

    const authenticationIds = await prisma.authentication
      .findMany({
        where: {
          userId: { in: userIds },
        },
        select: { id: true },
      })
      .then((auths) => auths.map((auth) => auth.id));

    const emailLoginIds = await prisma.emailLogin
      .findMany({
        where: {
          email: { in: TestDataFactory.DEFAULT_TEST_EMAILS },
        },
        select: { id: true },
      })
      .then((emailLogins) => emailLogins.map((emailLogin) => emailLogin.id));

    await prisma.$transaction([
      // ── asset_voucher / associate_line_item / voucher_salary_record / invoice_voucher_journal …
      prisma.associateLineItem.deleteMany({
        where: {
          OR: [
            { originalLineItem: { voucherId: { in: voucherIdsToPurge } } },
            { resultLineItem: { voucherId: { in: voucherIdsToPurge } } },
          ],
        },
      }),
      prisma.associateVoucher.deleteMany({
        where: {
          OR: [
            { originalVoucherId: { in: voucherIdsToPurge } },
            { resultVoucherId: { in: voucherIdsToPurge } },
          ],
        },
      }),
      prisma.assetVoucher.deleteMany({ where: { voucherId: { in: voucherIdsToPurge } } }),
      prisma.voucherSalaryRecord.deleteMany({ where: { voucherId: { in: voucherIdsToPurge } } }),
      prisma.invoiceVoucherJournal.deleteMany({ where: { voucherId: { in: voucherIdsToPurge } } }),

      // ── line_item 直接指 voucher
      prisma.lineItem.deleteMany({
        where: { voucherId: { in: voucherIdsToPurge } },
      }),
      // ── 現在才能刪 voucher
      prisma.voucher.deleteMany({
        where: { id: { in: voucherIdsToPurge } },
      }),

      // ── 如果還有 InvoiceRC2 連到 voucher，要在這裡把 voucherId 置空或一起刪
      prisma.invoiceRC2.updateMany({
        where: { voucherId: { in: voucherIdsToPurge } },
        data: { voucherId: null },
      }),
      prisma.invoiceRC2.deleteMany({
        where: { id: { in: invoiceIdsToPurge } },
      }),
      prisma.accountingSetting.deleteMany({
        where: { companyId: { in: orphanAccountBookIds } },
      }),
      prisma.companySetting.deleteMany({
        where: { companyId: { in: orphanAccountBookIds } },
      }),
      prisma.account.deleteMany({
        where: { companyId: { in: orphanAccountBookIds } },
      }),
      prisma.company.deleteMany({
        where: { id: { in: orphanAccountBookIds } },
      }),
      prisma.inviteTeamMember.deleteMany({ where: { id: { in: invitedTeamMemberIds } } }),
      prisma.teamSubscription.deleteMany({ where: { id: { in: teamSubscriptionIds } } }),
      prisma.teamMember.deleteMany({ where: { id: { in: teamMemberIds } } }),
      prisma.notification.deleteMany({ where: { id: { in: notificationIds } } }),
      prisma.team.deleteMany({ where: { id: { in: orphanTeamIds } } }),
      prisma.userActionLog.deleteMany({ where: { id: { in: userActionLogIds } } }),
      prisma.userAgreement.deleteMany({ where: { id: { in: userAgreementIds } } }),
      prisma.userRole.deleteMany({ where: { id: { in: userRoleIds } } }),
      prisma.authentication.deleteMany({ where: { id: { in: authenticationIds } } }),
      prisma.emailLogin.deleteMany({ where: { id: { in: emailLoginIds } } }),
      prisma.user.deleteMany({ where: { id: { in: userIds } } }),
    ]);

    await prisma.$disconnect();
  }

  /** 僅用於單元測試之間重設（不常用） */
  static resetForNextSuite() {
    this.ctx = null;
    this.initializing = null;
  }
}
