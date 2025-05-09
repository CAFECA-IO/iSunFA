export const emailVerifier = (email: string): boolean => {
  // Info: (20250221 - Liz) 簡單的 email 格式驗證
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  return isValidEmail;
};
