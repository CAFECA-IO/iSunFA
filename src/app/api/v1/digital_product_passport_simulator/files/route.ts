import { NextRequest } from "next/server";
import fs from "fs/promises";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { statSync } from "fs";
import path from "path";

const getMimeType = (filePath: string) => {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".html":
      return "text/html";
    case ".pdf":
      return "application/pdf";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".csv":
      return "text/csv";
    case ".json":
      return "application/json";
    case ".md":
      return "text/markdown";
    case ".txt":
      return "text/plain";
    default:
      return "application/octet-stream";
  }
};

type FileNode = {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
};

async function buildFileTree(
  dirPath: string,
  rootPath: string,
): Promise<FileNode[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const nodes: FileNode[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const relPath = path.relative(rootPath, fullPath);

    if (entry.isDirectory()) {
      const children = await buildFileTree(fullPath, rootPath);
      nodes.push({
        name: entry.name,
        path: relPath,
        type: "directory",
        children,
      });
    } else {
      nodes.push({
        name: entry.name,
        path: relPath,
        type: "file",
      });
    }
  }

  // Info: (20260608 - Tzuhan) Sort: directories first, then files
  nodes.sort((a, b) => {
    if (a.type === b.type) return a.name.localeCompare(b.name);
    return a.type === "directory" ? -1 : 1;
  });

  return nodes;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  const cwd = process.cwd();

  if (action === "list") {
    const stockId = searchParams.get("stockId");
    const year = searchParams.get("year");
    if (!stockId || !year) {
      return jsonFail(API_ERRORS.VL_MISSING_PARAMS);
    }

    const targetDir = path.join(cwd, "data", stockId, year, "outputs");
    try {
      const tree = await buildFileTree(targetDir, cwd);
      return jsonOk(tree);
    } catch {
      return jsonFail(API_ERRORS.NF_FILE);
    }
  } else if (action === "serve" || action === "download") {
    const filePath = searchParams.get("path");
    if (!filePath) {
      return jsonFail(API_ERRORS.VL_MISSING_PARAMS);
    }

    // Info: (20260608 - Tzuhan) Security check: Prevent Path Traversal
    let absolutePath = path.resolve(cwd, filePath);
    if (!absolutePath.startsWith(path.join(cwd, "data"))) {
      return jsonFail(API_ERRORS.AUTH_PERMISSION_DENIED);
    }

    try {
      let stats;
      try {
        stats = statSync(absolutePath);
      } catch (err) {
        // Info: (20260616) Fallback to 2024 if the current batch year doesn't have mock data
        const fallbackPath = absolutePath.replace(
          new RegExp("/data/([^/]+)/\\d{4}/"),
          "/data/$1/2024/",
        );
        if (fallbackPath !== absolutePath) {
          stats = statSync(fallbackPath);
          absolutePath = fallbackPath;
        } else {
          throw err;
        }
      }
      if (!stats.isFile()) {
        return jsonFail(API_ERRORS.VA_INVALID_INPUT_DATA);
      }

      const mimeType = getMimeType(absolutePath);
      const fileBuffer = await fs.readFile(absolutePath);

      const headers: Record<string, string> = {
        "Content-Type": mimeType,
        "Content-Length": stats.size.toString(),
        "Cache-Control": "public, max-age=3600",
      };

      if (action === "download") {
        headers["Content-Disposition"] =
          `attachment; filename="${path.basename(absolutePath)}"`;
      }

      return new Response(fileBuffer, { headers });
    } catch {
      return jsonFail(API_ERRORS.NF_FILE);
    }
  }

  return jsonFail(API_ERRORS.VA_INVALID_INPUT_DATA);
}
