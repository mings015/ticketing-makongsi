<script lang="ts">
  import { enhance } from '$app/forms';
  import { goto, invalidateAll } from '$app/navigation';
  import { toast } from 'svelte-sonner';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Badge } from '$lib/components/ui/badge';
  import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  } from '$lib/components/ui/table';
  import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuSeparator, DropdownMenuTrigger,
  } from '$lib/components/ui/dropdown-menu';
  import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription,
    AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  } from '$lib/components/ui/alert-dialog';
  import { Avatar, AvatarFallback } from '$lib/components/ui/avatar';
  import UserSheet from '$lib/components/users/UserSheet.svelte';
  import DeactivateDialog from '$lib/components/users/DeactivateDialog.svelte';
  import type { PageData } from './$types';
  import type { UserSummary } from '$lib/types/users';
  import { ROLE_LABELS, ROLE_COLORS, type RoleName, ROLES } from '$lib/types/users';

  let { data }: { data: PageData } = $props();

  let search = $state('');
  let roleFilter = $state('');
  let isActiveFilter = $state('');

  // Sync filter state when URL params change (e.g. back navigation)
  $effect(() => {
    search = data.filters.search ?? '';
    roleFilter = data.filters.role ?? '';
    isActiveFilter = data.filters.isActive === undefined ? '' : String(data.filters.isActive);
  });

  // Sheet state
  let sheetOpen = $state(false);
  let editingUser = $state<UserSummary | null>(null);

  // Deactivate dialog
  let deactivateOpen = $state(false);
  let deactivatingUser = $state<UserSummary | null>(null);

  // Delete dialog
  let deleteOpen = $state(false);
  let deletingUser = $state<UserSummary | null>(null);

  let searchTimeout: ReturnType<typeof setTimeout>;

  function onSearchInput(e: Event) {
    clearTimeout(searchTimeout);
    search = (e.target as HTMLInputElement).value;
    searchTimeout = setTimeout(applyFilters, 300);
  }

  function applyFilters() {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (roleFilter) params.set('role', roleFilter);
    if (isActiveFilter !== '') params.set('isActive', isActiveFilter);
    goto(`/users?${params}`, { replaceState: true });
  }

  function openCreate() { editingUser = null; sheetOpen = true; }
  function openEdit(u: UserSummary) { editingUser = u; sheetOpen = true; }
  function openDeactivate(u: UserSummary) { deactivatingUser = u; deactivateOpen = true; }
  function openDelete(u: UserSummary) { deletingUser = u; deleteOpen = true; }

  function getInitials(name: string) {
    return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
  }

  // Generic enhancer that shows toast based on action result
  function withToast() {
    return async ({ result, update }: { result: { type: string; data?: unknown }; update: () => Promise<void> }) => {
      if (result.type === 'success') {
        const msg = (result.data as { message?: string })?.message ?? 'Berhasil';
        toast.success(msg);
        await invalidateAll();
      } else if (result.type === 'failure') {
        const err = (result.data as { error?: string })?.error ?? 'Terjadi kesalahan';
        toast.error(err);
      }
      await update();
    };
  }

  const { meta } = $derived(data);
  const canGoNext = $derived(meta.page < meta.totalPages);
  const canGoPrev = $derived(meta.page > 1);
</script>

