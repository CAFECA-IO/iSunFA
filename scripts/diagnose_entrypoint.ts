// Info: (20260721 - Emily) AA23 診斷工具:比對「SCW 鏈上綁定的 EntryPoint」與「env 的 EntryPoint」
// Info: (20260721 - Emily) 用法:npx tsx scripts/diagnose_entrypoint.ts <SCW位址>
// Info: (20260721 - Emily) 背景:Fido2Account 的 _entryPoint 為 immutable(factory 部署時烙進 implementation),
// Info: (20260721 - Emily) dev 鏈重置/部分重佈署後與 env 分家即產生 AA23: account: not from EntryPoint

import { createPublicClient, http, parseAbi } from "viem";
import * as dotenv from "dotenv";
import * as dotenvExpand from "dotenv-expand";

dotenvExpand.expand(dotenv.config());

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL ?? "http://127.0.0.1:20024";
const ENV_ENTRY_POINT = process.env.NEXT_PUBLIC_ENTRY_POINT_ADDRESS;
const ENV_FACTORY = process.env.NEXT_PUBLIC_SCW_FACTORY_ADDRESS;

const ACCOUNT_ABI = parseAbi([
  "function entryPoint() view returns (address)",
]);
const FACTORY_ABI = parseAbi([
  "function accountImplementation() view returns (address)",
]);

const main = async () => {
  const scw = process.argv[2];
  if (!scw || !scw.startsWith("0x")) {
    console.error("用法: npx tsx scripts/diagnose_entrypoint.ts <SCW位址>");
    process.exit(1);
  }

  const client = createPublicClient({ transport: http(RPC_URL) });
  console.log(`RPC:                 ${RPC_URL}`);
  console.log(`env EntryPoint:      ${ENV_ENTRY_POINT}`);
  console.log(`env SCW Factory:     ${ENV_FACTORY}`);

  // Info: (20260721 - Emily) 1. SCW 實際綁定的 EntryPoint
  const scwEntryPoint = await client.readContract({
    address: scw as `0x${string}`,
    abi: ACCOUNT_ABI,
    functionName: "entryPoint",
  });
  console.log(`SCW(${scw}) 綁定的 EntryPoint: ${scwEntryPoint}`);

  // Info: (20260721 - Emily) 2. 現行 factory 的 implementation 綁定的 EntryPoint(新帳戶會綁誰)
  if (ENV_FACTORY) {
    try {
      const impl = await client.readContract({
        address: ENV_FACTORY as `0x${string}`,
        abi: FACTORY_ABI,
        functionName: "accountImplementation",
      });
      const implEntryPoint = await client.readContract({
        address: impl,
        abi: ACCOUNT_ABI,
        functionName: "entryPoint",
      });
      console.log(`Factory implementation(${impl}) 綁定的 EntryPoint: ${implEntryPoint}`);
    } catch {
      console.log("Factory implementation 查詢失敗(factory 可能不在此鏈上)");
    }
  }

  const match =
    ENV_ENTRY_POINT &&
    scwEntryPoint.toLowerCase() === ENV_ENTRY_POINT.toLowerCase();
  console.log(
    match
      ? "\n✅ SCW 與 env 的 EntryPoint 一致 — AA23 另有原因(檢查 nonce/簽章)"
      : "\n❌ 分家確認:SCW 綁的 EntryPoint ≠ env — 這就是 AA23 的原因",
  );
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
