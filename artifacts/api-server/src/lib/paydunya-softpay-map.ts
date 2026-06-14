export type OperatorKey =
  | "tmoney-togo"
  | "moov-togo"
  | "moov-benin"
  | "moov-burkina"
  | "moov-ci"
  | "mtn-benin"
  | "mtn-ci"
  | "orange-ci"
  | "orange-burkina"
  | "wave-ci";

export interface ChargePayload {
  [key: string]: string;
}

export interface DisbursePayload {
  [key: string]: string | number;
}

export interface OperatorConfig {
  label: string;
  country: string;
  /** Slug de l'endpoint SoftPay : /softpay/{endpoint} */
  endpoint: string;
  /** Channels PayDunya pour la création d'invoice */
  channels: string[];
  requiredFields: string[];
  /**
   * True si l'opérateur répond de façon asynchrone (TMoney → confirmation SMS).
   * False si la réponse est synchrone/instantanée (Moov).
   */
  isPending: boolean;
  /**
   * Construit le payload SoftPay selon la doc officielle PayDunya.
   * Le payment_token provient de checkout-invoice/create.
   */
  payloadBuilder: (params: {
    name: string;
    email: string;
    phone: string;
    paymentToken: string;
    address?: string;
  }) => ChargePayload;
  disburseEndpoint: string;
  disbursePayloadBuilder: (params: {
    name: string;
    phone: string;
    amount: number;
    reference: string;
  }) => DisbursePayload;
}

