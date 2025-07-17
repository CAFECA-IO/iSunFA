import fs from 'fs';
import path from 'path';
import prisma from '@/client';
import { APITestHelper } from '@/tests/integration/setup/api_helper';
import { TestDataFactory } from '@/tests/integration/setup/test_data_factory';
import { UPLOAD_TYPE_TO_FOLDER_MAP, UploadType } from '@/constants/file';
import { createFile } from '@/lib/utils/repo/file.repo';
import * as cryptoUtils from '@/lib/utils/crypto';
import { IInvoiceRC2Input, IInvoiceRC2Output, IInvoiceRC2Base } from '@/interfaces/invoice_rc2';
import { InvoiceDirection } from '@/constants/invoice_rc2';

/** Info: (20250717 - Tzuhan)
 * 在整個整合測試階段持有「所有測試資料的 ID」
 * 方便在 globalTeardown / afterAll 做一次性清理。
 */
export interface SharedContext {
  helper: APITestHelper;
  multiUserHelper: APITestHelper;
  cookies: string[];
  userId: number;
  teamId: number;
  accountBookId: number;
  invoiceFileIds: {
    input: number;
    output: number;
  };
}

export class BaseTestContext {
  /** Info: (20250717 - Tzuhan) 真正存放資料的單例 */
  private static ctx: SharedContext | null = null;

  /** Info: (20250717 - Tzuhan) 解決多個 getSharedContext() 併發呼叫時的 race condition */
  private static initializing: Promise<SharedContext> | null = null;

  private static TEST_FILES_DIR = path.resolve(
    __dirname,
    '../test_cases/07_invoice_rc2/test_files'
  );

  private static cacheInput?: IInvoiceRC2Input;

  private static cacheOutput?: IInvoiceRC2Output;

  private constructor() {
    /* Info: (20250717 - Tzuhan) 禁止實例化 */
  }

  /**
   * Info: (20250717 - Tzuhan)
   * 取得全域 SharedContext（lazy 初始化 + 併發安心）
   */
  static async getSharedContext(): Promise<SharedContext> {
    if (this.ctx) return this.ctx;

    // Info: (20250717 - Tzuhan) 若已有初始化中的 Promise，直接等那個
    if (this.initializing) return this.initializing;

    this.initializing = (async () => {
      // Info: (20250717 - Tzuhan) 建立空殼，確保 recordXXX 在初始化途中也能安全使用
      this.ctx = {
        helper: undefined as unknown as APITestHelper,
        multiUserHelper: undefined as unknown as APITestHelper,
        cookies: [],
        userId: 0,
        teamId: 0,
        accountBookId: 0,
        invoiceFileIds: {
          input: 0,
          output: 0,
        },
      };

      // Info: (20250717 - Tzuhan) === ↓ 真正呼叫 API、產生測試基礎資料 ↓ ===
      const helper = await APITestHelper.createHelper({
        email: TestDataFactory.PRIMARY_TEST_EMAIL,
      });
      // Info: (20250717 - Tzuhan) Complete user registration with default values
      await helper.agreeToTerms();
      await helper.createUserRole();
      await helper.selectUserRole();

      const multiUserHelper = await APITestHelper.createHelper({
        emails: TestDataFactory.DEFAULT_TEST_EMAILS,
      });

      /** Info: (20250717 - Tzuhan) replace with createTestAccountBook
      // Info: (20250717 - Tzuhan) 建立 Team
      const teamRes = await helper.createTeam('IT Shared Team');
      const teamId = teamRes.body.payload!.id as number;

      // Info: (20250717 - Tzuhan) 取得 User
      const status = await helper.getStatusInfo();
      const userId = (status.body.payload!.user as { id: number }).id;
      */

      // Info: (20250717 - Tzuhan) 建立帳本
      const { id: accountBookId, userId, teamId } = await helper.createTestAccountBook();

      const [fileIdForInput, fileIdForOutput] = await Promise.all([
        BaseTestContext.uploadEncryptedFile('invoice_input', accountBookId),
        BaseTestContext.uploadEncryptedFile('invoice_output', accountBookId),
      ]);

      Object.assign(this.ctx, {
        helper,
        multiUserHelper,
        cookies: helper.getCurrentSession(),
        userId,
        teamId,
        accountBookId,
        invoiceFileIds: {
          input: fileIdForInput,
          output: fileIdForOutput,
        },
      });

      return this.ctx;
    })();

    return this.initializing;
  }

  // -----------------------------------------
  // Info: (20250717 - Tzuhan) 資料記錄工具
  // -----------------------------------------
  private static ensureCtx() {
    if (!this.ctx) throw new Error('BaseTestContext not initialized yet');
  }

