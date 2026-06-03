<script lang="ts">
  import { goto } from '$app/navigation';
  import StatCard from '$lib/components/charts/StatCard.svelte';
  import DoughnutChart from '$lib/components/charts/DoughnutChart.svelte';
  import BarChart from '$lib/components/charts/BarChart.svelte';
  import { Input } from '$lib/components/ui/input';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  let { stats, categories, filters } = $derived(data);

  const user = $derived(data.user);
  const userRoles = $derived(user?.roles ?? []);
  const isAdminOrSupport = $derived(
    userRoles.some((r: string) => ['admin', 'super_admin', 'support'].includes(r))
  );
  const isAdmin = $derived(userRoles.some((r: string) => ['admin', 'super_admin'].includes(r)));

  let dateFrom = $state(filters.dateFrom ?? '');
  let dateTo = $state(filters.dateTo ?? '');
  let categoryFilter = $state(filters.categoryId ?? '');
  let priorityFilter = $state(filters.priority ?? '');

  function applyFilters() {
    const p = new URLSearchParams();
    if (dateFrom) p.set('dateFrom', dateFrom);
    if (dateTo) p.set('dateTo', dateTo);
    if (categoryFilter) p.set('categoryId', categoryFilter);
    if (priorityFilter) p.set('priority', priorityFilter);
    goto(`/dashboard?${p}`, { replaceState: true });
  }

  function resetFilters() {
    dateFrom = ''; dateTo = ''; categoryFilter = ''; priorityFilter = '';
    goto('/dashboard', { replaceState: true });
  }

  const priorityChartData = $derived([
    { label: 'Critical', value: stats.byPriority.critical, color: '#ef4444' },
    { label: 'High', value: stats.byPriority.high, color: '#f97316' },
    { label: 'Medium', value: stats.byPriority.medium, color: '#3b82f6' },
    { label: 'Low', value: stats.byPriority.low, color: '#9ca3af' },
  ]);

  const categoryChartData = $derived(
    stats.byCategory.slice(0, 8).map((c, i) => ({
      label: c.name,
      value: c.count,
      color: ['#6366f1', '#14b8a6', '#f59e0b', '#ec4899', '#8b5cf6', '#10b981', '#f97316', '#3b82f6'][i % 8],
    }))
  );

  function formatAction(action: string) {
    const map: Record<string, string> = {
      'ticket.created': 'Ticket dibuat',
      'ticket.assigned': 'Ticket di-assign',
      'ticket.updated': 'Ticket diperbarui',
      'ticket.resolved': 'Ticket diselesaikan',
      'ticket.closed': 'Ticket ditutup',
      'ticket.in_progress': 'Ticket dilanjutkan',
      'ticket.pending': 'Ticket pending',
      'ticket.deleted': 'Ticket dihapus',
      'category.created': 'Kategori dibuat',
      'user.login': 'User login',
      'user.created': 'User dibuat',
    };
    return map[action] ?? action;
  }

  function formatRelativeTime(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'baru saja';
    if (mins < 60) return `${mins} menit lalu`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} jam lalu`;
    return `${Math.floor(hrs / 24)} hari lalu`;
  }
</script>

<div class="p-4 sm:p-6 space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between flex-wrap gap-3">
    <div>
      <h1 class="text-xl font-bold sm:text-2xl">Dashboard</h1>
      <p class="text-sm text-muted-foreground">Ringkasan operasional ticket</p>
    </div>
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
    <select
      class="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      bind:value={categoryFilter}
    >
      <option value="">Semua Kategori</option>
      {#each categories as cat}
        <option value={cat.id}>{cat.name}</option>
      {/each}
    </select>
    <select
      class="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      bind:value={priorityFilter}
    >
      <option value="">Semua Prioritas</option>
      <option value="critical">Critical</option>
      <option value="high">High</option>
      <option value="medium">Medium</option>
      <option value="low">Low</option>
    </select>
    <button
      onclick={applyFilters}
      class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
    >
      Filter
    </button>
    {#if dateFrom || dateTo || categoryFilter || priorityFilter}
      <button
        onclick={resetFilters}
        class="rounded-md border px-4 py-2 text-sm hover:bg-accent"
      >
        Reset
      </button>
    {/if}
  </div>

  <!-- Ticket Summary Stats -->
  <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
    <StatCard label="Total" value={stats.ticketSummary.total} />
    <StatCard label="Open" value={stats.ticketSummary.open} colorClass="text-blue-600" />
    <StatCard label="In Progress" value={stats.ticketSummary.in_progress} colorClass="text-yellow-600" />
    <StatCard label="Pending" value={stats.ticketSummary.pending} colorClass="text-gray-500" />
    <StatCard label="Resolved" value={stats.ticketSummary.resolved} colorClass="text-green-600" />
    <StatCard label="Closed" value={stats.ticketSummary.closed} colorClass="text-gray-400" />
  </div>

  <!-- Charts Row -->
  <div class="grid gap-4 lg:grid-cols-3">
    <DoughnutChart title="Ticket by Prioritas" data={priorityChartData} />
    <BarChart title="Ticket by Kategori" data={categoryChartData} />

    <!-- SLA Monitoring Card -->
    <div class="rounded-xl border bg-card p-5 shadow-sm">
      <p class="mb-4 text-sm font-medium text-muted-foreground">SLA Monitoring</p>
      <div class="flex items-center justify-center">
        <div class="text-center">
          <p class="text-5xl font-bold {stats.slaMonitoring.percentage >= 90 ? 'text-green-600' : stats.slaMonitoring.percentage >= 70 ? 'text-yellow-600' : 'text-red-600'}">
            {stats.slaMonitoring.percentage}%
          </p>
          <p class="mt-1 text-sm text-muted-foreground">SLA Terpenuhi</p>
        </div>
      </div>
      <div class="mt-4 w-full rounded-full bg-muted h-3 overflow-hidden">
        <div
          class="h-full rounded-full transition-all {stats.slaMonitoring.percentage >= 90 ? 'bg-green-500' : stats.slaMonitoring.percentage >= 70 ? 'bg-yellow-500' : 'bg-red-500'}"
          style="width: {stats.slaMonitoring.percentage}%"
        ></div>
      </div>
      <div class="mt-3 flex justify-between text-xs text-muted-foreground">
        <span class="text-green-600 font-medium">Met: {stats.slaMonitoring.met}</span>
        <span class="text-red-500 font-medium">Breached: {stats.slaMonitoring.breached}</span>
      </div>
      <p class="mt-3 text-xs text-muted-foreground text-center">
        Target: Critical 4h · High 8h · Medium 24h · Low 72h
      </p>
    </div>
  </div>

  <!-- My Assigned Tickets (Support + Admin) -->
  {#if isAdminOrSupport && stats.myAssignedTickets}
    <div class="rounded-xl border bg-card p-5 shadow-sm">
      <p class="mb-4 text-sm font-medium text-muted-foreground">Ticket Saya</p>
      <div class="grid grid-cols-3 gap-4">
        <div class="text-center">
          <p class="text-2xl font-bold">{stats.myAssignedTickets.assigned}</p>
          <p class="text-xs text-muted-foreground mt-1">Ditugaskan</p>
        </div>
        <div class="text-center">
          <p class="text-2xl font-bold text-yellow-600">{stats.myAssignedTickets.in_progress}</p>
          <p class="text-xs text-muted-foreground mt-1">In Progress</p>
        </div>
        <div class="text-center">
          <p class="text-2xl font-bold text-red-600">{stats.myAssignedTickets.overdue}</p>
          <p class="text-xs text-muted-foreground mt-1">Overdue</p>
        </div>
      </div>
    </div>
  {/if}

  <!-- Bottom Row: Team Performance + Recent Activities -->
  <div class="grid gap-4 lg:grid-cols-2">

    <!-- Team Performance (Admin only) -->
    {#if isAdmin}
      <div class="rounded-xl border bg-card p-5 shadow-sm">
        <p class="mb-4 text-sm font-medium text-muted-foreground">Performa Tim</p>
        <div class="grid grid-cols-2 gap-4">
          <div class="text-center">
            <p class="text-3xl font-bold text-green-600">{stats.teamPerformance.completed}</p>
            <p class="text-xs text-muted-foreground mt-1">Ticket Selesai</p>
          </div>
          <div class="text-center">
            <p class="text-3xl font-bold">
              {stats.teamPerformance.avgResolutionTimeHours > 0
                ? `${stats.teamPerformance.avgResolutionTimeHours}h`
                : '—'}
            </p>
            <p class="text-xs text-muted-foreground mt-1">Rata-rata Resolusi</p>
          </div>
        </div>
      </div>
    {/if}

    <!-- Recent Activities -->
    <div class="{isAdmin ? '' : 'lg:col-span-2'} rounded-xl border bg-card p-5 shadow-sm">
      <p class="mb-4 text-sm font-medium text-muted-foreground">Aktivitas Terbaru</p>
      <div class="space-y-3">
        {#each stats.recentActivities as activity (activity.id)}
          <div class="flex items-start gap-3 text-sm">
            <span class="mt-0.5 size-2 shrink-0 rounded-full bg-primary"></span>
            <div class="min-w-0 flex-1">
              <p class="font-medium truncate">{formatAction(activity.action)}</p>
              <p class="text-xs text-muted-foreground">{activity.actorName} · {formatRelativeTime(activity.createdAt)}</p>
            </div>
          </div>
        {:else}
          <p class="text-sm text-muted-foreground text-center py-4">Belum ada aktivitas.</p>
        {/each}
      </div>
    </div>
  </div>
</div>
