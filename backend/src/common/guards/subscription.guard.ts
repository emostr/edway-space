import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ALLOW_SETUP_KEY } from '../decorators/allow-setup.decorator';
import { ALLOW_EXPIRED_KEY } from '../decorators/allow-expired.decorator';
import { RequestAccount } from '../types';
import { SubscriptionExpiredException } from '../exceptions';
import { isUsable } from '../subscription';

/**
 * Школа с законченной подпиской остаётся в системе со всеми данными, но
 * работать в ней нельзя: открыты только сведения о подписке и оплата.
 * Данные не удаляются и не портятся — их вернут сразу после продления.
 */
@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const skip = [IS_PUBLIC_KEY, ALLOW_SETUP_KEY, ALLOW_EXPIRED_KEY].some((key) =>
      this.reflector.getAllAndOverride<boolean>(key, [context.getHandler(), context.getClass()]),
    );
    if (skip) {
      return true;
    }

    const account = context.switchToHttp().getRequest<{ account?: RequestAccount }>().account;
    // У администратора платформы школы нет — ограничение к нему не относится.
    if (!account?.school) {
      return true;
    }

    if (!isUsable(account.school.status)) {
      throw new SubscriptionExpiredException(
        account.school.status === 'BLOCKED'
          ? 'Школа отключена администратором платформы'
          : 'Подписка школы закончилась — продлите её, чтобы продолжить работу',
      );
    }
    return true;
  }
}
