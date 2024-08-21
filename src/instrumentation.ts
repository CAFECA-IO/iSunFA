// import { createFileFoldersIfNotExists } from "@/lib/utils/file";

/**
 * Info (20240812 - Murky): All code in register will be run when "Starting..." is printed in the console.
 */
export async function register() {
  // Deprecate: (20240812 - Murky): Debugging purpose
  // console.log('[INSTRUMENATION] - process.env.NEXT_RUNTIME: ', process.env.NEXT_RUNTIME);

  // Info: (20240812 - Murky) Node module using in this file need to be dynamically imported, it must be inside "if" statement
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { createFileFoldersIfNotExists } = await import('@/lib/utils/file');
    await createFileFoldersIfNotExists();
  }
}
