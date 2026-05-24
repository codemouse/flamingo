/**
 * Loaded by jest via setupFiles BEFORE any test module is imported.
 * This ensures ConfigModule / TypeORM read from .env.test rather than .env.
 */
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env.test'), override: true });
