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

export interface OperatorConfig {
  label: string;
  country: string;
  endpoint: string;
  requiredFields: string[];
  payloadBuilder: (params: {
    name: string;
    email: string;
    phone: string;
    paymentToken: string;
    address?: string;
  }) => ChargePayload;
}

export const OPERATOR_MAP: Record<OperatorKey, OperatorConfig> = {
  "tmoney-togo": {
    label: "T-Money Togo",
    country: "TG",
    endpoint: "t-money-togo",
    requiredFields: ["name_t_money", "email_t_money", "phone_t_money", "payment_token"],
    payloadBuilder: ({ name, email, phone, paymentToken }) => ({
      name_t_money: name,
      email_t_money: email,
      phone_t_money: phone,
      payment_token: paymentToken,
    }),
  },

  "moov-togo": {
    label: "Moov Money Togo",
    country: "TG",
    endpoint: "moov-togo",
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
  },

  "moov-benin": {
    label: "Moov Money Bénin",
    country: "BJ",
    endpoint: "moov-benin",
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
  },

  "moov-burkina": {
    label: "Moov Money Burkina Faso",
    country: "BF",
    endpoint: "moov-burkina",
    requiredFields: [
      "moov_burkina_faso_fullName",
      "moov_burkina_faso_email",
      "moov_burkina_faso_phone_number",
      "moov_burkina_faso_payment_token",
    ],
    payloadBuilder: ({ name, email, phone, paymentToken }) => ({
      moov_burkina_faso_fullName: name,
      moov_burkina_faso_email: email,
      moov_burkina_faso_phone_number: phone,
      moov_burkina_faso_payment_token: paymentToken,
    }),
  },

  "moov-ci": {
    label: "Moov Money Côte d'Ivoire",
    country: "CI",
    endpoint: "moov-ci",
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
  },

  "mtn-benin": {
    label: "MTN MoMo Bénin",
    country: "BJ",
    endpoint: "mtn-benin",
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
  },

  "mtn-ci": {
    label: "MTN MoMo Côte d'Ivoire",
    country: "CI",
    endpoint: "mtn-ci",
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
  },

  "orange-ci": {
    label: "Orange Money Côte d'Ivoire",
    country: "CI",
    endpoint: "orange-money-ci",
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
  },

  "orange-burkina": {
    label: "Orange Money Burkina Faso",
    country: "BF",
    endpoint: "orange-money-burkina",
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
  },

  "wave-ci": {
    label: "Wave Côte d'Ivoire",
    country: "CI",
    endpoint: "wave-ci",
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
