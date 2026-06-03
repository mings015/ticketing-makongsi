<script lang="ts">
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { Input } from '$lib/components/ui/input';
  import { Button } from '$lib/components/ui/button';
  import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  } from '$lib/components/ui/table';
  import type { PageData } from './$types';
  import { getAuditExportUrl } from '$lib/api/audit-logs';
  import type { AuditLogEntry } from '$lib/types/audit-logs';

  let { data }: { data: PageData } = $props();

  let search     = $state(data.filters.search     ?? '');
  let actionFilter  = $state(data.filters.action     ?? '');
  let targetFilter  = $state(data.filters.targetType ?? '');
  let dateFrom   = $state(data.filters.dateFrom   ?? '');
  let dateTo     = $state(data.filters.dateTo     ?? '');

  $effect(() => {
    search      = data.filters.search     ?? '';
    actionFilter   = data.filters.action     ?? '';
    targetFilter   = data.filters.targetType ?? '';
    dateFrom    = data.filters.dateFrom   ?? '';
    dateTo      = data.filters.dateTo     ?? '';
  });

  let selectedEntry = $state<AuditLogEntry | null>(null);

  let searchTimeout: ReturnType<typeof setTimeout>;
  function onSearchInput(e: Event) {
    clearTimeout(searchTimeout);
    search = (e.target as HTMLInputElement).value;
    searchTimeout = setTimeout(applyFilters, 300);
  }

  function applyFilters() {
    const p = new URLSearchParams();
    if (search)       p.set('search',     search);
    if (actionFilter) p.set('action',     actionFilter);
    if (targetFilter) p.set('targetType', targetFilter);
    if (dateFrom)     p.set('dateFrom',   dateFrom);
    if (dateTo)       p.set('dateTo',     dateTo);
    goto(`/audit-logs?${p}`, { replaceState: true });
  }

  function resetFilters() {
    search = ''; actionFilter = ''; targetFilter = ''; dateFrom = ''; dateTo = '';
    goto('/audit-logs', { replaceState: true });
  }

  function downloadExport() {
    if (!browser) return;
    const url = getAuditExportUrl({
      search:   search    || undefined,
      action:   actionFilter || undefined,
      dateFrom: dateFrom  || undefined,
      dateTo:   dateTo    || undefined,
    });
    window.open(url, '_blank');
  }

  const { meta } = $derived(data);
  const canGoNext = $derived(meta.page < meta.totalPages);
  const canGoPrev = $derived(meta.page > 1);

  function formatAction(action: string) {
    return action.replace(/\./g, ' › ').replace(/_/g, ' ');
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  }

  const ACTION_COLOR: Record<string, string> = {
    'ticket.created':    'bg-blue-100 text-blue-700',
    'ticket.closed':     'bg-gray-100 text-gray-600',
    'ticket.assigned':   'bg-purple-100 text-purple-700',
    'ticket.resolved':   'bg-green-100 text-green-700',
    'ticket.deleted':    'bg-red-100 text-red-600',
    'user.login':        'bg-indigo-100 text-indigo-700',
    'user.created':      'bg-teal-100 text-teal-700',
    'user.deactivated':  'bg-orange-100 text-orange-700',
    'category.created':  'bg-yellow-100 text-yellow-700',
  };

  const TARGET_TYPES = ['ticket', 'user', 'category', 'comment', 'attachment'];
</script>

