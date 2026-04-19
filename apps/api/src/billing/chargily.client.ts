import { createHmac, timingSafeEqual } from 'crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type ChargilyLivemode = boolean | 'true' | 'false';
type ChargilyCheckoutStatus =
  | 'pending'
  | 'processing'
  | 'paid'
  | 'failed'
  | 'canceled';

type ChargilyCustomer = {
  id: string;
  livemode: boolean;
};

export type ChargilyCheckout = {
  id: string;
  livemode: boolean;
  amount: number;
  currency: string;
  status: ChargilyCheckoutStatus;
  locale: string;
  successUrl: string | null;
  failureUrl: string | null;
  webhookEndpoint: string | null;
  paymentMethod: string | null;
  invoiceId: string | null;
  customerId: string | null;
  createdAt: number;
  updatedAt: number;
  checkoutUrl: string | null;
  payload: Record<string, unknown>;
};

export type ChargilyWebhookEvent = {
  id: string;
  type: string;
  livemode: boolean;
  checkout: ChargilyCheckout;
  payload: Record<string, unknown>;
};

@Injectable()
export class ChargilyClient {
  constructor(private readonly configService: ConfigService) {}

  isConfigured() {
    return Boolean(this.readOptionalSecretKey());
  }

  async createCustomer(input: {
    name: string;
    email: string;
    metadata?: Record<string, string>;
  }) {
    const payload = await this.requestJson(
      '/customers',
      {
        method: 'POST',
        body: JSON.stringify({
          name: input.name,
          email: input.email,
          metadata: input.metadata ?? undefined,
        }),
      },
      'Chargily customer creation failed.',
    );

    return parseChargilyCustomer(payload);
  }

  async createCheckout(input: {
    amount: number;
    currency: 'dzd';
    locale: 'ar' | 'fr' | 'en';
    successUrl: string;
    failureUrl: string;
    webhookUrl: string;
    description: string;
    customerId?: string | null;
    metadata?: Record<string, string>;
    feesAllocation?: 'merchant' | 'customer' | 'split';
  }) {
    const payload = await this.requestJson(
      '/checkouts',
      {
        method: 'POST',
        body: JSON.stringify({
          amount: input.amount,
          currency: input.currency,
          locale: input.locale,
          success_url: input.successUrl,
          failure_url: input.failureUrl,
          webhook_url: input.webhookUrl,
          description: input.description,
          customer_id: input.customerId ?? undefined,
          metadata: input.metadata ?? undefined,
          chargily_pay_fees_allocation: input.feesAllocation ?? 'merchant',
        }),
      },
      'Chargily checkout creation failed.',
    );

    return parseChargilyCheckout(payload);
  }

  async retrieveCheckout(checkoutId: string) {
    const payload = await this.requestJson(
      `/checkouts/${encodeURIComponent(checkoutId)}`,
      {
        method: 'GET',
      },
      'Chargily checkout lookup failed.',
    );

    return parseChargilyCheckout(payload);
  }

