import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { jsonFail, jsonOk } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";

export async function POST(req: NextRequest) {
  try {
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:20024";
    if (!rpcUrl) {
      return jsonFail(API_ERRORS.IS_CONFIG_MISSING);
    }

    const bodyText = await req.text();
    console.log("[DEBUG /api/v1/blockchain] Incoming body:", bodyText);

    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: bodyText,
      cache: "no-store",
    });

    const data = await response.json();
    console.log(
      "[DEBUG /api/v1/blockchain] Outgoing data:",
      JSON.stringify(data),
    );

    // Info: (20260417) Wrapped in jsonOk per user request, frontend must unwrap this
    return jsonOk(data);
  } catch (error: Error | unknown) {
    console.error("[API] /v1/blockchain Error:", error);
    return jsonFail({
      code: "IS000099",
      message: String(
        (error as Error).message || "Internal Server Error",
      ).slice(0, 30),
      status: ApiCode.INTERNAL_SERVER_ERROR,
    });
  }
}
