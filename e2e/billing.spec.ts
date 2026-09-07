import { expect, test } from '@playwright/test';
import { completeSetup, dismissToasts, fillField, open, register, nameStamp, stamp } from './helpers';

/**
 * Деньги. Проверяем два пути оплаты — покупку с сайта и продление из
 * кабинета — и главное свойство подписки: когда срок вышел, данные школы
 * остаются на месте, а работа приостанавливается.
 */
test.describe('Оплата подписки', () => {
  test('покупка с сайта заводит школу и выдаёт доступ администратору', async ({ page }) => {
    test.slow();
    const name = `Гимназия ${nameStamp()}`;

    await open(page, '/buy');
    await expect(page.getByRole('heading', { name: 'Оплата подписки' })).toBeVisible();
    // Цена приходит с сервера — на неё же смотрит и лендинг.
    await expect(page.getByText('14 900 ₽').first()).toBeVisible();

    await fillField(page, page.getByLabel(/^Школа/), name);
    await fillField(page, page.getByLabel(/^Ваша фамилия/), `Купцов${nameStamp()}`);
    await fillField(page, page.getByLabel(/^Имя/), 'Игорь');
    await fillField(page, page.getByLabel(/^Почта/), `buy-${stamp()}@example.org`);
    await page.getByRole('checkbox', { name: 'Согласие с документами' }).click();
    await page.getByRole('button', { name: /Оплатить/ }).click();

    // Касса в учебном режиме возвращает покупателя на страницу итога.
    await expect(page).toHaveURL(/\/pay\/result/);
    await expect(page.getByRole('heading', { name: 'Платёж ещё не подтверждён' })).toBeVisible();

    await page.getByRole('button', { name: 'Подтвердить учебный платёж' }).click();
    await expect(page.getByRole('heading', { name: 'Оплата прошла' })).toBeVisible();
    await expect(page.getByText(name)).toBeVisible();

    // Логин и временный пароль выдаются здесь же: другого способа их узнать нет.
    await expect(page.getByRole('heading', { name: 'Доступ администратора школы' })).toBeVisible();
    const values = page.locator('.text-2xl.font-extrabold');
    const login = (await values.nth(0).innerText()).trim();
    const temporary = (await values.nth(1).innerText()).trim();

    await completeSetup(page, login, temporary);
    await expect(page.getByRole('heading', { name: 'Обзор' })).toBeVisible();

    // Школа оплачена, а не на пробном периоде: полоски про пробу нет.
    await expect(page.getByText(/Пробный период/)).toHaveCount(0);
    const school = await (await page.request.get('/api/schools/mine')).json();
    expect(school.status).toBe('ACTIVE');
    expect(school.daysLeft).toBeGreaterThan(300);
  });

  test('продление из кабинета прибавляет год к остатку пробного периода', async ({ page }) => {
    test.slow();
    await register(page);
    await dismissToasts(page);

    const before = await (await page.request.get('/api/schools/mine')).json();
    expect(before.status).toBe('TRIAL');

    await open(page, '/subscription');
    await expect(page.getByRole('heading', { name: 'Подписка' })).toBeVisible();
    await page.getByRole('button', { name: /Оплатить/ }).click();

    await expect(page).toHaveURL(/\/pay\/result/);
    await page.getByRole('button', { name: 'Подтвердить учебный платёж' }).click();
    await expect(page.getByRole('heading', { name: 'Оплата прошла' })).toBeVisible();

    const after = await (await page.request.get('/api/schools/mine')).json();
    expect(after.status).toBe('ACTIVE');
    // Пробные дни не сгорели: год прибавился к тому, что оставалось.
    expect(after.daysLeft).toBeGreaterThan(before.daysLeft + 350);

    // Платёж виден в истории — её показывают бухгалтерии.
    await open(page, '/subscription');
    await expect(page.getByText('Оплачен').first()).toBeVisible();
  });

  test('повторное уведомление кассы не продлевает подписку дважды', async ({ page }) => {
    test.slow();
    await register(page);
    await dismissToasts(page);

    const checkout = await (
      await page.request.post('/api/billing/checkout', { data: {} })
    ).json();
    await page.request.post(`/api/billing/result/${checkout.paymentId}/confirm`);
    const once = await (await page.request.get('/api/schools/mine')).json();

    // Касса повторяет уведомление, пока не получит 200: второй раз оно не
    // должно давать ещё год.
    await page.request.post(`/api/billing/result/${checkout.paymentId}/confirm`);
    const twice = await (await page.request.get('/api/schools/mine')).json();
    expect(twice.paidUntil).toBe(once.paidUntil);
  });
});
