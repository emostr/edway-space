import { expect, test } from '@playwright/test';
import { PASSWORD, dismissToasts, fillField, login, open, register } from './helpers';

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
