<script lang="ts">
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import StatCard from '$lib/components/charts/StatCard.svelte';
  import DoughnutChart from '$lib/components/charts/DoughnutChart.svelte';
  import LineChart from '$lib/components/charts/LineChart.svelte';
  import { Input } from '$lib/components/ui/input';
  import { Button } from '$lib/components/ui/button';
  import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  } from '$lib/components/ui/table';
  import type { PageData } from './$types';
  import { getExportUrl } from '$lib/api/reports';

  let { data }: { data: PageData } = $props();

  let activeTab = $state<'tickets' | 'sla' | 'staff' | 'trends'>('tickets');
  let dateFrom    = $state(data.filters.dateFrom    ?? '');
  let dateTo      = $state(data.filters.dateTo      ?? '');
  let categoryFilter = $state(data.filters.categoryId ?? '');
  let priorityFilter = $state(data.filters.priority   ?? '');
  let period      = $state(data.filters.period      ?? 'daily');

  $effect(() => {
    dateFrom       = data.filters.dateFrom    ?? '';
    dateTo         = data.filters.dateTo      ?? '';
    categoryFilter = data.filters.categoryId  ?? '';
    priorityFilter = data.filters.priority    ?? '';
    period         = data.filters.period      ?? 'daily';
  });

  function applyFilters() {
    const p = new URLSearchParams();
    if (dateFrom)       p.set('dateFrom',   dateFrom);
    if (dateTo)         p.set('dateTo',     dateTo);
    if (categoryFilter) p.set('categoryId', categoryFilter);
    if (priorityFilter) p.set('priority',   priorityFilter);
    p.set('period', period);
    goto(`/reports?${p}`, { replaceState: true });
  }

  function resetFilters() {
    dateFrom = ''; dateTo = ''; categoryFilter = ''; priorityFilter = ''; period = 'daily';
    goto('/reports', { replaceState: true });
  }

  function downloadExport(type: 'tickets' | 'sla' | 'staff') {
    if (!browser) return;
    const url = getExportUrl(type, {
      dateFrom:   dateFrom   || undefined,
      dateTo:     dateTo     || undefined,
      categoryId: categoryFilter || undefined,
      priority:   priorityFilter || undefined,
    });
    window.open(url, '_blank');
  }

  // ── Chart data ─────────────────────────────────────────────────────────
  const statusChartData = $derived([
    { label: 'Open',        value: data.ticketStats.summary.open,        color: '#3b82f6' },
    { label: 'In Progress', value: data.ticketStats.summary.in_progress, color: '#f59e0b' },
    { label: 'Pending',     value: data.ticketStats.summary.pending,     color: '#9ca3af' },
    { label: 'Resolved',    value: data.ticketStats.summary.resolved,    color: '#10b981' },
    { label: 'Closed',      value: data.ticketStats.summary.closed,      color: '#6b7280' },
  ]);

  const trendData = $derived(data.trends.map((t) => ({ label: t.period, value: t.count })));

  const SLA_COLORS: Record<string, string> = { met: 'text-green-600', breached: 'text-red-600', ongoing: 'text-yellow-600' };

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  }
</script>