  verifyWebhookSignature(input: {
    payload: string;
    signature?: string | null;
  }) {
    const secretKey = this.readSecretKey();
    const signature = input.signature?.trim();

    if (!signature) {
      return false;
    }

    const expected = createHmac('sha256', secretKey)
      .update(input.payload, 'utf8')
      .digest('hex');

    const actualBuffer = Buffer.from(signature, 'utf8');
    const expectedBuffer = Buffer.from(expected, 'utf8');

    if (actualBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(actualBuffer, expectedBuffer);
  }

  parseWebhookEvent(payload: string) {
    let rawValue: unknown;

    try {
      rawValue = JSON.parse(payload);
    } catch {
      throw new Error('Chargily webhook payload is not valid JSON.');
    }

    const event = readRecord(rawValue, 'Chargily webhook event');
    return {
      id: readString(event.id, 'Chargily webhook event id'),
      type: readString(event.type, 'Chargily webhook event type'),
      livemode: readBooleanLike(event.livemode, 'Chargily webhook livemode'),
      checkout: parseChargilyCheckout(event.data),
      payload: event,
    } satisfies ChargilyWebhookEvent;
  }

  private async requestJson(
    path: string,
    init: RequestInit,
    fallbackMessage: string,
  ) {
    const headers = new Headers(init.headers ?? {});
    headers.set('Authorization', `Bearer ${this.readSecretKey()}`);

    if (init.body !== undefined && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(`${this.resolveApiBaseUrl()}${path}`, {
      ...init,
      headers,
    });

    if (!response.ok) {
      throw new Error(
        `${fallbackMessage} ${await readProviderErrorMessage(response)}`,
      );
    }

    return (await response.json()) as unknown;
  }

  private resolveApiBaseUrl() {
    const configuredBaseUrl = this.configService
      .get<string>('CHARGILY_API_BASE_URL')
      ?.trim();

    if (configuredBaseUrl) {
      return configuredBaseUrl.replace(/\/$/, '');
    }

    return this.readSecretKey().startsWith('test_')
      ? 'https://pay.chargily.net/test/api/v2'
      : 'https://pay.chargily.net/api/v2';
  }

  private readOptionalSecretKey() {
    const secretKey = this.configService
      .get<string>('CHARGILY_SECRET_KEY')
      ?.trim();

    return secretKey ?? null;
  }

  private readSecretKey() {
    const secretKey = this.readOptionalSecretKey();

    if (!secretKey) {
      throw new Error('CHARGILY_SECRET_KEY is not configured.');
    }

    return secretKey;
  }
}

async function readProviderErrorMessage(response: Response) {
  try {
    const payload = (await response.json()) as unknown;
    const record = readRecord(payload, 'Chargily error payload');
    const message = record.message;

    if (typeof message === 'string' && message.trim()) {
      return message.trim();
    }
  } catch {
    // Ignore JSON parsing failures and fall through to text handling.
  }

  try {
    const text = await response.text();

    if (text.trim()) {
      return text.trim();
    }
  } catch {
    // Ignore text parsing failures.
  }

  return `Request failed with status ${response.status}.`;
}

function parseChargilyCustomer(value: unknown): ChargilyCustomer {
  const payload = readRecord(value, 'Chargily customer');

  return {
    id: readString(payload.id, 'Chargily customer id'),
    livemode: readBooleanLike(payload.livemode, 'Chargily customer livemode'),
  };
}

function parseChargilyCheckout(value: unknown): ChargilyCheckout {
  const payload = readRecord(value, 'Chargily checkout');
  const status = readString(payload.status, 'Chargily checkout status');

  if (
    status !== 'pending' &&
    status !== 'processing' &&
    status !== 'paid' &&
    status !== 'failed' &&
    status !== 'canceled'
  ) {
    throw new Error(`Chargily checkout status "${status}" is not supported.`);
  }

  return {
    id: readString(payload.id, 'Chargily checkout id'),
    livemode: readBooleanLike(payload.livemode, 'Chargily checkout livemode'),
    amount: readNumber(payload.amount, 'Chargily checkout amount'),
    currency: readString(payload.currency, 'Chargily checkout currency'),
    status,
    locale: readString(payload.locale, 'Chargily checkout locale'),
    successUrl: readNullableString(
      payload.success_url,
      'Chargily checkout success_url',
    ),
    failureUrl: readNullableString(
      payload.failure_url,
      'Chargily checkout failure_url',
    ),
    webhookEndpoint: readNullableString(
      payload.webhook_endpoint,
      'Chargily checkout webhook_endpoint',
    ),
    paymentMethod: readNullableString(
      payload.payment_method,
      'Chargily checkout payment_method',
    ),
    invoiceId: readNullableString(
      payload.invoice_id,
      'Chargily checkout invoice_id',
    ),
    customerId: readNullableString(
      payload.customer_id,
      'Chargily checkout customer_id',
    ),
    createdAt: readNumber(payload.created_at, 'Chargily checkout created_at'),
    updatedAt: readNumber(payload.updated_at, 'Chargily checkout updated_at'),
    checkoutUrl: readNullableString(
      payload.checkout_url,
      'Chargily checkout checkout_url',
    ),
    payload,
  };
}

function readRecord(value: unknown, label: string) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }

  return value as Record<string, unknown>;
}

function readString(value: unknown, label: string) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label} must be a non-empty string.`);
  }

  return value;
}

function readNullableString(value: unknown, label: string) {
  if (value === null || value === undefined) {
    return null;
  }

  return readString(value, label);
}

function readNumber(value: unknown, label: string) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number.`);
  }

  return value;
}

function readBooleanLike(value: unknown, label: string) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  throw new Error(`${label} must be a boolean-like value.`);
}
