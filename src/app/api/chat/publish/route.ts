import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { channel, sender, text } = await request.json();
    const apiKey = process.env.CENTRIFUGO_API_KEY || "isunfa_api_key";
    const chatroomPort = process.env.CHATROOM_PORT || "20027";

    // Call Centrifugo HTTP API
    const response = await fetch(
      `http://127.0.0.1:${chatroomPort}/api/publish`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": apiKey,
        },
        body: JSON.stringify({
          channel,
          data: {
            sender,
            text,
            timestamp: new Date().toISOString(),
          },
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Centrifugo error: ${errorText}` },
        { status: response.status },
      );
    }

    const data = await response.json();
    if (data?.error) {
      return NextResponse.json(
        {
          error: data.error.message || "Failed to publish message",
          code: data.error.code,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
