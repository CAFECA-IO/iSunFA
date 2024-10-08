/**
 * Info: (20240812 - Murky) All code in register will be run when "Starting..." is printed in the console.
 */
export async function register() {
  // Info: (20240812 - Murky) Node module using in this file need to be dynamically imported, it must be inside "if" statement
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { createFileFoldersIfNotExists } = await import('@/lib/utils/file');
    await createFileFoldersIfNotExists();
    await import('pino');
    await import('next-logger');
  }
}
