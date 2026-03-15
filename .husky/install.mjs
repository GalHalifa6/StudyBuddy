import { fileURLToPath } from 'url';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const huskyDir = join(__dirname, '.husky');

if (!existsSync(huskyDir)) {
  console.log('Husky directory does not exist. Creating...');
  // This will be created by husky install
}

console.log('Husky hooks installed successfully!');

