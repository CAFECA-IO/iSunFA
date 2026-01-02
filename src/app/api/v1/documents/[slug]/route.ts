import { promises as fs } from 'fs';
import path from 'path';
import { NextRequest } from 'next/server';
import { jsonOk, jsonFail } from '@/lib/utils/response';
import { ApiCode } from '@/lib/utils/status';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  // Info: (20260102 - Luphia) Whitelist allowed documents for security
  const ALLOWED_DOCS = ['terms_of_service', 'privacy_policy', 'business_license'];
  const { slug } = await params;

  if (!ALLOWED_DOCS.includes(slug)) {
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
