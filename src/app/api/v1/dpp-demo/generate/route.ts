import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import util from "util";
import { GenerateDppDemoSchema } from "@/validators/dpp_demo.validator";

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const execPromise = util.promisify(exec);

// Info: (20260609 - Tzuhan) 定義 SSE 事件介面
interface ISseEvent {
  type: "step_start" | "log" | "preview" | "extrapolation_alert" | "complete" | "error";
  stepIndex?: number;
  message?: string;
  file?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();
    const parsed = GenerateDppDemoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const { stockId, year, productCount } = parsed.data;

    // Info: (20260609 - Tzuhan) 建立 SSE 資料流
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        const sendEvent = (data: ISseEvent) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        try {
          // Info: (20260609 - Tzuhan) 步驟一：下載企業報告
          sendEvent({ type: "step_start", stepIndex: 0 });
          sendEvent({ type: "log", message: `Executing auto_download.ts for ${stockId} (${year})...` });
          await execPromise(`npx tsx scripts/auto_download.ts --stockId=${stockId} --year=${year}`);
          
          // Info: (20260609 - Tzuhan) 傳送 PDF 預覽路徑，讓右側視窗在執行後續腳本時可以先預覽
          const pdfPath = `data/${stockId}/${year}/mock_sources/${stockId}_sustainability_report.pdf`;
          sendEvent({ type: "preview", file: pdfPath });
          
          // Info: (20260609 - Tzuhan) 步驟二：AI 視覺圖表萃取
          sendEvent({ type: "step_start", stepIndex: 1 });
          sendEvent({ type: "log", message: `Executing ai_vision_extractor.ts...` });
          const { stdout: visionStdout } = await execPromise(`npx tsx src/scripts/e2e-seeder/ai_vision_extractor.ts ${stockId} ${year}`);
          
          if (visionStdout.includes("[WARN] 確定取得") || visionStdout.includes("準備啟動歷史回溯")) {
            sendEvent({ type: "extrapolation_alert" });
          }
          
          // Info: (20260609 - Tzuhan) 步驟三：企業畫像建構
          sendEvent({ type: "step_start", stepIndex: 2 });
          sendEvent({ type: "log", message: `Executing persona_generator.ts...` });
          await execPromise(`npx tsx src/scripts/e2e-seeder/persona_generator.ts ${stockId} ${year} --products=${productCount}`);

          // Info: (20260609 - Tzuhan) 完成流程並回傳檔案路徑 (Day 1 Scope 結束)
          const mockFilePath = `data/${stockId}/${year}/outputs/${stockId}_company_persona.html`;
          sendEvent({ type: "complete", file: mockFilePath });
          
        } catch (err: unknown) {
          // Info: (20260609 - Tzuhan) 攔截執行錯誤
          let errorMessage = "Execution failed";
          if (err instanceof Error) {
            errorMessage = err.message;
          }
          console.error("Script execution failed:", err);
          sendEvent({ type: "error", message: errorMessage });
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (err: unknown) {
    // Info: (20260609 - Tzuhan) JSON 解析失敗或例外錯誤
    let message = "Internal Server Error";
    if (err instanceof Error) {
      message = err.message;
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
