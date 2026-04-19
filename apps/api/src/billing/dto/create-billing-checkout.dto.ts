import { IsIn, IsOptional } from 'class-validator';
import type {
  BillingLocale,
  BillingPlanCode,
} from '@bac-bank/contracts/billing';

export class CreateBillingCheckoutDto {
  @IsIn(['PREMIUM_30_DAYS', 'PREMIUM_90_DAYS', 'PREMIUM_BAC_SEASON'])
  planCode!: BillingPlanCode;

  @IsOptional()
  @IsIn(['ar', 'fr', 'en'])
  locale?: BillingLocale;
}
