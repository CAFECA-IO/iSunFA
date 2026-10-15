import {
  OBSERVATORY_RETRIEVAL_CANDIDATES,
  OBSERVATORY_SEARCH_MODE,
} from "@/constants/company_observatory";
import { IObservatoryVectorRow } from "@/interfaces/company_observatory";
import { reciprocalRankFusion } from "@/lib/company_observatory/rank_fusion";
import { vectorDimensionOf } from "@/lib/company_observatory/lance_schema";
import type { IObservatoryScoredRow } from "@/repositories/observatory_vector.repo";
import { searchObservatoryChunks } from "@/services/company_observatory/company_observatory.indexer.service";

// Info: (20261015 - Luphia) 只用記憶體假物件：不載入 Prisma 與 LanceDB 原生模組
jest.mock("@/lib/prisma", () => ({ prisma: {} }));
jest.mock("@/services/lancedb.service", () => ({ lanceDBService: {} }));

/**
 * Info: (20261015 - Luphia) 企業觀測站混合檢索：RRF 融合、向量維度讀取、向量＋全文兩路合併。
 */

const id = (item: { id: string }) => item.id;

describe("reciprocalRankFusion", () => {
  it("ranks items found by both lists above items ranked first by only one", () => {
    const dense = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const lexical = [{ id: "d" }, { id: "b" }];
    expect(reciprocalRankFusion([dense, lexical], id).map(id)).toEqual([
      "b",
      "a",
      "d",
      "c",
    ]);
  });

  it("breaks ties by first appearance, so the order is deterministic", () => {
    const fused = reciprocalRankFusion([[{ id: "x" }], [{ id: "y" }]], id);
    expect(fused.map(id)).toEqual(["x", "y"]);
  });

  it("counts a key once per list even if the list repeats it", () => {
    // Info: (20261015 - Luphia) k = 0：a 只算 1/1 = 1；b = 1/1 + 1/2 = 1.5。若重複列也算分，a 會變成 1 + 1/2 + 1/3 而跑到前面
    const fused = reciprocalRankFusion(
      [
        [{ id: "a" }, { id: "a" }, { id: "a" }],
        [{ id: "b" }],
        [{ id: "c" }, { id: "b" }],
      ],
      id,
      0,
    );
    expect(fused.map(id)).toEqual(["b", "a", "c"]);
  });

  it("keeps the first list's object for a shared key", () => {
    const fused = reciprocalRankFusion(
      [[{ id: "a", from: "dense" }], [{ id: "a", from: "lexical" }]],
      id,
    );
    expect(fused).toEqual([{ id: "a", from: "dense" }]);
  });
});

describe("vectorDimensionOf", () => {
  it("reads the FixedSizeList size of the vector column", () => {
    expect(
      vectorDimensionOf({
        fields: [
          { name: "text", type: {} },
          { name: "vector", type: { listSize: 1024 } },
        ],
      }),
    ).toBe(1024);
  });

  it("returns null when there is no vector column or no list size", () => {
    expect(vectorDimensionOf({ fields: [] })).toBeNull();
    expect(
      vectorDimensionOf({ fields: [{ name: "vector", type: "float" }] }),
    ).toBeNull();
  });
});

function row(rowId: string, extra: Partial<IObservatoryScoredRow> = {}) {
  const base: IObservatoryVectorRow = {
    id: rowId,
    vector: [],
    text: `text of ${rowId}`,
    document_id: "doc",
    stock_id: "1101",
    company_name: "台泥",
    source: "GHG_INVENTORY",
    year: 2024,
    source_url: "",
    page_number: 1,
    chunk_index: 0,
    content_hash: "",
  };
  return { ...base, ...extra };
}

describe("searchObservatoryChunks", () => {
  function setup() {
    const calls = {
      search: 0,
      searchText: 0,
      embed: 0,
      limits: [] as number[],
    };
    const deps = {
      embedder: {
        embed: async () => {
          calls.embed += 1;
          return [0.1, 0.2];
        },
      },
      vectors: {
        async replaceDocumentChunks() {
          return undefined;
        },
        async optimize() {
          return undefined;
        },
        async search(params: { limit: number }) {
          calls.search += 1;
          calls.limits.push(params.limit);
          return [
            row("water", { _distance: 0.4 }),
            row("scope1", { _distance: 0.5 }),
          ];
        },
        async searchText(params: { limit: number }) {
          calls.searchText += 1;
          calls.limits.push(params.limit);
          return [row("scope1", { _score: 9 }), row("eps", { _score: 3 })];
        },
      },
    };
    return { deps, calls };
  }
  const params = {
    query: "台泥 2024 年範疇一溫室氣體排放量是多少？",
    filter: { stockIds: ["1101"] },
    limit: 2,
  };

  it("fuses vector and full-text candidates (hybrid by default)", async () => {
    const { deps, calls } = setup();
    const hits = await searchObservatoryChunks(deps, params);
    expect(hits.map((h) => h.text)).toEqual([
      "text of scope1",
      "text of water",
    ]);
    // Info: (20261015 - Luphia) 只在全文結果出現的切塊沒有向量距離；兩路都有的保留向量距離
    expect(hits[0].distance).toBe(0.5);
    expect(calls.limits).toEqual([
      OBSERVATORY_RETRIEVAL_CANDIDATES,
      OBSERVATORY_RETRIEVAL_CANDIDATES,
    ]);
  });

  it("can run a single route for evaluation", async () => {
    const dense = setup();
    await searchObservatoryChunks(dense.deps, {
      ...params,
      mode: OBSERVATORY_SEARCH_MODE.DENSE,
    });
    expect(dense.calls).toMatchObject({ search: 1, searchText: 0, embed: 1 });

    const lexical = setup();
    const hits = await searchObservatoryChunks(lexical.deps, {
      ...params,
      mode: OBSERVATORY_SEARCH_MODE.LEXICAL,
    });
    expect(lexical.calls).toMatchObject({ search: 0, searchText: 1, embed: 0 });
    expect(hits.map((h) => h.distance)).toEqual([null, null]);
  });
});
