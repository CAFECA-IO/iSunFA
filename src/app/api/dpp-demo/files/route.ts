import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import { statSync } from "fs";
import path from "path";

const getMimeType = (filePath: string) => {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".html": return "text/html";
    case ".pdf": return "application/pdf";
    case ".png": return "image/png";
    case ".jpg": case ".jpeg": return "image/jpeg";
    case ".csv": return "text/csv";
    case ".json": return "application/json";
    case ".md": return "text/markdown";
    case ".txt": return "text/plain";
    default: return "application/octet-stream";
  }
};

type FileNode = {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
};

async function buildFileTree(dirPath: string, rootPath: string): Promise<FileNode[]> {
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
      return NextResponse.json({ error: "Missing stockId or year" }, { status: 400 });
    }
    
    const targetDir = path.join(cwd, "data", stockId, year, "outputs", "e2e_roadmap-sprint1");
    try {
      const tree = await buildFileTree(targetDir, cwd);
      return NextResponse.json(tree);
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 404 });
    }
  } 
  else if (action === "serve") {
    const filePath = searchParams.get("path");
    if (!filePath) {
      return NextResponse.json({ error: "Missing path" }, { status: 400 });
    }
    
    // Info: (20260608 - Tzuhan) Security check: Prevent Path Traversal
    const absolutePath = path.resolve(cwd, filePath);
    if (!absolutePath.startsWith(path.join(cwd, "data"))) {
       return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    try {
      const stats = statSync(absolutePath);
      if (!stats.isFile()) {
        return NextResponse.json({ error: "Not a file" }, { status: 400 });
      }

      const mimeType = getMimeType(absolutePath);
      const fileBuffer = await fs.readFile(absolutePath);
      
      return new NextResponse(fileBuffer, {
        headers: {
          "Content-Type": mimeType,
          "Content-Length": stats.size.toString(),
          "Cache-Control": "public, max-age=3600"
        }
      });
    } catch (e: any) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
