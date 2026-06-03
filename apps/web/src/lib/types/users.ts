export interface UserSummary {
  id: string;
  email: string;
  fullName: string;
  isActive: boolean;
  roles: string[];
  createdAt: string;
}

export interface UserDetail extends UserSummary {
  failedLoginAttempts: number | null;
  lockedUntil: string | null;
  updatedAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface UsersListResponse {
  data: UserSummary[];
  meta: PaginationMeta;
}

export const ROLES = ['super_admin', 'admin', 'support', 'employee'] as const;
export type RoleName = (typeof ROLES)[number];

export const ROLE_LABELS: Record<RoleName, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  support: 'Support',
  employee: 'Employee',
};

export const ROLE_COLORS: Record<RoleName, string> = {
  super_admin: 'bg-purple-100 text-purple-800',
  admin: 'bg-blue-100 text-blue-800',
  support: 'bg-green-100 text-green-800',
  employee: 'bg-gray-100 text-gray-700',
};
