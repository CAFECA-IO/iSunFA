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
