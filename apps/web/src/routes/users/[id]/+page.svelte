<script lang="ts">
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import { Button } from '$lib/components/ui/button';
  import { Badge } from '$lib/components/ui/badge';
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Separator } from '$lib/components/ui/separator';
  import { Avatar, AvatarFallback } from '$lib/components/ui/avatar';
  import UserSheet from '$lib/components/users/UserSheet.svelte';
  import DeactivateDialog from '$lib/components/users/DeactivateDialog.svelte';
  import type { PageData } from './$types';
  import { ROLE_LABELS, ROLE_COLORS, type RoleName } from '$lib/types/users';

  let { data }: { data: PageData } = $props();

  let sheetOpen = $state(false);
  let deactivateOpen = $state(false);

  function getInitials(name: string) {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }
</script>

<div class="p-6 space-y-6 max-w-5xl">
  <!-- Breadcrumb -->
  <div class="flex items-center gap-2 text-sm text-muted-foreground">
    <a href="/users" class="hover:text-foreground hover:underline">Users</a>
    <span>/</span>
    <span class="text-foreground font-medium">{data.user.fullName}</span>
  </div>

  <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
    <!-- Left column: user info -->
    <div class="lg:col-span-2 space-y-6">

      <!-- Profile Card -->
      <Card>
        <CardContent class="pt-6">
          <div class="flex items-start gap-4">
            <Avatar class="size-16">
              <AvatarFallback class="text-xl font-semibold bg-primary/10 text-primary">
                {getInitials(data.user.fullName)}
              </AvatarFallback>
            </Avatar>
            <div class="flex-1 space-y-1">
              <div class="flex items-center gap-3">
                <h2 class="text-xl font-bold">{data.user.fullName}</h2>
                <Badge variant={data.user.isActive ? 'default' : 'secondary'}>
                  {data.user.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <p class="text-muted-foreground">{data.user.email}</p>
              <p class="text-sm text-muted-foreground">
                Member since {formatDate(data.user.createdAt)}
              </p>
            </div>
          </div>

          <Separator class="my-4" />

          <div class="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onclick={() => (sheetOpen = true)}>
              Edit Profile
            </Button>

            {#if data.user.isActive}
              <Button
                variant="outline"
                size="sm"
                class="text-amber-600 hover:text-amber-700"
                onclick={() => (deactivateOpen = true)}
              >
                Deactivate
              </Button>
            {:else}
              <form method="POST" action="?/activateUser" use:enhance={() => async ({ update }) => { await update(); await invalidateAll(); }}>
                <Button variant="outline" size="sm" class="text-green-600 hover:text-green-700" type="submit">
                  Activate
                </Button>
              </form>
            {/if}
          </div>
        </CardContent>
      </Card>

      <!-- Roles Card -->
      <Card>
        <CardHeader>
          <CardTitle class="text-base">Roles</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="flex flex-wrap gap-2">
            {#each data.user.roles as role}
              <div class="flex items-center gap-1.5">
                <span
                  class="rounded-full px-3 py-1 text-sm font-medium {ROLE_COLORS[role as RoleName] ?? 'bg-gray-100 text-gray-700'}"
                >
                  {ROLE_LABELS[role as RoleName] ?? role}
                </span>
                {#if data.user.roles.length > 1}
                  <form
                    method="POST"
                    action="?/removeRole"
                    use:enhance={() => async ({ update }) => { await update(); await invalidateAll(); }}
                  >
                    <input type="hidden" name="roleId" value={role} />
                    <button
                      type="submit"
                      class="size-4 rounded-full text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      title="Remove role"
                    >
                      ×
                    </button>
                  </form>
                {/if}
              </div>
            {/each}
          </div>
          {#if data.user.roles.length <= 1}
            <p class="mt-2 text-xs text-muted-foreground">User must have at least one role.</p>
          {/if}
        </CardContent>
      </Card>
    </div>

    <!-- Right column: activity placeholder -->
    <div class="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle class="text-base">Account Details</CardTitle>
        </CardHeader>
        <CardContent class="space-y-3 text-sm">
          <div class="flex justify-between">
            <span class="text-muted-foreground">User ID</span>
            <span class="font-mono text-xs truncate max-w-32" title={data.user.id}>
              {data.user.id.slice(0, 8)}…
            </span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted-foreground">Last updated</span>
            <span>{formatDate(data.user.updatedAt)}</span>
          </div>
          {#if data.user.failedLoginAttempts !== null}
            <div class="flex justify-between">
              <span class="text-muted-foreground">Failed logins</span>
              <span class={data.user.failedLoginAttempts > 0 ? 'text-amber-600 font-medium' : ''}>
                {data.user.failedLoginAttempts}
              </span>
            </div>
          {/if}
          {#if data.user.lockedUntil}
            <div class="flex justify-between">
              <span class="text-muted-foreground">Locked until</span>
              <span class="text-red-600 text-xs">{formatDate(data.user.lockedUntil)}</span>
            </div>
          {/if}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle class="text-base">Activity Log</CardTitle>
        </CardHeader>
        <CardContent>
          <p class="text-sm text-muted-foreground text-center py-4">Coming soon</p>
        </CardContent>
      </Card>
    </div>
  </div>
</div>

<UserSheet
  bind:open={sheetOpen}
  user={data.user}
  onSuccess={() => invalidateAll()}
/>

<DeactivateDialog
  bind:open={deactivateOpen}
  userName={data.user.fullName}
  onConfirm={async () => {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '?/deactivateUser';
    document.body.appendChild(form);
    form.submit();
    deactivateOpen = false;
  }}
/>