<div class="p-4 sm:p-6 space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between flex-wrap gap-3">
    <div>
      <h1 class="text-xl font-bold sm:text-2xl">Audit Log</h1>
      <p class="text-sm text-muted-foreground">{meta.total} total aktivitas tercatat</p>
    </div>
    <Button onclick={downloadExport} variant="outline" size="sm" class="gap-2">
      ↓ Export Excel
    </Button>
  </div>

  <!-- Filters -->
  <div class="flex flex-wrap gap-3 rounded-xl border bg-card p-4">
    <Input
      class="w-full sm:w-56"
      placeholder="Cari aksi atau modul..."
      value={search}
      oninput={onSearchInput}
    />
    <select class="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" bind:value={actionFilter} onchange={applyFilters}>
      <option value="">Semua Aksi</option>
      {#each data.actions as act}
        <option value={act}>{act}</option>
      {/each}
    </select>
    <select class="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" bind:value={targetFilter} onchange={applyFilters}>
      <option value="">Semua Modul</option>
      {#each TARGET_TYPES as t}
        <option value={t}>{t}</option>
      {/each}
    </select>
    <div class="flex items-center gap-2">
      <label class="text-xs text-muted-foreground shrink-0">Dari</label>
      <Input type="date" class="w-36 text-sm" bind:value={dateFrom} onchange={applyFilters} />
    </div>
    <div class="flex items-center gap-2">
      <label class="text-xs text-muted-foreground shrink-0">Sampai</label>
      <Input type="date" class="w-36 text-sm" bind:value={dateTo} onchange={applyFilters} />
    </div>
    {#if search || actionFilter || targetFilter || dateFrom || dateTo}
      <button onclick={resetFilters} class="rounded-md border px-4 py-2 text-sm hover:bg-accent">Reset</button>
    {/if}
  </div>

  <!-- Table -->
  <div class="rounded-xl border bg-card shadow-sm overflow-hidden">
    <div class="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow class="hover:bg-transparent">
            <TableHead class="min-w-44">Timestamp</TableHead>
            <TableHead class="min-w-48">Aksi</TableHead>
            <TableHead class="hidden md:table-cell">Modul</TableHead>
            <TableHead>Actor</TableHead>
            <TableHead class="hidden lg:table-cell">IP Address</TableHead>
            <TableHead class="w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {#each data.data as log (log.id)}
            <TableRow class="cursor-pointer hover:bg-muted/40" onclick={() => selectedEntry = log}>
              <TableCell class="text-xs text-muted-foreground whitespace-nowrap">
                {formatDate(log.createdAt)}
              </TableCell>
              <TableCell>
                <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium {ACTION_COLOR[log.action] ?? 'bg-gray-100 text-gray-600'}">
                  {formatAction(log.action)}
                </span>
              </TableCell>
              <TableCell class="hidden md:table-cell text-sm text-muted-foreground capitalize">
                {log.targetType ?? '—'}
              </TableCell>
              <TableCell class="text-sm">
                {log.actor?.fullName ?? 'System'}
              </TableCell>
              <TableCell class="hidden lg:table-cell text-xs text-muted-foreground font-mono">
                {log.ipAddress ?? '—'}
              </TableCell>
              <TableCell class="text-muted-foreground text-lg">›</TableCell>
            </TableRow>
          {:else}
            <TableRow>
              <TableCell colspan={6} class="py-12 text-center text-muted-foreground">
                Tidak ada log yang ditemukan.
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
          onclick={() => goto(`/audit-logs?page=${meta.page - 1}`)}>Prev</Button>
        <Button variant="outline" size="sm" disabled={!canGoNext}
          onclick={() => goto(`/audit-logs?page=${meta.page + 1}`)}>Next</Button>
      </div>
    </div>
  {/if}
</div>

<!-- Detail Panel -->
{#if selectedEntry}
  <div
    class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
    role="button"
    tabindex="-1"
    onclick={() => selectedEntry = null}
    onkeydown={(e) => e.key === 'Escape' && (selectedEntry = null)}
  >
    <div
      class="w-full sm:max-w-lg bg-background rounded-t-2xl sm:rounded-xl shadow-xl p-6 space-y-4 max-h-[80vh] overflow-y-auto"
      role="dialog"
      onclick={(e) => e.stopPropagation()}
      onkeydown={() => {}}
    >
      <div class="flex items-center justify-between">
        <h2 class="text-base font-semibold">Detail Aktivitas</h2>
        <button onclick={() => selectedEntry = null} class="text-muted-foreground hover:text-foreground text-xl">✕</button>
      </div>
      <dl class="space-y-2 text-sm">
        <div class="flex gap-3">
          <dt class="w-28 shrink-0 text-muted-foreground">Timestamp</dt>
          <dd>{formatDate(selectedEntry.createdAt)}</dd>
        </div>
        <div class="flex gap-3">
          <dt class="w-28 shrink-0 text-muted-foreground">Aksi</dt>
          <dd class="font-medium">{selectedEntry.action}</dd>
        </div>
        <div class="flex gap-3">
          <dt class="w-28 shrink-0 text-muted-foreground">Modul</dt>
          <dd class="capitalize">{selectedEntry.targetType ?? '—'}</dd>
        </div>
        <div class="flex gap-3">
          <dt class="w-28 shrink-0 text-muted-foreground">Target ID</dt>
          <dd class="font-mono text-xs break-all">{selectedEntry.targetId ?? '—'}</dd>
        </div>
        <div class="flex gap-3">
          <dt class="w-28 shrink-0 text-muted-foreground">Actor</dt>
          <dd>{selectedEntry.actor?.fullName ?? 'System'} {selectedEntry.actor ? `(${selectedEntry.actor.email})` : ''}</dd>
        </div>
        <div class="flex gap-3">
          <dt class="w-28 shrink-0 text-muted-foreground">IP Address</dt>
          <dd class="font-mono text-xs">{selectedEntry.ipAddress ?? '—'}</dd>
        </div>
        {#if selectedEntry.payload}
          <div class="flex flex-col gap-1">
            <dt class="text-muted-foreground">Payload</dt>
            <dd>
              <pre class="rounded-md bg-muted px-3 py-2 text-xs overflow-x-auto">{JSON.stringify(selectedEntry.payload, null, 2)}</pre>
            </dd>
          </div>
        {/if}
      </dl>
    </div>
  </div>
{/if}
