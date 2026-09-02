import { expect, test } from '@playwright/test';
import { PASSWORD, dismissToasts, fillField, freeClass, login, open, register, stamp } from './helpers';

test.describe('Вход и регистрация', () => {
  test('учитель регистрируется, получает логин и попадает в кабинет', async ({ page }) => {
    const teacher = await register(page);

    expect(teacher.login).toMatch(/^[a-z]+\.[a-z]+\d*$/);
    await expect(page.getByRole('heading', { name: 'Обзор' })).toBeVisible();
    await expect(page.getByText('edway', { exact: false }).first()).toBeVisible();
  });

  test('выход завершает сессию, вход по выданному логину её возвращает', async ({ page }) => {
    const teacher = await register(page);
    await dismissToasts(page);

    await open(page, '/settings');
    await page.getByRole('button', { name: 'Выйти из системы' }).click();
    await expect(page).toHaveURL(/\/login/);

    // Кабинет закрыт: без сессии любая внутренняя страница уводит на вход.
    await open(page, '/grades');
    await expect(page).toHaveURL(/\/login/);

    await login(page, teacher);
    await expect(page.getByRole('heading', { name: 'Обзор' })).toBeVisible();
  });

  test('чужой пароль не пускает', async ({ page }) => {
    const teacher = await register(page);
    await dismissToasts(page);
    await open(page, '/settings');
    await page.getByRole('button', { name: 'Выйти из системы' }).click();

    await open(page, '/login');
    await fillField(page, page.getByLabel('Логин'), teacher.login);
    await fillField(page, page.getByLabel('Пароль'), `${PASSWORD}-неверный`);
    await page.getByRole('button', { name: 'Войти' }).click();

    await expect(page.getByText('Неверный логин или пароль')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Разграничение доступа', () => {
  test('чужие назначения, работы и оценки другому учителю не видны', async ({ page, browser }) => {
    // Первый учитель проводит работу.
    await register(page);
    await dismissToasts(page);

    const target = await freeClass(page);
    const classResponse = await page.request.post('/api/classes', {
      data: { number: target.number, letter: target.letter },
    });
    const classId = (await classResponse.json()).id as string;
    await page.request.post(`/api/classes/${classId}/students`, {
      data: { students: [{ lastName: 'Тайнов', firstName: 'Семён' }] },
    });

    const testResponse = await page.request.post('/api/tests', {
      data: {
        title: `Закрытая работа ${stamp()}`,
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
    await page.request.post(`/api/tests/${testId}/publish`);

    const assignmentResponse = await page.request.post('/api/assignments', {
      data: { testId, classId, date: '2026-10-01', spare: 0 },
    });
    const assignmentId = (await assignmentResponse.json()).id as string;
    const detail = await (await page.request.get(`/api/assignments/${assignmentId}`)).json();
    const workId = detail.works[0].id as string;

    // Второй учитель заходит со своей сессией.
    const other = await browser.newContext();
    const otherPage = await other.newPage();
    await register(otherPage);
    await dismissToasts(otherPage);

    const list = await (await otherPage.request.get('/api/assignments')).json();
    expect(list.some((row: { id: string }) => row.id === assignmentId)).toBe(false);

    expect((await otherPage.request.get(`/api/assignments/${assignmentId}`)).status()).toBe(404);
    expect((await otherPage.request.get(`/api/works/${workId}`)).status()).toBe(404);

    const journal = await (await otherPage.request.get('/api/grades')).json();
    expect(journal.some((row: { assignmentId: string }) => row.assignmentId === assignmentId)).toBe(false);

    await other.close();
  });
});
