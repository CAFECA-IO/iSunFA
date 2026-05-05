export async function getSuperAdminTaskStatus() {
  return (
    (
      global as typeof globalThis & {
        superAdminTaskStatus?: {
          done: boolean;
          error: string | null;
          progress: string;
        };
      }
    ).superAdminTaskStatus || { done: true, error: null, progress: "Idle" }
  );
}

export async function setSuperAdminTaskStatus(status: {
  done: boolean;
  error: string | null;
  progress: string;
}) {
  (
    global as typeof globalThis & {
      superAdminTaskStatus?: {
        done: boolean;
        error: string | null;
        progress: string;
      };
    }
  ).superAdminTaskStatus = status;
}

export async function restartService() {
  setTimeout(() => {
    console.log("[Setup] Restarting service via process.exit(0)...");
    process.exit(0);
  }, 1000);
  return { success: true, message: "Restarting..." };
}
