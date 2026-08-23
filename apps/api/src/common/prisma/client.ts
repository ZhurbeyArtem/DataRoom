/**
 * The single place that knows where Prisma 7 generates its client.
 * Everything else imports models and enums from here, so changing the
 * generation path touches one file instead of the whole application.
 */
export * from '../../generated/prisma/client';
