<script lang="ts">
  import { enhance } from '$app/forms';
  import { goto, invalidateAll } from '$app/navigation';
  import { toast } from 'svelte-sonner';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  } from '$lib/components/ui/table';
  import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
    AlertDialogHeader, AlertDialogTitle,
  } from '$lib/components/ui/alert-dialog';
  import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuSeparator, DropdownMenuTrigger,
  } from '$lib/components/ui/dropdown-menu';
  import StatusBadge from '$lib/components/tickets/StatusBadge.svelte';
  import PriorityBadge from '$lib/components/tickets/PriorityBadge.svelte';
  import TicketSheet from '$lib/components/tickets/TicketSheet.svelte';
  import type { PageData } from './$types';
  import type { TicketSummary } from '$lib/types/tickets';
  import { TICKET_STATUS_LABELS, TICKET_PRIORITY_LABELS } from '$lib/types/tickets';

  let { data }: { data: PageData } = $props();

  let search = $state(data.filters.search ?? '');
  let statusFilter = $state(data.filters.status ?? '');
  let priorityFilter = $state(data.filters.priority ?? '');
  let categoryFilter = $state(data.filters.categoryId ?? '');
  let myTickets = $state(data.filters.myTickets ?? false);

  $effect(() => {
    search = data.filters.search ?? '';
    statusFilter = data.filters.status ?? '';
    priorityFilter = data.filters.priority ?? '';
    categoryFilter = data.filters.categoryId ?? '';
    myTickets = data.filters.myTickets ?? false;
  });

  let sheetOpen = $state(false);
  let editingTicket = $state<TicketSummary | null>(null);
  let deleteOpen = $state(false);
  let deletingTicket = $state<TicketSummary | null>(null);

  let searchTimeout: ReturnType<typeof setTimeout>;

  function onSearchInput(e: Event) {
    clearTimeout(searchTimeout);
    search = (e.target as HTMLInputElement).value;
    searchTimeout = setTimeout(applyFilters, 300);
  }

  function applyFilters() {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
    if (priorityFilter) params.set('priority', priorityFilter);
    if (categoryFilter) params.set('categoryId', categoryFilter);
    if (myTickets) params.set('myTickets', '1');
    goto(`/tickets?${params}`, { replaceState: true });
  }

  function openCreate() { editingTicket = null; sheetOpen = true; }
  function openEdit(t: TicketSummary) { editingTicket = t; sheetOpen = true; }
  function openDelete(t: TicketSummary) { deletingTicket = t; deleteOpen = true; }

  function withToast() {
    return async ({ result, update }: { result: { type: string; data?: unknown }; update: () => Promise<void> }) => {
      if (result.type === 'success') {
        toast.success((result.data as { message?: string })?.message ?? 'Berhasil');
        await invalidateAll();
      } else if (result.type === 'failure') {
        toast.error((result.data as { error?: string })?.error ?? 'Terjadi kesalahan');
      }
      await update();
    };
  }

  const { meta } = $derived(data);
  const canGoNext = $derived(meta.page < meta.totalPages);
  const canGoPrev = $derived(meta.page > 1);

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  }
</script>

