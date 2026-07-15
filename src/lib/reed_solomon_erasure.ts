/**
 * Info: (20260715 - Emily) 真實 Reed-Solomon Erasure Code 實作(GF(2^8) + Cauchy 生成矩陣)。
 * 回應 laria.ts 既有 ToDo(20251028 - Luphia):取代零填充的模擬實作。
 * 選型結論見 documents/architecture/decisions/adr_012_laria_reed_solomon.md:
 * 純 TS 零依賴(無 native/WASM 供應鏈與 segfault 風險),benchmark 4MB×8 encode 約 73ms。
 * 數學性質:系統矩陣 [I; Cauchy],Cauchy 矩陣任意方子陣非奇異,故任取 k 列必可逆,
 * 保證「任意遺失 ≤ parityShards 個切片」皆可精確還原。
 */

// Info: (20260715 - Emily) GF(2^8) 以 AES 慣用不可約多項式 0x11d 建 log/exp 表
const GF_PRIMITIVE_POLY = 0x11d;
const GF_SIZE = 256;
const GF_ORDER = 255;

const EXP_TABLE = new Uint8Array(GF_ORDER * 2 + 2);
const LOG_TABLE = new Uint8Array(GF_SIZE);

(() => {
  let x = 1;
  for (let i = 0; i < GF_ORDER; i++) {
    EXP_TABLE[i] = x;
    LOG_TABLE[x] = i;
    x <<= 1;
    if (x & GF_SIZE) x ^= GF_PRIMITIVE_POLY;
  }
  for (let i = GF_ORDER; i < EXP_TABLE.length; i++) {
    EXP_TABLE[i] = EXP_TABLE[i - GF_ORDER];
  }
})();

const gfMul = (a: number, b: number): number => {
  if (a === 0 || b === 0) return 0;
  return EXP_TABLE[LOG_TABLE[a] + LOG_TABLE[b]];
};

const gfInv = (a: number): number => {
  if (a === 0) throw new Error("[ReedSolomonErasure] GF(2^8) zero has no inverse");
  return EXP_TABLE[GF_ORDER - LOG_TABLE[a]];
};

/**
 * Info: (20260715 - Emily) 完整 64KB 乘法查表:MULT[c*256+b] = c·b。
 * 熱路徑(逐 byte 乘加)由兩次表查降為一次,是 benchmark 達標的關鍵。
 */
const MULT_TABLE = new Uint8Array(GF_SIZE * GF_SIZE);
for (let c = 0; c < GF_SIZE; c++) {
  for (let b = 0; b < GF_SIZE; b++) {
    MULT_TABLE[c * GF_SIZE + b] = gfMul(c, b);
  }
}

// Info: (20260715 - Emily) out ^= coeff · src(逐 byte GF 乘加,係數列以 subarray 釘住避免重複定址)
const mulAddInto = (out: Uint8Array, src: Uint8Array, coeff: number): void => {
  if (coeff === 0) return;
  const row = MULT_TABLE.subarray(coeff * GF_SIZE, coeff * GF_SIZE + GF_SIZE);
  const n = src.length;
  for (let b = 0; b < n; b++) {
    out[b] ^= row[src[b]];
  }
};

// Info: (20260715 - Emily) Gauss-Jordan 求 GF(2^8) 方陣之逆;理論上不會 singular(Cauchy 性質),防禦性保留檢查
const invertMatrix = (mat: Uint8Array[], k: number): Uint8Array[] => {
  const work = mat.map((r) => Uint8Array.from(r));
  const inv: Uint8Array[] = [];
  for (let i = 0; i < k; i++) {
    const r = new Uint8Array(k);
    r[i] = 1;
    inv.push(r);
  }
  for (let col = 0; col < k; col++) {
    let pivot = col;
    while (pivot < k && work[pivot][col] === 0) pivot++;
    if (pivot === k) throw new Error("[ReedSolomonErasure] singular matrix");
    [work[col], work[pivot]] = [work[pivot], work[col]];
    [inv[col], inv[pivot]] = [inv[pivot], inv[col]];
    const pivotInv = gfInv(work[col][col]);
    for (let x = 0; x < k; x++) {
      work[col][x] = gfMul(work[col][x], pivotInv);
      inv[col][x] = gfMul(inv[col][x], pivotInv);
    }
    for (let r = 0; r < k; r++) {
      if (r === col || work[r][col] === 0) continue;
      const factor = work[r][col];
      for (let x = 0; x < k; x++) {
        work[r][x] ^= gfMul(factor, work[col][x]);
        inv[r][x] ^= gfMul(factor, inv[col][x]);
      }
    }
  }
  return inv;
};

// Info: (20260715 - Emily) 讓出 event loop:單 stripe encode/reconstruct 約 73-75ms(4MB 切片),避免連續佔用
const yieldEventLoop = (): Promise<void> =>
  new Promise((resolve) => {
    setImmediate(resolve);
  });

