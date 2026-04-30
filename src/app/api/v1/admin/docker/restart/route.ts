import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { dockerService } from "@/services/docker.service";
import { ROOT_PATH } from "@/services/env.service";

export async function POST(req: NextRequest) {
  try {
    let serviceName: string | undefined;
    const body = await req.json().catch(() => ({}));
    if (body && typeof body.serviceName === "string") {
      serviceName = body.serviceName;
    }

    const res = await dockerService.composeRestart(ROOT_PATH, serviceName);
    if (res.success) {
      return jsonOk(
        { output: res.output },
        `Docker container ${serviceName || "all"} restarted successfully`,
      );
    } else {
      return jsonFail({
        code: "IS000099",
        message: String(
          `Failed to restart Docker container: ${res.output}`,
        ).slice(0, 30),
        status: ApiCode.INTERNAL_SERVER_ERROR,
      });
    }
  } catch (err: unknown) {
    return jsonFail({
      code: "IS000099",
      message: String(
        `Docker restart error: ${err instanceof Error ? err.message : String(err)}`,
      ).slice(0, 30),
      status: ApiCode.INTERNAL_SERVER_ERROR,
    });
  }
}
