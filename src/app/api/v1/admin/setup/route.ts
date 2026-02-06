import { promises as fs } from 'fs';
import path from 'path';
import { jsonOk, jsonFail } from '@/lib/utils/response';
import { ApiCode } from '@/lib/utils/status';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const envExamplePath = path.join(process.cwd(), '.env.example');
    const envPath = path.join(process.cwd(), '.env');

    // Info: (20260116 - Luphia) Read .env.example logic (reused from previous action)
    let exampleContent = '';
    try {
      exampleContent = await fs.readFile(envExamplePath, 'utf8');
    } catch {
      return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, 'Failed to read template');
    }

    const lines = exampleContent.split('\n');
    let envContent = '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        envContent += line + '\n';
        continue;
      }

      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1];
        const value = body[key];
        if (value !== undefined && value !== null) {
          envContent += `${key}="${value}"\n`;
        } else {
          envContent += `${key}=\n`;
        }
      } else {
        envContent += line + '\n';
      }
    }

    await fs.writeFile(envPath, envContent, 'utf8');

    return jsonOk({ success: true });
  } catch (error) {
    console.error('Failed to save .env', error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, 'Internal Server Error');
  }
}