export class ReedSolomonErasure {
  private readonly dataShards: number;

  private readonly parityShards: number;

  private readonly totalShards: number;

  // Info: (20260715 - Emily) 系統生成矩陣 [I(k); Cauchy(m×k)],C[j][i] = 1/((k+j) ⊕ i)
  private readonly matrix: Uint8Array[];

  constructor(dataShards: number, parityShards: number) {
    if (dataShards <= 0 || parityShards <= 0) {
      throw new Error("[ReedSolomonErasure] shard counts must be positive");
    }
    if (dataShards + parityShards > GF_SIZE) {
      throw new Error("[ReedSolomonErasure] dataShards + parityShards must be <= 256");
    }
    this.dataShards = dataShards;
    this.parityShards = parityShards;
    this.totalShards = dataShards + parityShards;

    const matrix: Uint8Array[] = [];
    for (let i = 0; i < dataShards; i++) {
      const row = new Uint8Array(dataShards);
      row[i] = 1;
      matrix.push(row);
    }
    for (let j = 0; j < parityShards; j++) {
      const row = new Uint8Array(dataShards);
      for (let i = 0; i < dataShards; i++) {
        row[i] = gfInv((dataShards + j) ^ i);
      }
      matrix.push(row);
    }
    this.matrix = matrix;
  }

  private assertShardLengths(shards: (Uint8Array | null)[]): number {
    let size = -1;
    for (let i = 0; i < shards.length; i++) {
      const shard = shards[i];
      if (!shard) continue;
      if (size === -1) size = shard.length;
      if (shard.length !== size) {
        throw new Error("[ReedSolomonErasure] all shards must have identical length");
      }
    }
    if (size <= 0) throw new Error("[ReedSolomonErasure] no shard data provided");
    return size;
  }

  /**
   * Info: (20260715 - Emily) 就地計算 parity:呼叫端提供 k 個資料切片 + m 個已配置的 parity buffer。
   * 介面與原模擬類別相同(laria.ts 呼叫端零改動)。
   */
  async encode(shards: Buffer[]): Promise<void> {
    if (shards.length !== this.totalShards) {
      throw new Error(
        `[ReedSolomonErasure] encode expects ${this.totalShards} shards, got ${shards.length}`,
      );
    }
    this.assertShardLengths(shards);
    await yieldEventLoop();
    for (let j = 0; j < this.parityShards; j++) {
      const out = shards[this.dataShards + j];
      out.fill(0);
      const coeffs = this.matrix[this.dataShards + j];
      for (let i = 0; i < this.dataShards; i++) {
        mulAddInto(out, shards[i], coeffs[i]);
      }
    }
  }

  /**
   * Info: (20260715 - Emily) 就地還原:null 代表遺失切片。存活切片 >= dataShards 即可全數重建,
   * 不足時 throw(絕不靜默回傳髒資料 — 取代舊模擬實作的零填充行為)。
   */
  async reconstruct(shards: (Buffer | null)[]): Promise<void> {
    if (shards.length !== this.totalShards) {
      throw new Error(
        `[ReedSolomonErasure] reconstruct expects ${this.totalShards} shards, got ${shards.length}`,
      );
    }
    const presentIdx: number[] = [];
    for (let i = 0; i < this.totalShards && presentIdx.length < this.dataShards; i++) {
      if (shards[i]) presentIdx.push(i);
    }
    const presentTotal = shards.reduce((acc, s) => acc + (s ? 1 : 0), 0);
    if (presentTotal < this.dataShards) {
      throw new Error(
        `[ReedSolomonErasure] need ${this.dataShards} shards to reconstruct, got ${presentTotal}`,
      );
    }
    const size = this.assertShardLengths(shards);
    const hasMissing = presentTotal < this.totalShards;
    if (!hasMissing) return;

    await yieldEventLoop();

    // Info: (20260715 - Emily) 取存活切片對應的 k 列生成矩陣求逆,重建遺失的資料切片
    const subMatrix = presentIdx.map((i) => this.matrix[i]);
    const inverse = invertMatrix(subMatrix, this.dataShards);
    for (let d = 0; d < this.dataShards; d++) {
      if (shards[d]) continue;
      const out = Buffer.alloc(size);
      for (let r = 0; r < this.dataShards; r++) {
        const src = shards[presentIdx[r]];
        if (src) mulAddInto(out, src, inverse[d][r]);
      }
      shards[d] = out;
    }
    // Info: (20260715 - Emily) 資料切片齊全後,重算遺失的 parity 切片
    for (let j = 0; j < this.parityShards; j++) {
      const idx = this.dataShards + j;
      if (shards[idx]) continue;
      const out = Buffer.alloc(size);
      const coeffs = this.matrix[idx];
      for (let i = 0; i < this.dataShards; i++) {
        const src = shards[i];
        if (src) mulAddInto(out, src, coeffs[i]);
      }
      shards[idx] = out;
    }
  }
}