export const OPERATOR_MAP: Record<OperatorKey, OperatorConfig> = {

  // ─── Togo ─────────────────────────────────────────────────────────────────

  "tmoney-togo": {
    label: "T-Money Togo",
    country: "TG",
    endpoint: "t-money-togo",
    channels: ["tmoney-togo"],
    isPending: true,
    requiredFields: ["name_t_money", "email_t_money", "phone_t_money", "payment_token"],
    payloadBuilder: ({ name, email, phone, paymentToken }) => ({
      name_t_money: name,
      email_t_money: email,
      phone_t_money: phone,
      payment_token: paymentToken,
    }),
    disburseEndpoint: "t-money-togo",
    disbursePayloadBuilder: ({ name, phone, amount, reference }) => ({
      name_t_money: name,
      phone_t_money: phone,
      amount,
      ref: reference,
    }),
  },

  "moov-togo": {
    label: "Moov Money Togo",
    country: "TG",
    endpoint: "moov-togo",
    channels: ["moov-togo"],
    isPending: false,
    requiredFields: [
      "moov_togo_customer_fullname",
      "moov_togo_email",
      "moov_togo_customer_address",
      "moov_togo_phone_number",
      "payment_token",
    ],
    payloadBuilder: ({ name, email, phone, paymentToken, address }) => ({
      moov_togo_customer_fullname: name,
      moov_togo_email: email,
      moov_togo_customer_address: address ?? "Lomé, Togo",
      moov_togo_phone_number: phone,
      payment_token: paymentToken,
    }),
    disburseEndpoint: "moov-togo",
    disbursePayloadBuilder: ({ name, phone, amount, reference }) => ({
      moov_togo_customer_fullname: name,
      moov_togo_phone_number: phone,
      amount,
      ref: reference,
    }),
  },

  // ─── Bénin ────────────────────────────────────────────────────────────────

  "moov-benin": {
    label: "Moov Money Bénin",
    country: "BJ",
    endpoint: "moov-benin",
    channels: ["moov-benin"],
    isPending: false,
    requiredFields: [
      "moov_benin_customer_fullname",
      "moov_benin_email",
      "moov_benin_phone_number",
      "payment_token",
    ],
    payloadBuilder: ({ name, email, phone, paymentToken }) => ({
      moov_benin_customer_fullname: name,
      moov_benin_email: email,
      moov_benin_phone_number: phone,
      payment_token: paymentToken,
    }),
    disburseEndpoint: "moov-benin",
    disbursePayloadBuilder: ({ name, phone, amount, reference }) => ({
      moov_benin_customer_fullname: name,
      moov_benin_phone_number: phone,
      amount,
      ref: reference,
    }),
  },

  "mtn-benin": {
    label: "MTN MoMo Bénin",
    country: "BJ",
    endpoint: "mtn-benin",
    channels: ["mtn-benin"],
    isPending: false,
    requiredFields: [
      "mtn_benin_customer_fullname",
      "mtn_benin_email",
      "mtn_benin_phone_number",
      "mtn_benin_wallet_provider",
      "payment_token",
    ],
    payloadBuilder: ({ name, email, phone, paymentToken }) => ({
      mtn_benin_customer_fullname: name,
      mtn_benin_email: email,
      mtn_benin_phone_number: phone,
      mtn_benin_wallet_provider: "MTNBENIN",
      payment_token: paymentToken,
    }),
    disburseEndpoint: "mtn-benin",
    disbursePayloadBuilder: ({ name, phone, amount, reference }) => ({
      mtn_benin_customer_fullname: name,
      mtn_benin_phone_number: phone,
      mtn_benin_wallet_provider: "MTNBENIN",
      amount,
      ref: reference,
    }),
  },

  // ─── Burkina Faso ─────────────────────────────────────────────────────────

  "moov-burkina": {
    label: "Moov Money Burkina Faso",
    country: "BF",
    endpoint: "moov-burkina",
    channels: ["moov-burkina"],
    isPending: false,
    requiredFields: [
      "moov_burkina_faso_fullName",
      "moov_burkina_faso_email",
      "moov_burkina_faso_phone_number",
      "payment_token",
    ],
    payloadBuilder: ({ name, email, phone, paymentToken }) => ({
      moov_burkina_faso_fullName: name,
      moov_burkina_faso_email: email,
      moov_burkina_faso_phone_number: phone,
      payment_token: paymentToken,
    }),
    disburseEndpoint: "moov-burkina",
    disbursePayloadBuilder: ({ name, phone, amount, reference }) => ({
      moov_burkina_faso_fullName: name,
      moov_burkina_faso_phone_number: phone,
      amount,
      ref: reference,
    }),
  },

  "orange-burkina": {
    label: "Orange Money Burkina Faso",
    country: "BF",
    endpoint: "orange-money-burkina",
    channels: ["orange-money-burkina"],
    isPending: false,
    requiredFields: [
      "orange_burkina_faso_customer_fullname",
      "orange_burkina_faso_email",
      "orange_burkina_faso_phone_number",
      "payment_token",
    ],
    payloadBuilder: ({ name, email, phone, paymentToken }) => ({
      orange_burkina_faso_customer_fullname: name,
      orange_burkina_faso_email: email,
      orange_burkina_faso_phone_number: phone,
      payment_token: paymentToken,
    }),
    disburseEndpoint: "orange-money-burkina",
    disbursePayloadBuilder: ({ name, phone, amount, reference }) => ({
      orange_burkina_faso_customer_fullname: name,
      orange_burkina_faso_phone_number: phone,
      amount,
      ref: reference,
    }),
  },

  // ─── Côte d'Ivoire ────────────────────────────────────────────────────────

  "moov-ci": {
    label: "Moov Money Côte d'Ivoire",
    country: "CI",
    endpoint: "moov-ci",
    channels: ["moov-ci"],
    isPending: false,
    requiredFields: [
      "moov_ci_customer_fullname",
      "moov_ci_email",
      "moov_ci_phone_number",
      "payment_token",
    ],
    payloadBuilder: ({ name, email, phone, paymentToken }) => ({
      moov_ci_customer_fullname: name,
      moov_ci_email: email,
      moov_ci_phone_number: phone,
      payment_token: paymentToken,
    }),
    disburseEndpoint: "moov-ci",
    disbursePayloadBuilder: ({ name, phone, amount, reference }) => ({
      moov_ci_customer_fullname: name,
      moov_ci_phone_number: phone,
      amount,
      ref: reference,
    }),
  },

  "mtn-ci": {
    label: "MTN MoMo Côte d'Ivoire",
    country: "CI",
    endpoint: "mtn-ci",
    channels: ["mtn-ci"],
    isPending: false,
    requiredFields: [
      "mtn_ci_customer_fullname",
      "mtn_ci_email",
      "mtn_ci_phone_number",
      "payment_token",
    ],
    payloadBuilder: ({ name, email, phone, paymentToken }) => ({
      mtn_ci_customer_fullname: name,
      mtn_ci_email: email,
      mtn_ci_phone_number: phone,
      payment_token: paymentToken,
    }),
    disburseEndpoint: "mtn-ci",
    disbursePayloadBuilder: ({ name, phone, amount, reference }) => ({
      mtn_ci_customer_fullname: name,
      mtn_ci_phone_number: phone,
      amount,
      ref: reference,
    }),
  },

  "orange-ci": {
    label: "Orange Money Côte d'Ivoire",
    country: "CI",
    endpoint: "orange-money-ci",
    channels: ["orange-money-ci"],
    isPending: false,
    requiredFields: [
      "orange_ci_customer_fullname",
      "orange_ci_email",
      "orange_ci_phone_number",
      "payment_token",
    ],
    payloadBuilder: ({ name, email, phone, paymentToken }) => ({
      orange_ci_customer_fullname: name,
      orange_ci_email: email,
      orange_ci_phone_number: phone,
      payment_token: paymentToken,
    }),
    disburseEndpoint: "orange-money-ci",
    disbursePayloadBuilder: ({ name, phone, amount, reference }) => ({
      orange_ci_customer_fullname: name,
      orange_ci_phone_number: phone,
      amount,
      ref: reference,
    }),
  },

  "wave-ci": {
    label: "Wave Côte d'Ivoire",
    country: "CI",
    endpoint: "wave-ci",
    channels: ["wave-ci"],
    isPending: false,
    requiredFields: [
      "wave_ci_customer_fullname",
      "wave_ci_email",
      "wave_ci_phone_number",
      "payment_token",
    ],
    payloadBuilder: ({ name, email, phone, paymentToken }) => ({
      wave_ci_customer_fullname: name,
      wave_ci_email: email,
      wave_ci_phone_number: phone,
      payment_token: paymentToken,
    }),
    disburseEndpoint: "wave-ci",
    disbursePayloadBuilder: ({ name, phone, amount, reference }) => ({
      wave_ci_customer_fullname: name,
      wave_ci_phone_number: phone,
      amount,
      ref: reference,
    }),
  },
};

export const TOGO_OPERATOR_MAP: Record<"tmoney" | "moov", OperatorKey> = {
  tmoney: "tmoney-togo",
  moov: "moov-togo",
};

export function resolveTogoOperator(operator: "tmoney" | "moov"): OperatorConfig {
  const key = TOGO_OPERATOR_MAP[operator];
  return OPERATOR_MAP[key];
}

export function resolveOperator(key: string): OperatorConfig | undefined {
  return OPERATOR_MAP[key as OperatorKey];
}

export function getSupportedOperators(): { key: OperatorKey; label: string; country: string }[] {
  return (Object.keys(OPERATOR_MAP) as OperatorKey[]).map((key) => ({
    key,
    label: OPERATOR_MAP[key].label,
    country: OPERATOR_MAP[key].country,
  }));
}
