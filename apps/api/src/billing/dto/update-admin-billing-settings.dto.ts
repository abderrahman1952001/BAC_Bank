import { IsInt, IsISO8601, IsOptional, Min } from 'class-validator';
import type { UpdateAdminBillingSettingsRequest } from '@bac-bank/contracts/admin';

export class UpdateAdminBillingSettingsDto implements UpdateAdminBillingSettingsRequest {
  @IsInt()
  @Min(100)
  premium30DaysAmountDzd!: number;

  @IsInt()
  @Min(1)
  premium30DaysDurationDays!: number;

  @IsInt()
  @Min(100)
  premium90DaysAmountDzd!: number;

  @IsInt()
  @Min(1)
  premium90DaysDurationDays!: number;

  @IsInt()
  @Min(100)
  premiumBacSeasonAmountDzd!: number;

  @IsOptional()
  @IsISO8601({
    strict: true,
    strictSeparator: true,
  })
  configuredBacSeasonEndsAt!: string | null;
}
