import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { validateAdminFido2 } from "@/lib/auth/admin_validator";
import fs from "fs/promises";
import path from "path";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  try {
    const { body } = await validateAdminFido2(req);
    const { action } = body; // Info: (20260424 - Luphia) restart, cancel, retry, bump, gc
    const { folderId } = await params;

    // Info: (20260424 - Luphia) Validate folderId to prevent directory traversal
    if (!folderId || folderId.includes("..") || folderId.includes("/")) {
      return jsonFail(API_ERRORS.VL_INVALID_ID);
    }

    const folderPath = path.join(process.cwd(), "missions", folderId);

    try {
      await fs.access(folderPath);
    } catch {
      return jsonFail(API_ERRORS.NF_FILE);
    }

    if (action === "restart") {
      const files = await fs.readdir(folderPath);
      // Info: (20260424 - Luphia) Delete all failed_*.md files and execution_log.json
      for (const file of files) {
        if ((file.startsWith("failed_") && file.endsWith(".md")) || file === "execution_log.json") {
          await fs.unlink(path.join(folderPath, file));
        }
      }
      return jsonOk({ success: true, message: "Task restarted" });
    } else if (action === "cancel") {
      // Info: (20260424 - Luphia) Cancel task by removing the entire folder
      await fs.rm(folderPath, { recursive: true, force: true });
      return jsonOk({ success: true, message: "Task cancelled" });
    } else {
      return jsonFail(API_ERRORS.VL_MISSING_PARAMS);
    }
  } catch (error) {
    console.error("Local Mission Action Error:", error);
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
