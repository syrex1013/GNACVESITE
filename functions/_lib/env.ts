export type Env = {
  DB: D1Database;
  SITE_URL: string;
  ADMIN_EMAIL?: string;
  ADMIN_PASSWORD_HASH?: string;
  TURNSTILE_SECRET_KEY?: string;
  TURNSTILE_SITE_KEY?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM?: string;
};

export type AppEnv = { Bindings: Env };
