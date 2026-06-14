import bcrypt from "bcryptjs";

// Verifica username + password contro le credenziali in env var.
export function checkCredentials(username: string, password: string): boolean {
  const expectedUser = process.env.APP_USERNAME ?? "admin";
  const hash = process.env.APP_PASSWORD_HASH;
  if (!hash) throw new Error("APP_PASSWORD_HASH non impostata");
  if (username !== expectedUser) return false;
  return bcrypt.compareSync(password, hash);
}
