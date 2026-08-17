import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;
import { listUserDocuments } from "@/services/user_document.service";
import { userDocumentRepo } from "@/repositories/user_document.repo";
import { USER_DOCUMENT_KIND } from "@/interfaces/user_document";
import {
  memoryItemId,
  removeMemoryItem,
  type IFaithMemoryItem,
} from "@/lib/faith_memory/items";
import { FAITH_MEMORY_CATEGORY } from "@/constants/faith_memory";

/**
 * Info: (20260817 - Luphia) 「文件與記憶」頁的兩個資料來源。
 *
 * 文件那一半合併三種來源，而它們的歸屬方式各不相同；要釘死的是
 * **同一份檔案不會因為被多筆傳票引用而重複出現**，以及
 * **端對端加密的文件會被標出來**——後者不是裝飾，不標的話使用者會以為
 * 系統看得到內容而選擇不顯示。
 */

jest.mock("@/repositories/user_document.repo", () => ({
  userDocumentRepo: {
    listPdfEditorDocuments: jest.fn(async () => []),
    listEvidenceFiles: jest.fn(async () => ({ journals: [], vouchers: [] })),
    listCarbonDrafts: jest.fn(async () => []),
  },
}));

const asMock = (fn: unknown) => fn as ReturnType<typeof jest.fn>;
const at = (sec: number) => new Date(sec * 1000);

beforeEach(() => {
  jest.clearAllMocks();
  asMock(userDocumentRepo.listPdfEditorDocuments).mockResolvedValue([]);
  asMock(userDocumentRepo.listEvidenceFiles).mockResolvedValue({
    journals: [],
    vouchers: [],
  });
  asMock(userDocumentRepo.listCarbonDrafts).mockResolvedValue([]);
});

const list = () =>
  listUserDocuments({ userId: "u1", address: "0xabc", limit: 50 });

describe("listUserDocuments", () => {
  it("合併三種來源並依時間由新到舊排序", async () => {
    asMock(userDocumentRepo.listPdfEditorDocuments).mockResolvedValue([
      { id: "d1", token: "tok12345678", isActive: false, updatedAt: at(100) },
    ]);
    asMock(userDocumentRepo.listEvidenceFiles).mockResolvedValue({
      journals: [
        {
          createdAt: at(300),
          accountBookId: "book-1",
          file: { id: "f1", fileName: "invoice.pdf" },
        },
      ],
      vouchers: [],
    });
    asMock(userDocumentRepo.listCarbonDrafts).mockResolvedValue([
      {
        id: "c1",
        updatedAt: at(200),
        plainContent: null,
        chatroom: { channel: "carbon-1", accountBookId: null },
      },
    ]);

    const docs = await list();

    expect(docs.map((d) => d.id)).toEqual(["f1", "c1", "d1"]);
  });

  /**
   * Info: (20260817 - Luphia) 同一份檔案可能掛在多筆傳票上。不去重的話，
   * 一張發票會重複出現，而使用者無從分辨那是「上傳了好幾次」還是「被引用多次」。
   */
  it("同一份檔案被多筆傳票引用時只出現一次", async () => {
    asMock(userDocumentRepo.listEvidenceFiles).mockResolvedValue({
      journals: [
        {
          createdAt: at(300),
          accountBookId: "book-1",
          file: { id: "f1", fileName: "invoice.pdf" },
        },
      ],
      vouchers: [
        {
          createdAt: at(200),
          accountBookId: "book-1",
          file: { id: "f1", fileName: "invoice.pdf" },
        },
      ],
    });

    const docs = await list();
    expect(docs.filter((d) => d.id === "f1")).toHaveLength(1);
  });

  /**
   * Info: (20260817 - Luphia) 個人模式的草稿是端對端加密（plainContent 為 null），
   * 帳本模式才是伺服器可讀的明文。兩者的「誰讀得到」確實不同，含糊其詞比不說更糟。
   */
  it("依 plainContent 判定草稿是否為端對端加密", async () => {
    asMock(userDocumentRepo.listCarbonDrafts).mockResolvedValue([
      {
        id: "personal",
        updatedAt: at(200),
        plainContent: null,
        chatroom: { channel: "p", accountBookId: null },
      },
      {
        id: "book",
        updatedAt: at(100),
        plainContent: "{}",
        chatroom: { channel: "b", accountBookId: "book-1" },
      },
    ]);

    const docs = await list();
    expect(docs.find((d) => d.id === "personal")?.encrypted).toBe(true);
    expect(docs.find((d) => d.id === "book")?.encrypted).toBe(false);
  });

  it("標出仍在分享中的文件", async () => {
    asMock(userDocumentRepo.listPdfEditorDocuments).mockResolvedValue([
      { id: "d1", token: "tok12345678", isActive: true, updatedAt: at(100) },
    ]);

    const docs = await list();
    expect(docs[0]).toMatchObject({
      kind: USER_DOCUMENT_KIND.PDF_EDITOR,
      shared: true,
    });
  });

  it("以 limit 截斷", async () => {
    asMock(userDocumentRepo.listPdfEditorDocuments).mockResolvedValue(
      Array.from({ length: 10 }, (_, i) => ({
        id: `d${i}`,
        token: `tok${i}0000000`,
        isActive: false,
        updatedAt: at(i),
      })),
    );

    const docs = await listUserDocuments({
      userId: "u1",
      address: "0xabc",
      limit: 3,
    });
    expect(docs).toHaveLength(3);
  });

  it("沒有任何文件時回空陣列", async () => {
    expect(await list()).toEqual([]);
  });
});

