import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { dockerService } from "@/services/docker.service";
import { ROOT_PATH } from "@/services/env.service";

export async function POST() {
  try {
    const res = await dockerService.composeUp(ROOT_PATH);
    if (res.success) {
      return jsonOk(
        { output: res.output },
        "Docker containers started successfully",
      );
    } else {
      return jsonFail({
        code: "IS000099",
        message: String(
          `Failed to start Docker containers: ${res.output}`,
        ).slice(0, 30),
        status: ApiCode.INTERNAL_SERVER_ERROR,
      });
    }
  } catch (err: unknown) {
    return jsonFail({
      code: "IS000099",
      message: String(
        `Docker start error: ${err instanceof Error ? err.message : String(err)}`,
      ).slice(0, 30),
      status: ApiCode.INTERNAL_SERVER_ERROR,
    });
  }
}
