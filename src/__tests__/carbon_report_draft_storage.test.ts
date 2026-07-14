// Info: (20260714 - Emily) localStorage 報告草稿/sessions 索引儲存模組測試:round-trip、壞資料 Fail Fast、版本不符丟棄
// Info: (20260714 - Emily) jest 為 node 環境(未裝 jsdom),以記憶體 stub 模擬 window.localStorage

import {
  describe,
  it,
  expect,
  beforeEach,
  beforeAll,
  afterAll,
} from "@jest/globals";

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
import {
  loadReportDraft,
  saveReportDraft,
  clearReportDraft,
  loadSessionsIndex,
  saveSessionsIndex,
} from "@/lib/carbon_report_draft_storage";
import {
  buildCarbonReportDraftKey,
  buildCarbonSessionsIndexKey,
} from "@/constants/carbon_chatbot";
import { buildInitialParagraphs } from "@/constants/carbon_chatbot.session";
import { IReportData } from "@/types/carbon_chatbot.types";

const CHANNEL = "carbon-chat-0xtest-2025";
const ADDRESS = "0xtest";

const buildReportData = (): IReportData => ({
  documentName: "Carbon_Report_Draft_2025.pdf",
  title: "2025 溫室氣體盤查報告",
  section: "",
  categories: [],
  paragraphs: buildInitialParagraphs(),
  totalEmissions: 0,
});

describe("carbon_report_draft_storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("should round-trip a report draft", () => {
    const data = buildReportData();
    saveReportDraft(CHANNEL, data);
    expect(loadReportDraft(CHANNEL)).toEqual(data);
  });

  it("should return null when no draft exists", () => {
    expect(loadReportDraft(CHANNEL)).toBeNull();
  });

  it("should discard and remove tampered data (fail fast)", () => {
    const key = buildCarbonReportDraftKey(CHANNEL);
    window.localStorage.setItem(key, "{not-json");
    expect(loadReportDraft(CHANNEL)).toBeNull();
    expect(window.localStorage.getItem(key)).toBeNull();

    window.localStorage.setItem(
      key,
      JSON.stringify({ version: 1, savedAt: "x", reportData: { bad: true } }),
    );
    expect(loadReportDraft(CHANNEL)).toBeNull();
    expect(window.localStorage.getItem(key)).toBeNull();
  });

  it("should discard drafts with a mismatched schema version", () => {
    const key = buildCarbonReportDraftKey(CHANNEL);
    saveReportDraft(CHANNEL, buildReportData());
    const stored = JSON.parse(window.localStorage.getItem(key) as string);
    stored.version = 999;
    window.localStorage.setItem(key, JSON.stringify(stored));
    expect(loadReportDraft(CHANNEL)).toBeNull();
  });

  it("should clear a draft", () => {
    saveReportDraft(CHANNEL, buildReportData());
    clearReportDraft(CHANNEL);
    expect(loadReportDraft(CHANNEL)).toBeNull();
  });

  it("should isolate drafts per channel", () => {
    const data = buildReportData();
    saveReportDraft(CHANNEL, data);
    expect(loadReportDraft("carbon-chat-0xtest-other")).toBeNull();
  });

  it("should round-trip the sessions index and reject tampered entries", () => {
    const sessions = [
      { id: "2025", title: "2025 溫室氣體盤查報告", createdAt: "2026/7/14" },
    ];
    saveSessionsIndex(ADDRESS, sessions);
    expect(loadSessionsIndex(ADDRESS)).toEqual(sessions);

    window.localStorage.setItem(
      buildCarbonSessionsIndexKey(ADDRESS),
      JSON.stringify({ version: 1, sessions: [{ id: "" }] }),
    );
    expect(loadSessionsIndex(ADDRESS)).toBeNull();
  });
});
