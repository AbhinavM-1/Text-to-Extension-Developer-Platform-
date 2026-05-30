import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createApp } from './server/app.js';
import { connectDatabase } from './server/config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const port = process.env.PORT || 3001;
const app = createApp();

await connectDatabase();

app.listen(port, () => {
  console.log(`Extensio.ai API running on http://localhost:${port}`);
});
