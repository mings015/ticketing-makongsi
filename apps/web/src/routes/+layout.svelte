<script lang="ts">
  import '../app.css';
  import { page } from '$app/stores';
  import { enhance, applyAction } from '$app/forms';
  import { Avatar, AvatarFallback } from '$lib/components/ui/avatar';
  import { Button } from '$lib/components/ui/button';
  import { Separator } from '$lib/components/ui/separator';
  import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
  } from '$lib/components/ui/alert-dialog';
  import { Toaster } from 'svelte-sonner';
  import type { LayoutData } from './$types';

  let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

  const isLogin = $derived($page.url.pathname === '/login');

  let mobileSidebarOpen = $state(false);
  let logoutDialogOpen = $state(false);

  const userRoles = $derived<string[]>(data.user?.roles ?? []);
  const isAdminOrAbove = $derived(userRoles.some((r) => ['admin', 'super_admin'].includes(r)));

  const navItems = $derived([
    ...(isAdminOrAbove ? [{ href: '/dashboard',  label: 'Dashboard',  icon: '📊' }] : []),
    { href: '/tickets', label: 'Tickets', icon: '🎫' },
    ...(isAdminOrAbove ? [{ href: '/users',      label: 'Users',      icon: '👥' }] : []),
    ...(isAdminOrAbove ? [{ href: '/categories', label: 'Categories', icon: '🏷️' }] : []),
    ...(isAdminOrAbove ? [{ href: '/reports',    label: 'Reports',    icon: '📈' }] : []),
    ...(isAdminOrAbove ? [{ href: '/audit-logs', label: 'Audit Log',  icon: '📋' }] : []),
  ]);

  function getInitials(name: string) {
    return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
  }
</script>

<Toaster richColors position="top-right" />

{#if isLogin}
  {@render children()}
{:else}
  <div class="flex h-screen overflow-hidden bg-background">

    <!-- ── Desktop sidebar (always visible, static) ── -->
    <aside class="hidden w-64 shrink-0 flex-col border-r bg-sidebar lg:flex">
      <div class="flex h-16 items-center border-b px-6">
        <span class="text-lg font-semibold text-sidebar-foreground">Ticketing</span>
      </div>

      <nav class="flex-1 space-y-1 p-4">
        {#each navItems as item}
          <a
            href={item.disabled ? undefined : item.href}
            class={[
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              item.disabled
                ? 'cursor-not-allowed opacity-40 text-sidebar-foreground'
                : $page.url.pathname.startsWith(item.href)
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            ].join(' ')}
          >
            <span>{item.icon}</span>
            {item.label}
            {#if item.disabled}
              <span class="ml-auto text-xs opacity-60">Soon</span>
            {/if}
          </a>
        {/each}
      </nav>

      <Separator />

      {#if data.user}
        <div class="flex items-center gap-3 p-4">
          <Avatar class="size-8 shrink-0">
            <AvatarFallback class="text-xs">{getInitials(data.user.fullName)}</AvatarFallback>
          </Avatar>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium text-sidebar-foreground">{data.user.fullName}</p>
            <p class="truncate text-xs text-muted-foreground capitalize">
              {data.user.roles[0]?.replace('_', ' ')}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            class="size-8 shrink-0"
            onclick={() => (logoutDialogOpen = true)}
            title="Logout"
          >
            <span class="text-base">↩</span>
          </Button>
        </div>
      {/if}
    </aside>

    <!-- ── Mobile sidebar overlay ── -->
    {#if mobileSidebarOpen}
      <!-- Backdrop -->
      <div
        class="fixed inset-0 z-40 bg-black/50 lg:hidden"
        role="button"
        tabindex="-1"
        aria-label="Close menu"
        onclick={() => (mobileSidebarOpen = false)}
        onkeydown={(e) => e.key === 'Escape' && (mobileSidebarOpen = false)}
      ></div>

      <!-- Drawer -->
      <aside class="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-sidebar lg:hidden">
        <div class="flex h-14 items-center justify-between border-b px-4">
          <span class="text-base font-semibold text-sidebar-foreground">Ticketing</span>
          <button
            class="rounded p-1 hover:bg-sidebar-accent"
            onclick={() => (mobileSidebarOpen = false)}
            aria-label="Close"
          >✕</button>
        </div>

        <nav class="flex-1 space-y-1 p-4">
          {#each navItems as item}
            <a
              href={item.disabled ? undefined : item.href}
              onclick={() => (mobileSidebarOpen = false)}
              class={[
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                item.disabled
                  ? 'cursor-not-allowed opacity-40 text-sidebar-foreground'
                  : $page.url.pathname.startsWith(item.href)
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              ].join(' ')}
            >
              <span>{item.icon}</span>
              {item.label}
              {#if item.disabled}
                <span class="ml-auto text-xs opacity-60">Soon</span>
              {/if}
            </a>
          {/each}
        </nav>

        <Separator />

        {#if data.user}
          <div class="flex items-center gap-3 p-4">
            <Avatar class="size-8 shrink-0">
              <AvatarFallback class="text-xs">{getInitials(data.user.fullName)}</AvatarFallback>
            </Avatar>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-sidebar-foreground">{data.user.fullName}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              class="size-8 shrink-0"
              onclick={() => { mobileSidebarOpen = false; logoutDialogOpen = true; }}
              title="Logout"
            >
              <span>↩</span>
            </Button>
          </div>
        {/if}
      </aside>
    {/if}

    <!-- ── Main content ── -->
    <div class="flex min-w-0 flex-1 flex-col overflow-hidden">
      <!-- Mobile topbar -->
      <header class="flex h-14 shrink-0 items-center border-b px-4 lg:hidden">
        <button
          class="mr-3 rounded-md p-2 hover:bg-accent"
          onclick={() => (mobileSidebarOpen = true)}
          aria-label="Open menu"
        >
          <svg class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span class="text-sm font-semibold">Ticketing</span>
      </header>

      <main class="flex-1 overflow-auto">
        {@render children()}
      </main>
    </div>
  </div>

  <!-- Logout confirm — only rendered when open -->
  {#if logoutDialogOpen}
    <AlertDialog open={true} onOpenChange={(v) => (logoutDialogOpen = v)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Logout?</AlertDialogTitle>
          <AlertDialogDescription>
            Sesi Anda akan diakhiri dan Anda perlu login kembali.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onclick={() => (logoutDialogOpen = false)}>Batal</AlertDialogCancel>
          <form
            method="POST"
            action="/logout"
            use:enhance={() => async ({ result }) => {
              logoutDialogOpen = false;
              await applyAction(result);
            }}
          >
            <AlertDialogAction type="submit">Logout</AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  {/if}
{/if}
