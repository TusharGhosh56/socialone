/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
  /**
   * API Gateway endpoint for the contact form, e.g.
   * https://w5vsxr9dx3.execute-api.us-east-1.amazonaws.com/prod/contact
   *
   * PUBLIC_ so it is inlined into the client bundle at build time — this is a
   * public URL with no credential attached. Everything sensitive (SES config,
   * the SMTP secret) stays in the Lambda's environment and Secrets Manager.
   */
  readonly PUBLIC_CONTACT_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
