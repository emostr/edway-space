import { expect, test } from '@playwright/test';
import { PASSWORD, completeSetup, dismissToasts, fillField, open, register, registerSchool } from './helpers';

test.describe('Регистрация школы и вход', () => {
  test('директор заводит школу, проходит настройку и попадает в кабинет', async ({ page }) => {
    test.slow();
    const created = await registerSchool(page);

    expect(created.login).toMatch(/^[a-z]+\.[a-z]+\d*$/);
    expect(created.temporary.length).toBeGreaterThanOrEqual(10);

    await completeSetup(page, created.login, created.temporary);
    await expect(page.getByRole('heading', { name: 'Обзор' })).toBeVisible();
    // Пробный период виден сразу: две недели и напоминание в шапке.
    await expect(page.getByText(/Пробный период: осталось 14 дн/)).toBeVisible();
  });

  test('до конца настройки платформа не отдаёт данные школы', async ({ page }) => {
    test.slow();
    const created = await registerSchool(page);

    await open(page, '/login');
    await fillField(page, page.getByLabel('Логин'), created.login);
    await fillField(page, page.getByLabel('Пароль'), created.temporary);
    await page.getByRole('button', { name: 'Войти' }).click();

    // Кабинет закрыт до смены пароля и подключения второго фактора.
    await expect(page).toHaveURL(/\/setup/);
    await page.goto('/classes');
    await expect(page).toHaveURL(/\/setup/);

    const classes = await page.request.get('/api/classes');
    expect(classes.status(), 'API должен отвечать 423, пока настройка не пройдена').toBe(423);
  });

  test('второй фактор обязателен для входа администратора', async ({ page }) => {
    test.slow();
    const school = await register(page);
    await dismissToasts(page);

    await open(page, '/settings');
    await page.getByRole('button', { name: 'Выйти из системы' }).click();
    await expect(page).toHaveURL(/\/login/);

    // Пароль верный, но без кода из приложения дальше не пускают.
    await fillField(page, page.getByLabel('Логин'), school.login);
    await fillField(page, page.getByLabel('Пароль'), school.password);
    await page.getByRole('button', { name: 'Войти' }).click();
    await expect(page.getByRole('heading', { name: 'Подтверждение входа' })).toBeVisible();

    await fillField(page, page.getByLabel('Код подтверждения'), '000000');
    await page.getByRole('button', { name: 'Подтвердить' }).click();
    await expect(page.getByText('Неверный код подтверждения')).toBeVisible();
  });

  test('чужой пароль не пускает', async ({ page }) => {
    test.slow();
    const school = await register(page);
    await dismissToasts(page);
    await open(page, '/settings');
    await page.getByRole('button', { name: 'Выйти из системы' }).click();

    await open(page, '/login');
    await fillField(page, page.getByLabel('Логин'), school.login);
    await fillField(page, page.getByLabel('Пароль'), `${PASSWORD}-неверный`);
    await page.getByRole('button', { name: 'Войти' }).click();

    await expect(page.getByText('Неверный логин или пароль')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Границы школы', () => {
  test('данные одной школы недостижимы из другой', async ({ page, browser }) => {
    test.slow();
    // Первая школа заводит класс и тест.
    await register(page);
    await dismissToasts(page);

    const classResponse = await page.request.post('/api/classes', {
      data: { number: 9, letter: 'Э' },
    });
    expect(classResponse.ok(), await classResponse.text()).toBeTruthy();
    const classId = (await classResponse.json()).id as string;

    const testResponse = await page.request.post('/api/tests', {
      data: {
        title: 'Закрытая работа',
        questions: [
          {
            type: 'SHORT_ANSWER',
            content: '<p>Вопрос</p>',
            points: 1,
            options: [],
            answerKey: { accepted: ['ответ'] },
          },
        ],
      },
    });
    const testId = (await testResponse.json()).id as string;

    // Вторая школа приходит со своей сессией.
    const other = await browser.newContext();
    const otherPage = await other.newPage();
    await register(otherPage);
    await dismissToasts(otherPage);

    const classes = await (await otherPage.request.get('/api/classes')).json();
    expect(classes.some((row: { id: string }) => row.id === classId)).toBe(false);

    // Прямые ссылки на чужие сущности закрыты.
    expect((await otherPage.request.get(`/api/classes/${classId}`)).status()).toBe(404);
    expect((await otherPage.request.get(`/api/tests/${testId}`)).status()).toBe(404);

    // И назначить чужой тест своему классу тоже нельзя.
    const own = await (await otherPage.request.post('/api/classes', { data: { number: 9, letter: 'Ю' } })).json();
    const attempt = await otherPage.request.post('/api/assignments', {
      data: { testId, classId: own.id, date: '2026-10-01' },
    });
    expect(attempt.status()).toBe(404);

    await other.close();
  });
});

test.describe('Файлы школы', () => {
  test('скан работы и картинка задания не отдаются чужой школе', async ({ page, browser }) => {
    test.slow();
    await register(page);
    await dismissToasts(page);

    // Картинка в задание — обычная загрузка из редактора.
    const image = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    );
    const upload = await page.request.post('/api/files/images', {
      multipart: { file: { name: 'draw.png', mimeType: 'image/png', buffer: image } },
    });
    expect(upload.ok(), await upload.text()).toBeTruthy();
    const url = (await upload.json()).url as string;

    // Своей школе картинка видна.
    expect((await page.request.get(url)).status()).toBe(200);

    // Чужой — нет, даже если адрес файла известен целиком.
    const other = await browser.newContext();
    const otherPage = await other.newPage();
    await register(otherPage);
    await dismissToasts(otherPage);
    expect((await otherPage.request.get(url)).status()).toBe(403);

    await other.close();
  });
});
