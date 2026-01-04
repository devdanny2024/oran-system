import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface InitializeParams {
  email: string;
  amountNaira: number;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, any>;
}

interface ResolveAccountParams {
  accountNumber: string;
  bankCode: string;
}

interface CreateTransferRecipientParams {
  name: string;
  accountNumber: string;
  bankCode: string;
  bankName?: string;
}

interface InitiateTransferParams {
  amountNaira: number;
  recipient: string;
  reason?: string;
  reference: string;
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

  async resolveAccount(params: ResolveAccountParams) {
    const url =
      'https://api.paystack.co/bank/resolve' +
      `?account_number=${encodeURIComponent(params.accountNumber)}` +
      `&bank_code=${encodeURIComponent(params.bankCode)}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: this.headers,
    });

    const body = await res.json();
    if (!res.ok || body.status !== true) {
      // eslint-disable-next-line no-console
      console.error('[Paystack] resolve account failed', res.status, body);
      throw new Error(
        body?.message ??
          'Unable to resolve bank account. Please check the details and try again.',
      );
    }

    return body.data as {
      account_name: string;
      account_number: string;
      bank_id: number;
    };
  }

  async createTransferRecipient(params: CreateTransferRecipientParams) {
    const res = await fetch('https://api.paystack.co/transferrecipient', {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        type: 'nuban',
        name: params.name,
        account_number: params.accountNumber,
        bank_code: params.bankCode,
        currency: 'NGN',
        bank_name: params.bankName,
      }),
    });

    const body = await res.json();
    if (!res.ok || body.status !== true) {
      // eslint-disable-next-line no-console
      console.error('[Paystack] create transfer recipient failed', res.status, body);
      throw new Error(
        body?.message ??
          'Unable to register transfer recipient with Paystack. Please try again.',
      );
    }

    return body.data as {
      recipient_code: string;
    };
  }

  async initiateTransfer(params: InitiateTransferParams) {
    const amountKobo = Math.round(params.amountNaira * 100);

    const res = await fetch('https://api.paystack.co/transfer', {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        source: 'balance',
        amount: amountKobo,
        recipient: params.recipient,
        reason: params.reason ?? 'ORAN project disbursement',
        reference: params.reference,
      }),
    });

    const body = await res.json();
    if (!res.ok || body.status !== true) {
      // eslint-disable-next-line no-console
      console.error('[Paystack] initiate transfer failed', res.status, body);
      throw new Error(
        body?.message ??
          'Unable to initiate transfer via Paystack. Please try again.',
      );
    }

    return body.data as {
      transfer_code: string;
      reference: string;
      status: string;
    };
  }

  async listBanks() {
    const res = await fetch(
      'https://api.paystack.co/bank?currency=NGN',
      {
        method: 'GET',
        headers: this.headers,
      },
    );

    const body = await res.json();
    if (!res.ok || body.status !== true) {
      // eslint-disable-next-line no-console
      console.error('[Paystack] list banks failed', res.status, body);
      throw new Error(
        body?.message ??
          'Unable to load bank list from Paystack. Please try again.',
      );
    }

    return body.data as {
      name: string;
      code: string;
      slug?: string;
    }[];
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
