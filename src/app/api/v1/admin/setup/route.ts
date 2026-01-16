import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const envExamplePath = path.join(process.cwd(), '.env.example');
    const envPath = path.join(process.cwd(), '.env');

    // Info: (20260116 - Luphia) Read .env.example logic (reused from previous action)
    let exampleContent = '';
    try {
      exampleContent = await fs.readFile(envExamplePath, 'utf8');
    } catch {
      return NextResponse.json({ error: 'Failed to read template' }, { status: 500 });
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
        const value = formData.get(key);
        if (value !== null) {
          envContent += `${key}="${value}"\n`;
        } else {
          envContent += `${key}=\n`;
        }
      } else {
        envContent += line + '\n';
      }
    }

    await fs.writeFile(envPath, envContent, 'utf8');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save .env', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
