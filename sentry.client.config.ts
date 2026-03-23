// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const isProduction = process.env.NODE_ENV === "production";

Sentry.init({
  dsn: "https://9f6f0612de3d50bd5c787fd38fe3a41e@o4510982928400384.ingest.us.sentry.io/4510982930825216",

  environment:
    process.env.SENTRY_ENVIRONMENT ??
    process.env.VERCEL_ENV ??
    process.env.NODE_ENV,

  tracesSampleRate: isProduction ? 0.1 : 1,
  enableLogs: true,
  sendDefaultPii: true,
});