/**
 * Info: (20260817 - Luphia) 逐條刪除靠的是這個推導出來的 id。
 * 它必須在合併之間保持穩定，否則使用者按下刪除時刪掉的會是另一條。
 */
describe("memoryItemId", () => {
  const item = (statement: string, updatedAt: number): IFaithMemoryItem => ({
    category: FAITH_MEMORY_CATEGORY.ANSWER_STYLE,
    statement,
    updatedAt,
  });

  it("同一條記憶的 id 不隨時間變動", () => {
    expect(memoryItemId(item("回答請簡短", 100))).toBe(
      memoryItemId(item("回答請簡短", 999)),
    );
  });

  it("正規化後相同者視為同一條", () => {
    expect(memoryItemId(item("回答 請簡短", 1))).toBe(
      memoryItemId(item("回答請簡短", 1)),
    );
  });

  it("不同內容是不同的 id", () => {
    expect(memoryItemId(item("回答請簡短", 1))).not.toBe(
      memoryItemId(item("回答請詳細", 1)),
    );
  });

  it("不同分類的相同文字是不同的 id", () => {
    expect(
      memoryItemId({
        category: FAITH_MEMORY_CATEGORY.ANSWER_STYLE,
        statement: "偏好",
        updatedAt: 1,
      }),
    ).not.toBe(
      memoryItemId({
        category: FAITH_MEMORY_CATEGORY.REPORT_FORMAT,
        statement: "偏好",
        updatedAt: 1,
      }),
    );
  });
});

describe("removeMemoryItem", () => {
  const a: IFaithMemoryItem = {
    category: FAITH_MEMORY_CATEGORY.ANSWER_STYLE,
    statement: "回答請簡短",
    updatedAt: 1,
  };
  const b: IFaithMemoryItem = {
    category: FAITH_MEMORY_CATEGORY.TERMINOLOGY,
    statement: "稱我為林會計",
    updatedAt: 2,
  };

  it("移除指定的那一條，其餘保留", () => {
    const result = removeMemoryItem([a, b], memoryItemId(a));
    expect(result.removed).toBe(true);
    expect(result.items).toEqual([b]);
  });

  // Info: (20260817 - Luphia) 重複點刪除是常見操作，「已經不在了」不是錯誤
  it("找不到時回原陣列且 removed 為 false", () => {
    const result = removeMemoryItem([a, b], "notexist");
    expect(result.removed).toBe(false);
    expect(result.items).toHaveLength(2);
  });
});
