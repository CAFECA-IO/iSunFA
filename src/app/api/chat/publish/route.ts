import { NextResponse } from "next/server";
import { publishToCentrifugo } from "@/lib/centrifugo";

export async function POST(request: Request) {
  try {
    const { channel, data, sender, text } = await request.json();

    // Info: (20260712 - Luphia) 優先使用呼叫端提供的 data；未提供時沿用舊版 { sender, text } 結構
    const payload = data ?? {
      sender,
      text,
      timestamp: new Date().toISOString(),
    };

    await publishToCentrifugo(channel, payload);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    // Info: (20260712 - Luphia) 記錄實際錯誤（連線/TLS/Centrifugo）便於診斷
    const cause =
      error instanceof Error && "cause" in error ? error.cause : undefined;
    console.error("[chat/publish] publish failed:", errorMessage, { cause });
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
