import { SetMetadata } from '@nestjs/common';

export const ALLOW_EXPIRED_KEY = 'allowExpired';

/**
 * Маршрут доступен школе с законченной подпиской: сведения о ней самой,
 * оплата и выход. Всё остальное ждёт продления.
 */
export const AllowExpired = () => SetMetadata(ALLOW_EXPIRED_KEY, true);