  private static async uploadEncryptedFile(
    filename: 'invoice_input' | 'invoice_output',
    accountBookId: number
  ): Promise<number> {
    const pubKey = await cryptoUtils.getPublicKeyByCompany(accountBookId);
    const filePath = path.resolve(process.cwd(), BaseTestContext.TEST_FILES_DIR, `${filename}.png`);
    const fileBuffer = fs.readFileSync(filePath);
    const file = new File([fileBuffer], `${filename}.png`, { type: 'image/png' });

    const enc = await cryptoUtils.encryptFileWithPublicKey(file, pubKey!);
    const tempPath = path.resolve(
      process.cwd(),
      BaseTestContext.TEST_FILES_DIR,
      `temp_encrypted_${filename}.png`
    );

    const record = await createFile({
      name: enc.encryptedFile.name,
      size: enc.encryptedFile.size,
      mimeType: 'image/png',
      type: UPLOAD_TYPE_TO_FOLDER_MAP[UploadType.INVOICE],
      url: tempPath,
      isEncrypted: true,
      encryptedSymmetricKey: enc.encryptedSymmetricKey,
      iv: Buffer.from(enc.iv as Uint8Array),
    });
    if (!record?.id) {
      throw new Error(`upload ${filename} failed, ${JSON.stringify(record)}`);
    }

    return record.id;
  }

  static async createInvoice<T extends IInvoiceRC2Base>(direction: InvoiceDirection): Promise<T> {
    if (direction === InvoiceDirection.INPUT && BaseTestContext.cacheInput) {
      return BaseTestContext.cacheInput as T;
    }
    if (direction === InvoiceDirection.OUTPUT && BaseTestContext.cacheOutput) {
      return BaseTestContext.cacheOutput as T;
    }
    const fileId =
      direction === InvoiceDirection.INPUT
        ? this.ctx?.invoiceFileIds.input
        : this.ctx?.invoiceFileIds.output;

    const invoice = await this.ctx?.helper.createInvoice(
      direction,
      this.ctx.accountBookId,
      fileId!
    );

    if (direction === InvoiceDirection.INPUT) {
      this.cacheInput = invoice as IInvoiceRC2Input;
      return this.cacheInput as T;
    } else {
      this.cacheOutput = invoice as IInvoiceRC2Output;
      return this.cacheOutput as T;
    }
  }

  // -----------------------------------------
  // Info: (20250717 - Tzuhan) 清理 / 重設
  // -----------------------------------------
  /** Info: (20250717 - Tzuhan) 刪除 DB 中所有測試期間建立的資料，並斷線 */
  static async cleanup(): Promise<void> {
    if (!this.ctx) return;

    const userIds = await prisma.user
      .findMany({
        where: {
          email: { in: TestDataFactory.DEFAULT_TEST_EMAILS },
        },
        select: { id: true },
      })
      .then((users) => users.map((user) => user.id));

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
      // Info: (20250717 - Tzuhan) ① 先拿要清的 voucherId：自己 record 的 + 同一本帳的
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

    await prisma.$transaction([
      // Info: (20250717 - Tzuhan) ── asset_voucher / associate_line_item / voucher_salary_record / invoice_voucher_journal …
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
      // Info: (20250717 - Tzuhan) ── line_item 直接指 voucher
      prisma.lineItem.deleteMany({
        where: { voucherId: { in: voucherIdsToPurge } },
      }),
      // Info: (20250717 - Tzuhan) ── 現在才能刪 voucher
      prisma.voucher.deleteMany({
        where: { id: { in: voucherIdsToPurge } },
      }),
      // Info: (20250717 - Tzuhan) ── 如果還有 InvoiceRC2 連到 voucher，要在這裡把 voucherId 置空或一起刪
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
      prisma.inviteTeamMember.deleteMany({ where: { teamId: { in: orphanTeamIds } } }),
      prisma.teamSubscription.deleteMany({ where: { teamId: { in: orphanTeamIds } } }),
      prisma.teamMember.deleteMany({ where: { teamId: { in: orphanTeamIds } } }),
      prisma.notification.deleteMany({ where: { userId: { in: userIds } } }),
      prisma.team.deleteMany({ where: { id: { in: orphanTeamIds } } }),
      prisma.userActionLog.deleteMany({ where: { userId: { in: userIds } } }),
      prisma.userAgreement.deleteMany({ where: { userId: { in: userIds } } }),
      prisma.userRole.deleteMany({ where: { userId: { in: userIds } } }),
      prisma.authentication.deleteMany({ where: { userId: { in: userIds } } }),
      prisma.emailLogin.deleteMany({
        where: { email: { in: TestDataFactory.DEFAULT_TEST_EMAILS } },
      }),
      prisma.user.deleteMany({ where: { id: { in: userIds } } }),
    ]);

    // eslint-disable-next-line no-console
    console.log('BaseTestContext.cleanup() - All test data purged successfully.');
    await prisma.$disconnect();
  }

  /** Info: (20250717 - Tzuhan) 僅用於單元測試之間重設（不常用） */
  static resetForNextSuite() {
    this.ctx = null;
    this.initializing = null;
  }
}
