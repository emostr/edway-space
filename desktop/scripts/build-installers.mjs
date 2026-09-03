/*
 * Обёртка над electron-builder. Нужна ради одного: вписать в сборку адрес
 * школьного сервера. Подстановку переменных окружения внутри конфигурации
 * electron-builder не делает — значение приходится передавать аргументом,
 * а он на каждой системе пишется по-своему.
 */
import { spawnSync } from 'node:child_process';

const url = (process.env.EDWAY_DEFAULT_URL ?? '').trim();
const args = [...process.argv.slice(2), '--publish', 'never'];

if (url) {
  args.push(`-c.extraMetadata.edway.defaultUrl=${url}`);
  console.log(`адрес сервера в сборке: ${url}`);
} else {
  console.log('адрес сервера не задан — приложение спросит его при первом запуске');
}

const result = spawnSync('npx', ['electron-builder', ...args], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

process.exit(result.status ?? 1);
