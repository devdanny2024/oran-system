import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface InitializeParams {
  email: string;
  amountNaira: number;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class PaystackService {
  private readonly secretKey: string | undefined;

  constructor(private readonly config: ConfigService) {
    this.secretKey = this.config.get<string>('PAYSTACK_SECRET_KEY');
  }

  private get headers() {
    if (!this.secretKey) {
      throw new Error('PAYSTACK_SECRET_KEY is not configured');
    }

    return {
      Authorization: `Bearer ${this.secretKey}`,
      'Content-Type': 'application/json',
    };
  }

  async initializeTransaction(params: InitializeParams) {
    const amountKobo = Math.round(params.amountNaira * 100);

    const res = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        email: params.email,
        amount: amountKobo,
        reference: params.reference,
        callback_url: params.callbackUrl,
        metadata: params.metadata ?? {},
      }),
    });

    const body = await res.json();
    if (!res.ok || body.status !== true) {
      // eslint-disable-next-line no-console
      console.error('[Paystack] initialize failed', res.status, body);
      throw new Error(
        body?.message ??
          'Unable to initialize Paystack transaction. Please try again.',
      );
    }

    return body.data as {
      authorization_url: string;
      access_code: string;
      reference: string;
    };
  }

  async verifyTransaction(reference: string) {
    const res = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(
        reference,
      )}`,
      {
        method: 'GET',
        headers: this.headers,
      },
    );

    const body = await res.json();
    if (!res.ok || body.status !== true) {
      // eslint-disable-next-line no-console
      console.error('[Paystack] verify failed', res.status, body);
      throw new Error(
        body?.message ??
          'Unable to verify Paystack transaction. Please contact support.',
      );
    }

    return body.data as {
      status: string;
      reference: string;
      amount: number;
      currency: string;
      metadata?: Record<string, any>;
    };
  }
}

