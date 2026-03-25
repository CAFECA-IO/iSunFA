import { promises as fs } from 'fs';
import path from 'path';
import { jsonOk, jsonFail } from '@/lib/utils/response';
import { ApiCode } from '@/lib/utils/status';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'documents/salary_calculator_operating_mechanism/v1_0_0.md');
    const content = await fs.readFile(filePath, 'utf8');

    return jsonOk({ content });
  } catch (error) {
    console.error('Failed to read mechanism document:', error);
    return jsonFail(ApiCode.NOT_FOUND, 'Document not found');
  }
}
