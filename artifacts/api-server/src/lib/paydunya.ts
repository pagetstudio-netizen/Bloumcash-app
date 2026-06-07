const BASE_URL = "https://app.paydunya.com/api/v1";

function getHeaders() {
  return {
    "Content-Type": "application/json",
    "PAYDUNYA-MASTER-KEY": process.env.PAYDUNYA_MASTER_KEY ?? "",
    "PAYDUNYA-PRIVATE-KEY": process.env.PAYDUNYA_PRIVATE_KEY ?? "",
    "PAYDUNYA-TOKEN": process.env.PAYDUNYA_TOKEN ?? "",
  };
}

export function isConfigured(): boolean {
  return !!(
    process.env.PAYDUNYA_MASTER_KEY &&
    process.env.PAYDUNYA_PRIVATE_KEY &&
    process.env.PAYDUNYA_TOKEN
  );
}

export interface InvoiceResult {
  token: string;
}

export interface ChargeResult {
  success: boolean;
  message: string;
  fees?: number;
  currency?: string;
  response_code?: string;
  response_text?: string;
}

export async function createInvoice(
  amount: number,
  description: string
): Promise<InvoiceResult> {
  const res = await fetch(`${BASE_URL}/checkout-invoice/create`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      invoice: {
        total_amount: amount,
        description,
      },
      store: {
        name: process.env.PAYDUNYA_STORE_NAME ?? "Bloum Cash",
        tagline: "Transferts TMoney & Moov Money",
        website_url: process.env.PAYDUNYA_CALLBACK_URL ?? "",
        postal_address: "Lomé, Togo",
        phone: process.env.PAYDUNYA_STORE_PHONE ?? "",
      },
      actions: {
        cancel_url: process.env.PAYDUNYA_CALLBACK_URL ?? "",
        return_url: process.env.PAYDUNYA_CALLBACK_URL ?? "",
        callback_url: process.env.PAYDUNYA_CALLBACK_URL ?? "",
      },
    }),
  });

  const data = await res.json();

  if (data.response_code !== "00") {
    throw new Error(
      `PayDunya invoice error: ${data.response_text ?? JSON.stringify(data)}`
    );
  }

  return { token: data.token };
}

export async function chargeTMoney(
  name: string,
  email: string,
  phone: string,
  paymentToken: string
): Promise<ChargeResult> {
  const res = await fetch(`${BASE_URL}/softpay/t-money-togo`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      name_t_money: name,
      email_t_money: email,
      phone_t_money: phone.replace(/\D/g, ""),
      payment_token: paymentToken,
    }),
  });

  const data = await res.json();
  return {
    success: data.success === true,
    message: data.message ?? "Paiement initié",
    fees: data.fees,
    currency: data.currency,
    response_code: data.response_code,
    response_text: data.response_text,
  };
}

export async function chargeMoov(
  name: string,
  email: string,
  phone: string,
  paymentToken: string
): Promise<ChargeResult> {
  const res = await fetch(`${BASE_URL}/softpay/moov-togo`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      moov_togo_customer_fullname: name,
      moov_togo_email: email,
      moov_togo_customer_address: "Lomé, Togo",
      moov_togo_phone_number: phone.replace(/\D/g, ""),
      payment_token: paymentToken,
    }),
  });

  const data = await res.json();
  return {
    success: data.success === true,
    message: data.message ?? "Paiement effectué",
    fees: data.fees,
    currency: data.currency,
    response_code: data.response_code,
    response_text: data.response_text,
  };
}

export async function chargeWallet(
  operator: "tmoney" | "moov",
  name: string,
  email: string,
  phone: string,
  paymentToken: string
): Promise<ChargeResult> {
  if (operator === "tmoney") {
    return chargeTMoney(name, email, phone, paymentToken);
  }
  return chargeMoov(name, email, phone, paymentToken);
}