<div class="p-4 sm:p-6 space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-xl font-bold sm:text-2xl">Users</h1>
      <p class="text-sm text-muted-foreground">{meta.total} total users</p>
    </div>
    <Button onclick={openCreate} size="sm">+ New User</Button>
  </div>

  <!-- Filters -->
  <div class="flex flex-wrap gap-3">
    <Input
      class="w-full sm:w-64"
      placeholder="Search name or email..."
      value={search}
      oninput={onSearchInput}
    />
    <select
      class="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      bind:value={roleFilter}
      onchange={applyFilters}
    >
      <option value="">All Roles</option>
      {#each ROLES as role}
        <option value={role}>{ROLE_LABELS[role]}</option>
      {/each}
    </select>
    <select
      class="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      bind:value={isActiveFilter}
      onchange={applyFilters}
    >
      <option value="">All Status</option>
      <option value="true">Active</option>
      <option value="false">Inactive</option>
    </select>
  </div>

  <!-- Table -->
  <div class="rounded-xl border bg-card shadow-sm overflow-hidden">
    <div class="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow class="hover:bg-transparent">
            <TableHead class="min-w-48">User</TableHead>
            <TableHead class="hidden sm:table-cell">Email</TableHead>
            <TableHead class="hidden md:table-cell">Roles</TableHead>
            <TableHead>Status</TableHead>
            <TableHead class="hidden lg:table-cell">Joined</TableHead>
            <TableHead class="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {#each data.data as user (user.id)}
            <TableRow>
              <TableCell>
                <a href="/users/{user.id}" class="flex items-center gap-3 hover:underline">
                  <Avatar class="size-8 shrink-0">
                    <AvatarFallback class="text-xs font-medium bg-primary/10 text-primary">
                      {getInitials(user.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <div class="min-w-0">
                    <p class="truncate font-medium">{user.fullName}</p>
                    <p class="truncate text-xs text-muted-foreground sm:hidden">{user.email}</p>
                  </div>
                </a>
              </TableCell>
              <TableCell class="hidden sm:table-cell text-muted-foreground">{user.email}</TableCell>
              <TableCell class="hidden md:table-cell">
                <div class="flex flex-wrap gap-1">
                  {#each user.roles as role}
                    <span class="rounded-full px-2 py-0.5 text-xs font-medium {ROLE_COLORS[role as RoleName] ?? 'bg-gray-100 text-gray-700'}">
                      {ROLE_LABELS[role as RoleName] ?? role}
                    </span>
                  {/each}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={user.isActive ? 'default' : 'secondary'}>
                  {user.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </TableCell>
              <TableCell class="hidden lg:table-cell text-sm text-muted-foreground">
                {new Date(user.createdAt).toLocaleDateString('id-ID')}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    class="inline-flex size-8 items-center justify-center rounded-md hover:bg-accent"
                  >
                    <span class="text-lg leading-none">⋯</span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onclick={() => openEdit(user)}>Edit</DropdownMenuItem>
                    <DropdownMenuItem>
                      <a href="/users/{user.id}" class="w-full">Detail</a>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {#if user.isActive}
                      <DropdownMenuItem class="text-amber-600" onclick={() => openDeactivate(user)}>
                        Nonaktifkan
                      </DropdownMenuItem>
                    {:else}
                      <form method="POST" action="?/activateUser" use:enhance={() => withToast()}>
                        <input type="hidden" name="id" value={user.id} />
                        <DropdownMenuItem>
                          <button type="submit" class="w-full text-left text-green-600">Aktifkan</button>
                        </DropdownMenuItem>
                      </form>
                    {/if}
                    <DropdownMenuItem class="text-destructive" onclick={() => openDelete(user)}>
                      Hapus
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          {:else}
            <TableRow>
              <TableCell colspan={6} class="py-12 text-center text-muted-foreground">
                Tidak ada user yang ditemukan.
              </TableCell>
            </TableRow>
          {/each}
        </TableBody>
      </Table>
    </div>
  </div>

  <!-- Pagination -->
  {#if meta.totalPages > 1}
    <div class="flex items-center justify-between">
      <p class="text-sm text-muted-foreground">Halaman {meta.page} dari {meta.totalPages}</p>
      <div class="flex gap-2">
        <Button variant="outline" size="sm" disabled={!canGoPrev}
          onclick={() => goto(`/users?page=${meta.page - 1}`)}>Prev</Button>
        <Button variant="outline" size="sm" disabled={!canGoNext}
          onclick={() => goto(`/users?page=${meta.page + 1}`)}>Next</Button>
      </div>
    </div>
  {/if}
</div>

<!-- Create/Edit Sheet -->
<UserSheet bind:open={sheetOpen} user={editingUser} onSuccess={() => invalidateAll()} />

<!-- Deactivate confirm — only mounted when a user is selected -->
{#if deactivatingUser}
  <DeactivateDialog
    bind:open={deactivateOpen}
    userName={deactivatingUser.fullName}
    onConfirm={async () => {
      const id = deactivatingUser?.id;
      deactivateOpen = false;
      deactivatingUser = null;
      if (!id) return;

      const fd = new FormData();
      fd.append('id', id);
      const res = await fetch('?/deactivateUser', { method: 'POST', body: fd });
      const json = await res.json().catch(() => null);
      if (json?.type === 'success') {
        toast.success(json.data?.message ?? 'User berhasil dinonaktifkan');
        await invalidateAll();
      } else {
        toast.error(json?.data?.error ?? 'Gagal menonaktifkan user');
      }
    }}
  />
{/if}

<!-- Delete confirm — only mounted when a user is selected -->
{#if deletingUser}
  <AlertDialog
    open={deleteOpen}
    onOpenChange={(v) => {
      deleteOpen = v;
      if (!v) deletingUser = null;
    }}
  >
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Hapus pengguna?</AlertDialogTitle>
        <AlertDialogDescription>
          <strong>{deletingUser.fullName}</strong> akan dihapus secara permanen.
          Tindakan ini tidak dapat dibatalkan.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel onclick={() => { deleteOpen = false; deletingUser = null; }}>
          Batal
        </AlertDialogCancel>
        <form
          method="POST"
          action="?/deleteUser"
          use:enhance={() => async ({ result, update }) => {
            deleteOpen = false;
            deletingUser = null;
            if (result.type === 'success') {
              const msg = (result.data as { message?: string })?.message ?? 'User berhasil dihapus';
              toast.success(msg);
              await invalidateAll();
            } else if (result.type === 'failure') {
              const err = (result.data as { error?: string })?.error ?? 'Gagal menghapus user';
              toast.error(err);
            }
            await update();
          }}
        >
          <input type="hidden" name="id" value={deletingUser.id} />
          <AlertDialogAction
            type="submit"
            class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Hapus
          </AlertDialogAction>
        </form>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
{/if}
