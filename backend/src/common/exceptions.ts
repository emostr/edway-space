import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * 402 Payment Required — школа работает, вход есть, но срок подписки вышел.
 * Фронтенд по этому коду показывает страницу продления, а не ошибку.
 */
export class SubscriptionExpiredException extends HttpException {
  constructor(message = 'Подписка школы закончилась') {
    super(
      { statusCode: HttpStatus.PAYMENT_REQUIRED, error: 'SUBSCRIPTION_EXPIRED', message },
      HttpStatus.PAYMENT_REQUIRED,
    );
  }
}

/** 423 Locked — учётная запись не прошла обязательную настройку. */
export class SetupRequiredException extends HttpException {
  constructor(message: string) {
    super({ statusCode: HttpStatus.LOCKED, error: 'SETUP_REQUIRED', message }, HttpStatus.LOCKED);
  }
}
