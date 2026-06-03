import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
  const { user } = await parent();
  const isAdminOrAbove = user?.roles?.some((r: string) => ['admin', 'super_admin'].includes(r));
  redirect(302, isAdminOrAbove ? '/dashboard' : '/tickets');
};
