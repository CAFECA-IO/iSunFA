import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { dockerService } from "@/services/docker.service";
import { ROOT_PATH } from "@/services/env.service";

export async function POST() {
  try {
    const res = await dockerService.composeUp(ROOT_PATH);
    if (res.success) {
      return jsonOk({ output: res.output }, "Docker containers started successfully");
    } else {
      return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, `Failed to start Docker containers: ${res.output}`);
    }
  } catch (err: unknown) {
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, `Docker start error: ${err instanceof Error ? err.message : String(err)}`);
  }
}
