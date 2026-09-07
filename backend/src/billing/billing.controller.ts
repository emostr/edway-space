import { Body, Controller, Get, HttpCode, Param, Post, Req } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { BillingService } from './billing.service';
import { Public } from '../common/decorators/public.decorator';
import { AllowExpired } from '../common/decorators/allow-expired.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentAccount } from '../common/decorators/current-account.decorator';
import { RequestAccount } from '../common/types';
import { CheckoutDto, PurchaseDto } from './dto/billing.dto';

@Controller('billing')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  /** Цена для лендинга и страницы продления. */
  @Public()
  @Get('plan')
  plan() {
    return this.billing.plan();
  }

  @Public()
  @Post('purchase')
  @HttpCode(200)
  purchase(@Body() dto: PurchaseDto) {
    return this.billing.purchase(dto);
  }

  @Roles('SCHOOL_ADMIN')
  @AllowExpired()
  @Post('checkout')
  @HttpCode(200)
  checkout(@CurrentAccount() account: RequestAccount, @Body() dto: CheckoutDto) {
    return this.billing.checkout(account, dto.email);
  }

  /**
   * Приёмник уведомлений кассы. Отвечаем 200 на любое уведомление, которое
   * разобрали: иначе ЮKassa будет повторять его сутки.
   */
  @Public()
  @Post('webhook')
  @HttpCode(200)
  webhook(@Req() req: FastifyRequest) {
    return this.billing.handleWebhook(req.body);
  }

  @Public()
  @Get('result/:externalId')
  result(@Param('externalId') externalId: string) {
    return this.billing.result(externalId);
  }

  /** Подтверждение учебного платежа: только пока настоящая касса не подключена. */
  @Public()
  @Post('result/:externalId/confirm')
  @HttpCode(200)
  confirm(@Param('externalId') externalId: string) {
    return this.billing.confirmTestPayment(externalId);
  }

  @Roles('SCHOOL_ADMIN')
  @AllowExpired()
  @Get('payments')
  history(@CurrentAccount() account: RequestAccount) {
    return this.billing.history(account.school?.id ?? '');
  }
}
