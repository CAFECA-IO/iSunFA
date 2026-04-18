import { createPublicClient, http, defineChain } from "viem";

// Info: (20260122 - Tzuhan) Prioritize settings from .env
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:20024";
const CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_ISUNCOIN_CHAIN_ID || "8017");

export const TAIWAN_COUNTRY_CODE = 158;
export const CREDIT_POINT_ADDRESS = process.env
  .NEXT_PUBLIC_CREDIT_POINT_ADDRESS as `0x${string}`;
export const KYC_TOPIC_ID = BigInt(101);
export const KYB_TOPIC_ID = BigInt(102);

// Info: (20260121 - Tzuhan) 1. 定義 iSunCoin 鏈
export const isuncoin = defineChain({
  id: CHAIN_ID,
  name: "iSunCoin Mainnet",
  network: "isuncoin",
  nativeCurrency: { decimals: 18, name: "iSunCoin", symbol: "ISC" },
  rpcUrls: { default: { http: [RPC_URL] }, public: { http: [RPC_URL] } },
});

// Info: (20260121 - Tzuhan) 2. 公開客戶端 (唯讀操作)，全域單例，避免重複連線
// Info: (20260417 - Luphia) Use internal proxy endpoint when running in the browser to prevent exposing RPC to frontend
const isServer = typeof window === "undefined";

const customFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const res = await fetch(input, init);
  const contentType = res.headers.get("content-type") || "";

  // Info: (20260417 - Luphia) jsonOk responses are wrapped, we need to unwrap for viem
  if (contentType.includes("application/json")) {
    const json = await res.json();
    if (json && typeof json === "object" && "success" in json && "payload" in json) {
      if (!json.success) {
        throw new Error(json.message || "RPC RPC returned success: false");
      }
      return new Response(JSON.stringify(json.payload), {
        status: 200,
        headers: res.headers,
      });
    }
    // Info: (20260417 - Luphia) Fallback if not our specific wrapped format
    return new Response(JSON.stringify(json), {
      status: res.status,
      headers: res.headers,
    });
  }

  return res;
};

export const publicClient = createPublicClient({
  chain: isuncoin,
  transport: http(isServer ? RPC_URL : "/api/v1/blockchain", {
    fetchOptions: isServer ? undefined : undefined,
    fetchFn: isServer ? undefined : customFetch,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any), // Info: (20260417 - Luphia) cast to any because viem types for fetchFn might differ slightly between versions
});
