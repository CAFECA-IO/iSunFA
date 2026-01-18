import { promises as fs } from 'fs';
import path from 'path';
import { NextRequest } from 'next/server';
import { jsonOk, jsonFail } from '@/lib/utils/response';
import { ApiCode } from '@/lib/utils/status';
import { ALLOWED_DOCS } from '@/constants/documents';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  // Info: (20260118 - Luphia) Whitelist allowed documents using constants
  const { slug } = await params;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!ALLOWED_DOCS.includes(slug as any)) {
    return jsonFail(ApiCode.VALIDATION_ERROR, 'Invalid document type');
  }

  try {
    const filePath = path.join(process.cwd(), `documents/${slug}.md`);
    const content = await fs.readFile(filePath, 'utf8');

    return jsonOk({ content });
  } catch (error) {
    console.error(`Failed to read document ${slug}:`, error);
    return jsonFail(ApiCode.NOT_FOUND, 'Document not found');
  }
}
