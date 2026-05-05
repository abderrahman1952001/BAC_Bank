import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  RawBody,
  Req,
  UseGuards,
} from '@nestjs/common';
import type {
  BillingCheckoutResponse,
  BillingCreateCheckoutResponse,
  BillingOverviewResponse,
} from '@bac-bank/contracts/billing';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { buildRequestOriginFromHeaders } from '../runtime/runtime-config';
import { BillingService } from './billing.service';
import { CreateBillingCheckoutDto } from './dto/create-billing-checkout.dto';

@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @UseGuards(ClerkAuthGuard)
  @Get('overview')
  getBillingOverview(
    @Req() request: AuthenticatedRequest,
  ): Promise<BillingOverviewResponse> {
    return this.billingService.getBillingOverview(request.user!.id);
  }

  @UseGuards(ClerkAuthGuard)
  @Post('checkouts')
  createCheckout(
    @Req() request: AuthenticatedRequest,
    @Body() payload: CreateBillingCheckoutDto,
  ): Promise<BillingCreateCheckoutResponse> {
    return this.billingService.createCheckoutForUser(
      request.user!.id,
      payload,
      {
        appOrigin: buildRequestOriginFromHeaders({
          host: request.headers.host,
          forwardedHost: request.headers['x-forwarded-host'],
          forwardedProto: request.headers['x-forwarded-proto'],
        }),
      },
    );
  }

  @UseGuards(ClerkAuthGuard)
  @Get('checkouts/:id')
  getCheckout(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) checkoutId: string,
  ): Promise<BillingCheckoutResponse> {
    return this.billingService.getCheckoutForUser(request.user!.id, checkoutId);
  }

  @UseGuards(ClerkAuthGuard)
  @HttpCode(200)
  @Post('checkouts/:id/sync')
  syncCheckout(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) checkoutId: string,
  ): Promise<BillingCheckoutResponse> {
    return this.billingService.syncCheckoutForUser(
      request.user!.id,
      checkoutId,
    );
  }

  @HttpCode(200)
  @Post('webhooks/chargily')
  handleChargilyWebhook(
    @Headers('signature') signature: string | undefined,
    @RawBody() rawBody: Buffer | undefined,
  ) {
    return this.billingService.handleChargilyWebhook({
      signature,
      rawPayload: rawBody?.toString('utf8') ?? null,
    });
  }
}
