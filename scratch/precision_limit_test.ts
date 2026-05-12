import { Decimal } from "decimal.js";

console.log("=========================================");
console.log("🚨 浮點數與二進制極限壓力測試 (Precision Limits) 🚨");
console.log("=========================================\n");

// 1. 小數精度遺失 (Classic Floating Point Error)
console.log("【測試 1：特小數的二進制轉換誤差】");
const num1 = 0.1;
const num2 = 0.2;
console.log(`原生存 JS 運算： 0.1 + 0.2 = ${num1 + num2}`);
console.log(`是否等於 0.3？ -> ${num1 + num2 === 0.3 ? "✅ 是" : "❌ 否"}`);

const dec1 = new Decimal(0.1);
const dec2 = new Decimal(0.2);
console.log(`Decimal.js 運算：0.1 + 0.2 = ${dec1.plus(dec2).toString()}`);
console.log(
  `是否等於 0.3？ -> ${dec1.plus(dec2).equals(new Decimal(0.3)) ? "✅ 是" : "❌ 否"}\n`,
);

// 2. 超大整數溢位 (Max Safe Integer Overflow)
console.log("【測試 2：超大整數的精度上限】");
const MAX_SAFE = Number.MAX_SAFE_INTEGER; // 9,007,199,254,740,991 (九千兆)
console.log(`JS 安全整數上限 (Number.MAX_SAFE_INTEGER) = ${MAX_SAFE}`);
console.log(`原生存 JS 運算：MAX_SAFE + 1 = ${MAX_SAFE + 1}`);
console.log(`原生存 JS 運算：MAX_SAFE + 2 = ${MAX_SAFE + 2} ⚠️ (開始產生誤差)`);
console.log(`原生存 JS 運算：MAX_SAFE + 3 = ${MAX_SAFE + 3} ❌ (完全錯誤)`);

const bigSafe = BigInt(MAX_SAFE);
console.log(
  `BigInt 運算：MAX_SAFE + 2n = ${(bigSafe + 2n).toString()} ✅ (完全精準)`,
);
console.log(`但如果我們把 BigInt 轉回 Number()...`);
console.log(`Number(bigSafe + 2n) = ${Number(bigSafe + 2n)} ❌ (又爆掉了)\n`);

// 3. 解決方案展示 (API 序列化最佳實踐)
console.log("【結論與優美解法：字串傳遞 (String Passing)】");
console.log(
  "當我們從資料庫拿出 BigInt 或 Decimal 時，『絕對不能』轉成 Number。",
);
console.log(
  `錯誤作法 (API 吐 Number)：JSON.stringify({ amount: Number(10000000000000000000n) }) -> {"amount":10000000000000000000} (前端收到會失真)`,
);
console.log(
  `優美解法 (API 吐 String)：JSON.stringify({ amount: 10000000000000000000n.toString() }) -> {"amount":"10000000000000000000"}`,
);
console.log(
  "前端收到字串後，再用 bignumber.js 或 Decimal.js 進行渲染與運算，確保 0 誤差！",
);
console.log("=========================================");
