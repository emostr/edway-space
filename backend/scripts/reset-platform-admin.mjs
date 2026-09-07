/*
 * Восстановление доступа администратора платформы.
 *
 * У школы пароль сбрасывает владелец платформы из панели, а у самого
 * владельца сбрасывать некому: он один. Этот скрипт выдаёт ему новый
 * временный пароль, снимает второй фактор и закрывает все сессии — то есть
 * возвращает учётную запись в состояние первого запуска.
 *
 *   npm run admin:reset               # пароль сгенерируется
 *   npm run admin:reset -- --password=…  # или задать свой
 */
import 'dotenv/config';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { PrismaClient } = require('../dist/generated/prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { hashSecret } = require('../dist/common/crypto/password');
const { generatePassword } = require('../dist/common/crypto/codes');

const argument = process.argv.find((value) => value.startsWith('--password='));
const password = argument ? argument.slice('--password='.length) : generatePassword(16);

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const login = (process.env.ADMIN_LOGIN ?? 'admin').trim().toLowerCase();
const admin = await prisma.account.findFirst({
  where: { role: 'PLATFORM_ADMIN', deletedAt: null },
  orderBy: { createdAt: 'asc' },
});

if (!admin) {
  console.error('Администратора платформы в базе нет — он создаётся при первом запуске сервера.');
  await prisma.$disconnect();
  process.exit(1);
}

await prisma.$transaction([
  prisma.account.update({
    where: { id: admin.id },
    data: {
      login,
      passwordHash: await hashSecret(password),
      mustChangePassword: true,
      tempPassword: null,
      totpEnabled: false,
      totpSecret: null,
    },
  }),
  prisma.backupCode.deleteMany({ where: { accountId: admin.id } }),
  prisma.authSession.updateMany({
    where: { accountId: admin.id, revokedAt: null },
    data: { revokedAt: new Date() },
  }),
]);

console.log('');
console.log('  Доступ администратора платформы восстановлен');
console.log(`  Логин:  ${login}`);
console.log(`  Пароль: ${password}`);
console.log('  При входе платформа попросит сменить пароль и подключить второй фактор.');
console.log('');

await prisma.$disconnect();
