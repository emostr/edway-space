import { expect, test } from '@playwright/test';
import { dismissToasts, fillField, nameStamp, open, platformAdmin, register, signIn } from './helpers';
import { totpCode } from './totp';

/**
 * Панель владельца платформы. Проверяем то, ради чего она существует:
 * завести школу без оплаты, продлить, закрыть доступ — и убедиться, что
 * учебных данных школ в ней не видно.
 */
test.describe('Панель платформы', () => {
  test('владелец заводит школу вручную, продлевает и закрывает доступ', async ({ page, browser }) => {
    test.slow();
    await platformAdmin(page);

    await expect(page.getByRole('heading', { name: 'Платформа' })).toBeVisible();
    await expect(page.getByText('Выручка всего')).toBeVisible();

    // ─── Школа заводится без оплаты ─────────────────────────────────────────
    const name = `Пилот ${nameStamp()}`;
    await open(page, '/admin/schools');
    await page.getByRole('button', { name: 'Завести школу' }).first().click();

    const dialog = page.getByRole('dialog');
    await fillField(page, dialog.getByLabel('Название школы'), name);
    await fillField(page, dialog.getByLabel('Фамилия директора'), `Пилотов${nameStamp()}`);
    await fillField(page, dialog.getByLabel(/^Имя/), 'Мария');
    await fillField(page, dialog.getByLabel('Месяцев доступа'), '3');
    await page.getByRole('button', { name: 'Завести', exact: true }).click();

    await expect(page.getByText(`Доступ: ${name}`)).toBeVisible();
    const values = page.locator('b.text-ink');
    const login = (await values.nth(0).innerText()).trim();
    const temporary = (await values.nth(1).innerText()).trim();

    const row = page.locator('tr', { hasText: name });
    await expect(row).toHaveCount(1);
    await expect(row).toContainText('Подписка действует');

    // ─── Директор этой школы входит и работает ─────────────────────────────
    const school = await browser.newContext();
    const schoolPage = await school.newPage();
    await open(schoolPage, '/login');
    await fillField(schoolPage, schoolPage.getByLabel('Логин'), login);
    await fillField(schoolPage, schoolPage.getByLabel('Пароль'), temporary);
    await schoolPage.getByRole('button', { name: 'Войти' }).click();
    await expect(schoolPage).toHaveURL(/\/setup/);

    await fillField(schoolPage, schoolPage.getByLabel('Временный пароль'), temporary);
    await fillField(schoolPage, schoolPage.getByLabel(/^Новый пароль$/), 'pilot-school-2026');
    await fillField(schoolPage, schoolPage.getByLabel('Новый пароль ещё раз'), 'pilot-school-2026');
    await schoolPage.getByRole('button', { name: 'Сменить пароль' }).click();
    const secret = (await schoolPage.locator('.font-mono.text-lg').innerText()).trim();
    await fillField(schoolPage, schoolPage.getByLabel('Код из приложения'), totpCode(secret));
    await schoolPage.getByRole('button', { name: 'Подтвердить' }).click();
    await schoolPage.getByRole('button', { name: /Записал/ }).click();
    await expect(schoolPage.getByRole('heading', { name: 'Обзор' })).toBeVisible();

    // ─── Доступ закрывают — сессия школы обрывается ────────────────────────
    await open(page, '/admin/schools');
    await page.locator('tr', { hasText: name }).getByRole('button').last().click();
    await page.getByRole('menuitem', { name: 'Закрыть доступ' }).click();
    await page.getByRole('button', { name: 'Закрыть', exact: true }).click();
    await expect(page.locator('tr', { hasText: name })).toContainText('Доступ закрыт');

    // Закрытая школа теряет сессии: платформа больше не пускает её сотрудников.
    const check = await schoolPage.request.get('/api/classes');
    expect(check.status()).toBe(401);

    await school.close();
  });

  test('учебных данных школ в панели платформы нет', async ({ page, browser }) => {
    test.slow();
    // Школа заводит класс со списком учеников.
    const teacher = await browser.newContext();
    const teacherPage = await teacher.newPage();
    await register(teacherPage);
    await dismissToasts(teacherPage);

    const created = await (
      await teacherPage.request.post('/api/classes', { data: { number: 8, letter: 'Ж' } })
    ).json();
    await teacherPage.request.post(`/api/classes/${created.id}/students`, {
      data: { students: [{ lastName: 'Секретов', firstName: 'Иван' }] },
    });

    // Владелец платформы видит числа, но не имена и не работы.
    await platformAdmin(page);
    const schools = await (await page.request.get('/api/platform/schools')).json();
    expect(JSON.stringify(schools)).not.toContain('Секретов');

    // И к ученическим разделам API его не пускает: роль не та.
    expect((await page.request.get('/api/classes')).status()).toBe(403);
    expect((await page.request.get(`/api/classes/${created.id}`)).status()).toBe(403);

    await teacher.close();
  });
});
