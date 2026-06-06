import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createApp } from './server/app.js';
import { connectDatabase } from './server/config/database.js';
import { assertRuntimeEnv } from './server/config/env.js';
import { logger } from './server/services/logger.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const port = process.env.PORT || 3001;
const runtime = assertRuntimeEnv();
runtime.warnings.forEach(warning => logger.warn('Runtime configuration warning', { warning }));

const app = createApp();

await connectDatabase();

app.listen(port, () => {
  logger.info('Extensio.ai API running', { url: `http://localhost:${port}` });
});
