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
      commentBuffer = []; // Info: (20260116 - Luphia) Reset buffer on empty lines to separate sections
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
    <div className="relative isolate min-h-screen flex flex-col items-center justify-center px-6 py-12 lg:px-8 bg-white overflow-hidden">
      {/* Info: (20260116 - Luphia) Background Gradients from Hero */}
      <div
        className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
        aria-hidden="true"
      >
        <div
          className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff8c00] to-[#ffda44] opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
          style={{
            clipPath:
              'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
          }}
        />
      </div>

      <div className="w-full max-w-3xl rounded-2xl bg-white/80 backdrop-blur-sm p-8 shadow-2xl ring-1 ring-gray-900/10">
        <SetupForm envVars={envVars} />
      </div>

      <div
        className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]"
        aria-hidden="true"
      >
        <div
          className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-[#ff8c00] to-[#ffda44] opacity-30 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]"
          style={{
            clipPath:
              'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
          }}
        />
      </div>
    </div>
  );
}
