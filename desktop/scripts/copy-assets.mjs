// Экран настройки — обычная страница внутри приложения: tsc её не копирует.
import { copyFile, mkdir, readdir } from 'node:fs/promises';
import { join } from 'node:path';

await mkdir('dist', { recursive: true });
for (const name of await readdir('src')) {
  if (name.endsWith('.html') || name.endsWith('.svg')) {
    await copyFile(join('src', name), join('dist', name));
  }
}
console.log('ресурсы скопированы');