<div class="p-4 sm:p-6 space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between flex-wrap gap-3">
    <div>
      <h1 class="text-xl font-bold sm:text-2xl">Reports & Analytics</h1>
      <p class="text-sm text-muted-foreground">Laporan operasional layanan IT</p>
    </div>
    <Button onclick={() => downloadExport(activeTab === 'trends' ? 'tickets' : activeTab)}
      variant="outline" size="sm" class="gap-2">
      ↓ Export Excel
    </Button>
  </div>

  <!-- Filters -->
  <div class="flex flex-wrap gap-3 rounded-xl border bg-card p-4">
    <div class="flex items-center gap-2">
      <label class="text-xs text-muted-foreground shrink-0">Dari</label>
      <Input type="date" class="w-36 text-sm" bind:value={dateFrom} />
    </div>
    <div class="flex items-center gap-2">
      <label class="text-xs text-muted-foreground shrink-0">Sampai</label>
      <Input type="date" class="w-36 text-sm" bind:value={dateTo} />
    </div>
    <select class="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" bind:value={categoryFilter}>
      <option value="">Semua Kategori</option>
      {#each data.categories as cat}
        <option value={cat.id}>{cat.name}</option>
      {/each}
    </select>
    <select class="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" bind:value={priorityFilter}>
      <option value="">Semua Prioritas</option>
      <option value="critical">Critical</option>
      <option value="high">High</option>
      <option value="medium">Medium</option>
      <option value="low">Low</option>
    </select>
    <button onclick={applyFilters} class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Filter</button>
    {#if dateFrom || dateTo || categoryFilter || priorityFilter}
      <button onclick={resetFilters} class="rounded-md border px-4 py-2 text-sm hover:bg-accent">Reset</button>
    {/if}
  </div>

  <!-- Tabs -->
  <div class="flex gap-1 rounded-lg border bg-muted p-1 w-fit">
    {#each [['tickets', 'Tickets'], ['sla', 'SLA'], ['staff', 'Staff'], ['trends', 'Trends']] as [tab, label]}
      <button
        onclick={() => (activeTab = tab as typeof activeTab)}
        class="rounded-md px-4 py-1.5 text-sm font-medium transition-colors {activeTab === tab ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}"
      >{label}</button>
    {/each}
  </div>

  <!-- ── Tab: Tickets ──────────────────────────────────────────────────── -->
  {#if activeTab === 'tickets'}
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <StatCard label="Total"       value={data.ticketStats.summary.total} />
      <StatCard label="Open"        value={data.ticketStats.summary.open}        colorClass="text-blue-600" />
      <StatCard label="In Progress" value={data.ticketStats.summary.in_progress} colorClass="text-yellow-600" />
      <StatCard label="Pending"     value={data.ticketStats.summary.pending}      colorClass="text-gray-500" />
      <StatCard label="Resolved"    value={data.ticketStats.summary.resolved}    colorClass="text-green-600" />
      <StatCard label="Closed"      value={data.ticketStats.summary.closed}      colorClass="text-gray-400" />
    </div>

    <div class="grid gap-4 lg:grid-cols-3">
      <DoughnutChart title="Distribusi Status" data={statusChartData} />
      <div class="lg:col-span-2 rounded-xl border bg-card shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow class="hover:bg-transparent">
                <TableHead>No. Ticket</TableHead>
                <TableHead>Judul</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Prioritas</TableHead>
                <TableHead class="hidden md:table-cell">Assignee</TableHead>
                <TableHead class="hidden lg:table-cell">Dibuat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {#each data.ticketStats.rows as r (r.ticketNumber)}
                <TableRow>
                  <TableCell class="font-mono text-xs">{r.ticketNumber}</TableCell>
                  <TableCell class="max-w-xs truncate text-sm">{r.title}</TableCell>
                  <TableCell class="text-xs capitalize">{r.status.replace('_', ' ')}</TableCell>
                  <TableCell class="text-xs capitalize">{r.priority}</TableCell>
                  <TableCell class="hidden md:table-cell text-sm text-muted-foreground">{r.assigneeName ?? '—'}</TableCell>
                  <TableCell class="hidden lg:table-cell text-xs text-muted-foreground">{fmtDate(r.createdAt)}</TableCell>
                </TableRow>
              {:else}
                <TableRow><TableCell colspan={6} class="py-10 text-center text-muted-foreground">Tidak ada data.</TableCell></TableRow>
              {/each}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>

  <!-- ── Tab: SLA ──────────────────────────────────────────────────────── -->
  {:else if activeTab === 'sla'}
    <div class="grid grid-cols-3 gap-3">
      <StatCard label="SLA Met"      value={data.slaStats.summary.met}       colorClass="text-green-600" />
      <StatCard label="SLA Breached" value={data.slaStats.summary.breached}  colorClass="text-red-600" />
      <StatCard label="Compliance"   value="{data.slaStats.summary.percentage}%" colorClass={data.slaStats.summary.percentage >= 90 ? 'text-green-600' : 'text-red-500'} />
    </div>
    <div class="rounded-xl border bg-card shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow class="hover:bg-transparent">
              <TableHead>No. Ticket</TableHead>
              <TableHead>Judul</TableHead>
              <TableHead>Prioritas</TableHead>
              <TableHead>Target (jam)</TableHead>
              <TableHead>Aktual (jam)</TableHead>
              <TableHead>Status SLA</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {#each data.slaStats.rows as r (r.ticketNumber)}
              <TableRow>
                <TableCell class="font-mono text-xs">{r.ticketNumber}</TableCell>
                <TableCell class="max-w-xs truncate text-sm">{r.title}</TableCell>
                <TableCell class="text-xs capitalize">{r.priority}</TableCell>
                <TableCell class="text-sm">{r.slaTargetHours}h</TableCell>
                <TableCell class="text-sm">{r.slaActualHours !== null ? `${r.slaActualHours}h` : '—'}</TableCell>
                <TableCell>
                  <span class="text-xs font-medium capitalize {SLA_COLORS[r.slaStatus] ?? ''}">
                    {r.slaStatus}
                  </span>
                </TableCell>
              </TableRow>
            {:else}
              <TableRow><TableCell colspan={6} class="py-10 text-center text-muted-foreground">Tidak ada data.</TableCell></TableRow>
            {/each}
          </TableBody>
        </Table>
      </div>
    </div>

  <!-- ── Tab: Staff ────────────────────────────────────────────────────── -->
  {:else if activeTab === 'staff'}
    <div class="rounded-xl border bg-card shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow class="hover:bg-transparent">
              <TableHead>Nama Staff</TableHead>
              <TableHead class="text-right">Ditugaskan</TableHead>
              <TableHead class="text-right">Diselesaikan</TableHead>
              <TableHead class="text-right">Avg Resolusi</TableHead>
              <TableHead class="text-right">SLA Met</TableHead>
              <TableHead class="text-right">SLA Rate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {#each data.staffStats as r (r.assigneeId)}
              <TableRow>
                <TableCell class="font-medium">{r.fullName}</TableCell>
                <TableCell class="text-right">{r.assigned}</TableCell>
                <TableCell class="text-right text-green-600 font-medium">{r.resolved}</TableCell>
                <TableCell class="text-right text-sm">{r.avgResolutionHours !== null ? `${r.avgResolutionHours}h` : '—'}</TableCell>
                <TableCell class="text-right">{r.slaMet}</TableCell>
                <TableCell class="text-right">
                  <span class="{r.slaRate !== null && r.slaRate >= 90 ? 'text-green-600' : r.slaRate !== null && r.slaRate >= 70 ? 'text-yellow-600' : 'text-red-500'} font-medium text-sm">
                    {r.slaRate !== null ? `${r.slaRate}%` : '—'}
                  </span>
                </TableCell>
              </TableRow>
            {:else}
              <TableRow><TableCell colspan={6} class="py-10 text-center text-muted-foreground">Tidak ada data.</TableCell></TableRow>
            {/each}
          </TableBody>
        </Table>
      </div>
    </div>

  <!-- ── Tab: Trends ───────────────────────────────────────────────────── -->
  {:else if activeTab === 'trends'}
    <div class="flex gap-2 mb-2">
      {#each [['daily', 'Harian'], ['weekly', 'Mingguan'], ['monthly', 'Bulanan']] as [p, label]}
        <button
          onclick={() => { period = p; applyFilters(); }}
          class="rounded-md px-3 py-1.5 text-sm border transition-colors {period === p ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent'}"
        >{label}</button>
      {/each}
    </div>
    <LineChart
      title="Tren Pembuatan Ticket"
      data={trendData}
      color="#6366f1"
    />
    <div class="rounded-xl border bg-card shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow class="hover:bg-transparent">
              <TableHead>Periode</TableHead>
              <TableHead class="text-right">Jumlah Ticket</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {#each [...data.trends].reverse() as r (r.period)}
              <TableRow>
                <TableCell>{r.period}</TableCell>
                <TableCell class="text-right font-medium">{r.count}</TableCell>
              </TableRow>
            {:else}
              <TableRow><TableCell colspan={2} class="py-10 text-center text-muted-foreground">Tidak ada data.</TableCell></TableRow>
            {/each}
          </TableBody>
        </Table>
      </div>
    </div>
  {/if}
</div>
