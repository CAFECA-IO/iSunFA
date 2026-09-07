import { prisma } from "@/lib/prisma";

/**
 * Info: (20260817 - Luphia) 「文件與記憶」頁的文件來源（三種，歸屬方式各不相同）。
 *
 * 這一層只負責「哪些列屬於這個人」，不做合併與排序（那在 service）。
 * 三種來源的歸屬鍵刻意不統一成一個抽象——它們本來就不同，硬包成一層
 * 只會讓「為什麼這個人看得到這份文件」變得難以驗證：
 *
 * | 來源 | 歸屬 |
 * |---|---|
 * | PdfEditorDocument | `createdById`（直接欄位） |
 * | File（憑證附件） | 經 Journal / Voucher 的 `userId` 反查 |
 * | CarbonReportDraft | 經 Chatroom 的 `ownerPublicKey`（公鑰定址，不是 FK） |
 */

class UserDocumentRepository {
  // Info: (20260817 - Luphia) 使用者自己建立的 Markdown 文件
  async listPdfEditorDocuments(userId: string) {
    return prisma.pdfEditorDocument.findMany({
      where: { createdById: userId },
      // Info: (20260817 - Luphia) 不取 content：清單不需要內文，取了只是把全文搬進記憶體
      select: {
        id: true,
        token: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  /**
   * Info: (20260817 - Luphia) 上傳的憑證檔案。
   *
   * `File` 沒有 owner 欄位也沒有建立時間，兩者都得從掛載它的傳票／分錄取得。
   * 因此這裡以 Journal / Voucher 為主體查詢，而不是查 File 再回推——
   * 後者會漏掉「檔案存在但沒有任何歸屬」的孤兒列，而那些不該出現在
   * 任何人的文件清單裡。
   */
  async listEvidenceFiles(userId: string, limit: number) {
    const [journals, vouchers] = await Promise.all([
      prisma.journal.findMany({
        where: { userId, fileId: { not: null } },
        select: {
          createdAt: true,
          accountBookId: true,
          file: { select: { id: true, fileName: true } },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      prisma.voucher.findMany({
        where: { userId, fileId: { not: null } },
        select: {
          createdAt: true,
          accountBookId: true,
          file: { select: { id: true, fileName: true } },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
    ]);
    return { journals, vouchers };
  }

  /**
   * Info: (20260817 - Luphia) 碳盤查報告草稿，以聊天室的擁有者公鑰歸屬。
   *
   * 個人模式的草稿是 ECIES 端對端加密，**server 讀不到內容**——
   * 因此清單只能給存在與時間，不可能給摘要。這一點要誠實地傳到畫面上，
   * 否則使用者會以為系統看得到而我們選擇不顯示。
   */
  async listCarbonDrafts(ownerPublicKey: string, limit: number) {
    /**
     * Info: (20260818 - Luphia) 空值即回空，不進 Prisma（第三輪 D）。
     *
     * Prisma 對 `undefined` 的條件會**靜默忽略**——`where: { ownerPublicKey: undefined }`
     * 等於沒有條件，會列出全站的碳盤查草稿。型別目前擋得住，
     * 但那是唯一的防線，而它擋不住 `as` 或未來的簽章變動。
     */
    if (!ownerPublicKey) return [];

    return prisma.carbonReportDraft.findMany({
      where: { chatroom: { ownerPublicKey, archivedAt: null } },
      select: {
        id: true,
        updatedAt: true,
        plainContent: true,
        chatroom: {
          select: { channel: true, accountBookId: true },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
    });
  }
}

export const userDocumentRepo = new UserDocumentRepository();