<div class="p-4 sm:p-6 space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-xl font-bold sm:text-2xl">Tickets</h1>
      <p class="text-sm text-muted-foreground">{meta.total} total ticket</p>
    </div>
    <Button onclick={openCreate} size="sm">+ Buat Ticket</Button>
  </div>

  <!-- Filters -->
  <div class="flex flex-wrap gap-3">
    <Input
      class="w-full sm:w-60"
      placeholder="Cari judul atau nomor..."
      value={search}
      oninput={onSearchInput}
    />
    <select
      class="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      bind:value={statusFilter}
      onchange={applyFilters}
    >
      <option value="">Semua Status</option>
      {#each Object.entries(TICKET_STATUS_LABELS) as [val, label]}
        <option value={val}>{label}</option>
      {/each}
    </select>
    <select
      class="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      bind:value={priorityFilter}
      onchange={applyFilters}
    >
      <option value="">Semua Prioritas</option>
      {#each Object.entries(TICKET_PRIORITY_LABELS) as [val, label]}
        <option value={val}>{label}</option>
      {/each}
    </select>
    <select
      class="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      bind:value={categoryFilter}
      onchange={applyFilters}
    >
      <option value="">Semua Kategori</option>
      {#each data.categories as cat}
        <option value={cat.id}>{cat.name}</option>
      {/each}
    </select>
    <label class="flex items-center gap-2 text-sm cursor-pointer">
      <input
        type="checkbox"
        bind:checked={myTickets}
        onchange={applyFilters}
        class="rounded border-input"
      />
      My Tickets
    </label>
  </div>

  <!-- Table -->
  <div class="rounded-xl border bg-card shadow-sm overflow-hidden">
    <div class="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow class="hover:bg-transparent">
            <TableHead class="min-w-32">Nomor</TableHead>
            <TableHead class="min-w-48">Judul</TableHead>
            <TableHead>Status</TableHead>
            <TableHead class="hidden md:table-cell">Prioritas</TableHead>
            <TableHead class="hidden lg:table-cell">Assignee</TableHead>
            <TableHead class="hidden lg:table-cell">Tanggal</TableHead>
            <TableHead class="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {#each data.data as ticket (ticket.id)}
            <TableRow
              class="cursor-pointer"
              onclick={() => goto(`/tickets/${ticket.id}`)}
            >
              <TableCell class="font-mono text-xs">{ticket.ticketNumber}</TableCell>
              <TableCell>
                <div class="min-w-0">
                  <p class="truncate max-w-xs font-medium">{ticket.title}</p>
                  <p class="text-xs text-muted-foreground">{ticket.requester.fullName}</p>
                </div>
              </TableCell>
              <TableCell>
                <StatusBadge status={ticket.status} />
              </TableCell>
              <TableCell class="hidden md:table-cell">
                <PriorityBadge priority={ticket.priority} />
              </TableCell>
              <TableCell class="hidden lg:table-cell text-sm text-muted-foreground">
                {ticket.assignee?.fullName ?? '—'}
              </TableCell>
              <TableCell class="hidden lg:table-cell text-sm text-muted-foreground">
                {formatDate(ticket.createdAt)}
              </TableCell>
              <TableCell onclick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    class="inline-flex size-8 items-center justify-center rounded-md hover:bg-accent"
                  >
                    <span class="text-lg leading-none">⋯</span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onclick={() => goto(`/tickets/${ticket.id}`)}>
                      Lihat Detail
                    </DropdownMenuItem>
                    {#if ticket.status !== 'closed'}
                      <DropdownMenuItem onclick={() => openEdit(ticket)}>Edit</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem class="text-destructive" onclick={() => openDelete(ticket)}>
                        Hapus
                      </DropdownMenuItem>
                    {/if}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          {:else}
            <TableRow>
              <TableCell colspan={7} class="py-12 text-center text-muted-foreground">
                Tidak ada ticket yang ditemukan.
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
          onclick={() => goto(`/tickets?page=${meta.page - 1}`)}>Prev</Button>
        <Button variant="outline" size="sm" disabled={!canGoNext}
          onclick={() => goto(`/tickets?page=${meta.page + 1}`)}>Next</Button>
      </div>
    </div>
  {/if}
</div>

<!-- Create/Edit Sheet -->
<TicketSheet
  bind:open={sheetOpen}
  ticket={editingTicket}
  categories={data.categories}
  onSuccess={() => invalidateAll()}
/>

<!-- Delete Confirm -->
{#if deletingTicket}
  <AlertDialog
    open={deleteOpen}
    onOpenChange={(v) => { deleteOpen = v; if (!v) deletingTicket = null; }}
  >
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Hapus ticket?</AlertDialogTitle>
        <AlertDialogDescription>
          <strong>{deletingTicket.ticketNumber}</strong> — {deletingTicket.title}
          akan dihapus secara permanen.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel onclick={() => { deleteOpen = false; deletingTicket = null; }}>
          Batal
        </AlertDialogCancel>
        <form
          method="POST"
          action="?/deleteTicket"
          use:enhance={() => async ({ result, update }) => {
            deleteOpen = false;
            deletingTicket = null;
            if (result.type === 'success') {
              toast.success('Ticket berhasil dihapus');
              await invalidateAll();
            } else {
              toast.error((result.data as { error?: string })?.error ?? 'Gagal menghapus ticket');
            }
            await update();
          }}
        >
          <input type="hidden" name="id" value={deletingTicket.id} />
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
