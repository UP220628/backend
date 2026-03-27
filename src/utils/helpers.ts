import { ROLE_IDS } from '../constants';
import sql from '../config/database';

/**
 * Returns the provider ID if the user is a CARRIER, otherwise undefined.
 * Used for automatically filtering data by the carrier's provider.
 */
export function getCarrierProviderId(user: any): number | undefined {
  return user?.roleId === ROLE_IDS.CARRIER && user.providerId
    ? user.providerId
    : undefined;
}

/**
 * Returns the user's plant filter.
 * ADMIN users see all plants (returns undefined), others see only their plant.
 */
export function getUserPlantFilter(user: any): string | undefined {
  return user?.roleId === ROLE_IDS.ADMIN ? undefined : user?.plant;
}

/**
 * Builds a date-range SQL fragment for dashboard queries.
 */
export function buildDateFilter(filter: string | undefined) {
  if (filter === 'today') {
    return sql`AND (u."createdAt" AT TIME ZONE 'America/Mexico_City')::date = (NOW() AT TIME ZONE 'America/Mexico_City')::date`;
  }
  if (filter === 'week') {
    return sql`AND u."createdAt" >= NOW() - INTERVAL '7 days'`;
  }
  if (filter === 'month') {
    return sql`AND u."createdAt" >= NOW() - INTERVAL '30 days'`;
  }
  return sql``;
}

/**
 * Extracts the Bearer token from the Authorization header.
 */
export function getTokenFromHeader(req: { headers: { authorization?: string } }): string | undefined {
  return req.headers.authorization?.replace('Bearer ', '') || undefined;
}

/**
 * Resolves the user's role name from multiple sources in priority order:
 * res.locals.user.roleName > res.locals.user.role > x-user-role header > body.requesterRole > body.roleName
 */
export function resolveUserRole(req: any, res: any): string | undefined {
  const localUser: any = (res.locals && res.locals.user) || null;
  const roleFromId =
    typeof localUser?.roleId === 'number'
      ? Object.entries(ROLE_IDS).find(([, value]) => value === localUser.roleId)?.[0]
      : undefined;
  const roleCandidates = [
    roleFromId,
    localUser?.roleName,
    localUser?.role,
    (req.headers['x-user-role'] as string) || undefined,
    req.body?.requesterRole,
    req.body?.roleName,
  ];
  return roleCandidates.find((r: any) => typeof r === 'string') as string | undefined;
}
