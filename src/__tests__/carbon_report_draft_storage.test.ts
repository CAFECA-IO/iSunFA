// Info: (20260714 - Emily) 報告草稿 DB 化測試:service 樂觀鎖衝突包裝 + PUT schema + sessions 標題快取(localStorage stub)

import {
  describe,
  it,
  expect,
  jest,
  beforeEach,
  beforeAll,
  afterAll,
} from "@jest/globals";
import { CarbonReportDraftService } from "@/services/carbon_report_draft.service";
import { CarbonReportDraftRepository } from "@/repositories/carbon_report_draft.repo";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import {
  CarbonReportDraftPutSchema,
  CarbonReportDataSchema,
} from "@/validators";
import { buildInitialParagraphs } from "@/constants/carbon_chatbot.session";

const CHANNEL = "carbon-chat-0xtest-2025";

const putPayload = {
  channel: CHANNEL,
  version: 0,
  recipientPublicKey: "xpub-test",
  envelope: {
    encryptedContent: "base64-ciphertext",
    ephemeralPublicKey: "0x04abc",
    keyDerivationHint: "m/1/2",
    algorithm: "ECIES-secp256k1-AES-256-GCM",
  },
};

const buildMockRepo = (
  upsertResult: { version: number } | null | Error,
): CarbonReportDraftRepository => {
  const upsertByChannel = jest.fn<() => Promise<unknown>>();
  if (upsertResult instanceof Error) {
    upsertByChannel.mockRejectedValue(upsertResult);
  } else {
    upsertByChannel.mockResolvedValue(upsertResult);
  }
  return {
    upsertByChannel,
    findByChannel: jest.fn(),
  } as unknown as CarbonReportDraftRepository;
};

describe("CarbonReportDraftService.saveDraft", () => {
  it("should return the new version on success", async () => {
    const service = new CarbonReportDraftService(buildMockRepo({ version: 3 }));
    await expect(service.saveDraft(putPayload)).resolves.toEqual({
      version: 3,
    });
  });

  it("should raise a version conflict when the repo reports a stale version", async () => {
    const service = new CarbonReportDraftService(buildMockRepo(null));
    await expect(service.saveDraft(putPayload)).rejects.toMatchObject({
      code: API_ERRORS.VL_DRAFT_VERSION_CONFLICT.code,
    });
  });

  it("should wrap raw Prisma errors as IS_DB_FAILED", async () => {
    const service = new CarbonReportDraftService(
      buildMockRepo(new Error("Unique constraint P2002 secret detail")),
    );
    await expect(service.saveDraft(putPayload)).rejects.toMatchObject({
      code: API_ERRORS.IS_DB_FAILED.code,
      message: API_ERRORS.IS_DB_FAILED.message,
    });
  });
});

describe("CarbonReportDraftPutSchema", () => {
  it("should accept a valid put payload", () => {
    expect(CarbonReportDraftPutSchema.safeParse(putPayload).success).toBe(true);
  });

  it("should reject a negative version", () => {
    const result = CarbonReportDraftPutSchema.safeParse({
      ...putPayload,
      version: -1,
    });
    expect(result.success).toBe(false);
  });

  it("should reject an empty ciphertext", () => {
    const result = CarbonReportDraftPutSchema.safeParse({
      ...putPayload,
      envelope: { ...putPayload.envelope, encryptedContent: "" },
    });
    expect(result.success).toBe(false);
  });

  /**
   * Info: (20260810 - Emily) 「envelope 與 plainContent 恰一」這條 refine 的兩側。
   *
   * 補這兩支的理由不是覆蓋率:`carbon_envelope_invariant` 刻意**不**在 repo 擋
   * 「兩者皆有」,理由是「那是 schema 的業務規則」—— 而那句話原本沒有任何測試支撐。
   * 於是分層論述只有一半被驗證:repo 不擋(有測)、schema 會擋(沒測)。
   * 哪天有人動了這條 refine,repo 那支測試照樣全綠,而不變式已經整條消失 ——
   * 那正是本次 review 第 6 點那個 bug 的形狀:驗的東西與實際生效的東西不是同一個。
   *
   * 對應的另一半在 src/__tests__/carbon_envelope_invariant.test.ts。
   */
  it("should reject carrying both an envelope and plainContent", () => {
    const result = CarbonReportDraftPutSchema.safeParse({
      ...putPayload,
      plainContent: "# 報告",
    });
    expect(result.success).toBe(false);
  });

  it("should reject carrying neither an envelope nor plainContent", () => {
    const result = CarbonReportDraftPutSchema.safeParse({
      ...putPayload,
      envelope: undefined,
    });
    expect(result.success).toBe(false);
  });
});

describe("CarbonReportDataSchema", () => {
  it("should accept a decrypted report data payload", () => {
    const result = CarbonReportDataSchema.safeParse({
      documentName: "Carbon_Report_Draft_2025.pdf",
      title: "2025 溫室氣體盤查報告",
      section: "",
      categories: [],
      paragraphs: buildInitialParagraphs(),
      totalEmissions: 0,
    });
    expect(result.success).toBe(true);
  });

  it("should reject tampered plaintext (fail fast before entering state)", () => {
    expect(CarbonReportDataSchema.safeParse({ bad: true }).success).toBe(false);
  });
});

// Info: (20260714 - Emily) sessions 標題快取仍走 localStorage,以記憶體 stub 驗證 round-trip 與壞資料丟棄
const createLocalStorageStub = (): Storage => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  } as Storage;
};

describe("sessions index cache", () => {
  beforeAll(() => {
    Object.defineProperty(globalThis, "window", {
      value: { localStorage: createLocalStorageStub() },
      configurable: true,
      writable: true,
    });
  });

  afterAll(() => {
    delete (globalThis as { window?: unknown }).window;
  });

  beforeEach(() => {
    window.localStorage.clear();
  });

  it("should round-trip the sessions index and reject tampered entries", async () => {
    const { loadSessionsIndex, saveSessionsIndex } =
      await import("@/lib/carbon_report_draft_storage");
    const { buildCarbonSessionsIndexKey } =
      await import("@/constants/carbon_chatbot");

    const sessions = [
      { id: "2025", title: "2025 溫室氣體盤查報告", createdAt: "2026/7/14" },
    ];
    saveSessionsIndex("0xtest", sessions);
    expect(loadSessionsIndex("0xtest")).toEqual(sessions);

    window.localStorage.setItem(
      buildCarbonSessionsIndexKey("0xtest"),
      JSON.stringify({ version: 1, sessions: [{ id: "" }] }),
    );
    expect(loadSessionsIndex("0xtest")).toBeNull();
  });
});
