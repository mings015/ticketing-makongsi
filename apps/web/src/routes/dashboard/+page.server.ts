import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getDashboardStats } from '$lib/api/dashboard';
import { listActiveCategories } from '$lib/api/categories';

export const load: PageServerLoad = async ({ url, fetch, parent }) => {
  const { user } = await parent();
  if (!user) redirect(302, '/login');
  const isAdminOrAbove = user.roles?.some((r: string) => ['admin', 'super_admin'].includes(r));
  if (!isAdminOrAbove) redirect(302, '/tickets');

  const dateFrom = url.searchParams.get('dateFrom') ?? undefined;
  const dateTo = url.searchParams.get('dateTo') ?? undefined;
  const categoryId = url.searchParams.get('categoryId') ?? undefined;
  const priority = url.searchParams.get('priority') ?? undefined;

  const [stats, categories] = await Promise.all([
    getDashboardStats({ dateFrom, dateTo, categoryId, priority }, fetch),
    listActiveCategories(fetch).catch(() => []),
  ]);

  return {
    stats,
    categories,
    filters: { dateFrom, dateTo, categoryId, priority },
  };
};
