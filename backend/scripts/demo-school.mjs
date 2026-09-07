/*
 * Показательная школа: учётная запись, которую не стыдно отдать на проверку
 * банку или кассе. Пароль постоянный и смены при входе не требует, второго
 * фактора у учителя нет — проверяющий заходит и сразу видит кабинет.
 *
 *   npm run demo:school                       # пароль сгенерируется
 *   npm run demo:school -- --password=…       # или задать свой
 *   npm run demo:school -- --login=demo       # логин учителя
 *
 * Скрипт можно гонять сколько угодно: школа и учитель заводятся один раз,
 * дальше только обновляется пароль и продлевается срок.
 */
import 'dotenv/config';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { PrismaClient } = require('../dist/generated/prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { hashSecret } = require('../dist/common/crypto/password');
const { generatePassword } = require('../dist/common/crypto/codes');
const { buildSearchKey } = require('../dist/common/text');

const argument = (name, fallback) => {
  const found = process.argv.find((value) => value.startsWith(`--${name}=`));
  return found ? found.slice(name.length + 3) : fallback;
};

const login = argument('login', 'demo').trim().toLowerCase();
const password = argument('password', generatePassword(12));

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const inAYear = new Date();
inAYear.setFullYear(inAYear.getFullYear() + 1);

const school = await prisma.school.upsert({
  where: { slug: 'demo' },
  update: { status: 'ACTIVE', paidUntil: inAYear, deletedAt: null },
  create: {
    name: 'Демонстрационная школа',
    slug: 'demo',
    city: 'Москва',
    status: 'ACTIVE',
    paidUntil: inAYear,
    note: 'Показ платформы: платёжные системы, банк, партнёры',
  },
});

const passwordHash = await hashSecret(password);
const existing = await prisma.account.findUnique({ where: { login } });

const teacher = existing
  ? await prisma.account.update({
      where: { id: existing.id },
      data: {
        schoolId: school.id,
        role: 'TEACHER',
        passwordHash,
        mustChangePassword: false,
        tempPassword: null,
        totpSecret: null,
        totpEnabled: false,
        deletedAt: null,
      },
    })
  : await prisma.account.create({
      data: {
        login,
        role: 'TEACHER',
        fullName: 'Демидова Анна Сергеевна',
        subject: 'Математика',
        schoolId: school.id,
        passwordHash,
        // Показательной записи экран первичной настройки только мешает.
        mustChangePassword: false,
      },
    });

// Класс с учениками: пустой кабинет проверяющему ничего не рассказывает.
const schoolClass = await prisma.schoolClass.upsert({
  where: { schoolId_number_letter_archiveKey: { schoolId: school.id, number: 9, letter: 'А', archiveKey: '' } },
  update: {},
  create: { schoolId: school.id, number: 9, letter: 'А', createdById: teacher.id },
});

const students = [
  ['Астахова', 'Полина'],
  ['Белов', 'Кирилл'],
  ['Гущина', 'Мария'],
  ['Зимин', 'Артём'],
  ['Ковалёва', 'Ева'],
  ['Мельников', 'Тимур'],
];

for (const [lastName, firstName] of students) {
  const searchKey = buildSearchKey(lastName, firstName);
  const already = await prisma.student.findFirst({ where: { classId: schoolClass.id, searchKey } });
  if (!already) {
    await prisma.student.create({
      data: { classId: schoolClass.id, lastName, firstName, searchKey },
    });
  }
}

const hasTest = await prisma.test.findFirst({ where: { schoolId: school.id, title: 'Квадратные уравнения' } });

if (!hasTest) {
  await prisma.test.create({
    data: {
      schoolId: school.id,
      ownerId: teacher.id,
      title: 'Квадратные уравнения',
      description: 'Проверочная работа по теме, 9 класс',
      instructions: 'Ответы вписывайте печатными буквами, по одной в клетку.',
      isPublished: true,
      questions: {
        create: [
          {
            order: 1,
            type: 'SINGLE_CHOICE',
            content: '<p>Сколько корней у уравнения <span class="katex-source">x^2 + 4x + 4 = 0</span>?</p>',
            points: 1,
            options: [
              { id: 'o1', content: 'Ни одного' },
              { id: 'o2', content: 'Один' },
              { id: 'o3', content: 'Два' },
            ],
            answerKey: { correct: ['o2'] },
          },
          {
            order: 2,
            type: 'MULTIPLE_CHOICE',
            content: '<p>Какие из уравнений приведённые?</p>',
            points: 2,
            options: [
              { id: 'o1', content: 'x² + 5x − 6 = 0' },
              { id: 'o2', content: '3x² + x = 0' },
              { id: 'o3', content: 'x² − 9 = 0' },
            ],
            answerKey: { correct: ['o1', 'o3'], partial: true },
          },
          {
            order: 3,
            type: 'SHORT_ANSWER',
            content: '<p>Найдите больший корень уравнения x² − 7x + 12 = 0.</p>',
            points: 2,
            answerKey: { accepted: ['4'], numeric: true, tolerance: 0 },
          },
          {
            order: 4,
            type: 'EXTENDED',
            content: '<p>Объясните, почему дискриминант определяет число корней.</p>',
            points: 3,
            answerKey: { guideline: 'Знак дискриминанта и число пересечений параболы с осью' },
          },
        ],
      },
    },
  });
}

console.log('');
console.log('  Показательная школа готова');
console.log(`  Адрес:  ${(process.env.PUBLIC_URL ?? 'http://localhost:8020').replace(/\/+$/, '')}/login`);
console.log(`  Логин:  ${login}`);
console.log(`  Пароль: ${password}`);
console.log('  Роль учителя: смены пароля и второго фактора при входе не потребует.');
console.log('');

await prisma.$disconnect();
