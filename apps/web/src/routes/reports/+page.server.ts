import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getTicketStats, getSlaStats, getStaffStats, getTrends } from '$lib/api/reports';
import { listActiveCategories } from '$lib/api/categories';

export const load: PageServerLoad = async ({ url, fetch, parent }) => {
  const { user } = await parent();
  if (!user) redirect(302, '/login');
  const isAdminOrAbove = user.roles?.some((r: string) => ['admin', 'super_admin'].includes(r));
  if (!isAdminOrAbove) redirect(302, '/tickets');

  const dateFrom    = url.searchParams.get('dateFrom')    ?? undefined;
  const dateTo      = url.searchParams.get('dateTo')      ?? undefined;
  const categoryId  = url.searchParams.get('categoryId')  ?? undefined;
  const priority    = url.searchParams.get('priority')    ?? undefined;
  const period      = url.searchParams.get('period')      ?? 'daily';

  const params = { dateFrom, dateTo, categoryId, priority };

  const [ticketStats, slaStats, staffStats, trends, categories] = await Promise.all([
    getTicketStats(params, fetch),
    getSlaStats(params, fetch),
    getStaffStats(params, fetch),
    getTrends({ ...params, period }, fetch),
    listActiveCategories(fetch).catch(() => []),
  ]);

  return {
    ticketStats,
    slaStats,
    staffStats,
    trends,
    categories,
    filters: { dateFrom, dateTo, categoryId, priority, period },
  };
};
