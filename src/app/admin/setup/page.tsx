import { promises as fs } from 'fs';
import path from 'path';
import SetupForm from '@/components/admin/setup_form';

interface IEnvVar {
  key: string;
  defaultValue: string;
  description: string[];
  required: boolean;
}

export default async function SetupPage() {
  const envExamplePath = path.join(process.cwd(), '.env.example');
  let exampleContent = '';

  try {
    exampleContent = await fs.readFile(envExamplePath, 'utf8');
  } catch {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 p-4 text-center">
        <h1 className="text-3xl font-bold text-white mb-4">Error</h1>
        <p className="text-gray-400">Could not read <code>.env.example</code>.</p>
      </div>
    )
  }

  const lines = exampleContent.split('\n');
  const envVars: IEnvVar[] = [];
  let commentBuffer: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      commentBuffer = []; // Reset buffer on empty lines to separate sections
      continue;
    }

    if (trimmed.startsWith('#')) {
      commentBuffer.push(trimmed);
      continue;
    }

    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1];
      let defaultValue = match[2];

      // Info: (20260116 - Luphia) Remove quotes if present
      if (defaultValue.startsWith('"') && defaultValue.endsWith('"')) {
        defaultValue = defaultValue.slice(1, -1);
      }

      envVars.push({
        key,
        defaultValue,
        description: [...commentBuffer],
        required: true, // Info: (20260116 - Luphia) Assume all in example are required
      });
      commentBuffer = [];
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 p-4 text-center py-20">
      <div className="rounded-2xl bg-gray-800 p-8 shadow-2xl ring-1 ring-white/10 max-w-3xl w-full">
        <h1 className="text-3xl font-bold text-white mb-4">Initial Setup</h1>
        <p className="text-gray-400 mb-8">
          Please configure the system environment variables below.
        </p>

        <SetupForm envVars={envVars} />
      </div>
    </div>
  );
}
