import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { listAuditLogs, getDistinctActions } from '$lib/api/audit-logs';

export const load: PageServerLoad = async ({ url, fetch, parent }) => {
  const { user } = await parent();
  if (!user) redirect(302, '/login');
  const isAdminOrAbove = user.roles?.some((r: string) => ['admin', 'super_admin'].includes(r));
  if (!isAdminOrAbove) redirect(302, '/tickets');

  const page       = Number(url.searchParams.get('page')       ?? '1');
  const search     = url.searchParams.get('search')     ?? undefined;
  const action     = url.searchParams.get('action')     ?? undefined;
  const targetType = url.searchParams.get('targetType') ?? undefined;
  const dateFrom   = url.searchParams.get('dateFrom')   ?? undefined;
  const dateTo     = url.searchParams.get('dateTo')     ?? undefined;

  const [result, actions] = await Promise.all([
    listAuditLogs({ page, limit: 50, search, action, targetType, dateFrom, dateTo }, fetch),
    getDistinctActions(fetch).catch(() => [] as string[]),
  ]);

  return {
    ...result,
    actions,
    filters: { search, action, targetType, dateFrom, dateTo },
  };
};
