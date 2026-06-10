import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootEnv = path.resolve(__dirname, '..', '..', '..', '.env');
const localEnv = path.resolve(__dirname, '..', '..', '.env');

dotenv.config({ path: process.env.ENV_FILE || rootEnv });
dotenv.config({ path: localEnv, override: false });

export const config = {
  port: Number(process.env.PORT || 3001),
  googleKey: process.env.GOOGLE_KEY,
};

export function getGoogleKey() {
  if (!config.googleKey) throw new Error('GOOGLE_KEY no está configurada.');
  return config.googleKey;
}
