import crypto from "node:crypto";
import bcrypt from "bcryptjs";

const password = process.argv[2];

if (!password) {
  console.error('Uso: npm run secrets -- "la-tua-password"');
  process.exit(1);
}

console.log("\nIncolla questi valori nel tuo file .env (o nelle env var dell'hosting):\n");
console.log('APP_PASSWORD_HASH="' + bcrypt.hashSync(password, 12) + '"');
console.log('SESSION_SECRET="' + crypto.randomBytes(48).toString("base64") + '"');
console.log('ENCRYPTION_KEY="' + crypto.randomBytes(32).toString("base64") + '"');
console.log("\nConserva ENCRYPTION_KEY in un posto sicuro: senza non puoi decifrare i dati.\n");
