<script lang="ts">
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import { toast } from 'svelte-sonner';
  import { Button } from '$lib/components/ui/button';
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
  import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
    AlertDialogHeader, AlertDialogTitle,
  } from '$lib/components/ui/alert-dialog';
  import { Avatar, AvatarFallback } from '$lib/components/ui/avatar';
  import StatusBadge from '$lib/components/tickets/StatusBadge.svelte';
  import PriorityBadge from '$lib/components/tickets/PriorityBadge.svelte';
  import TicketSheet from '$lib/components/tickets/TicketSheet.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  let { ticket, categories, supportUsers } = $derived(data);

  // Current user context
  const user = $derived(data.user);
  const userRoles = $derived(user?.roles ?? []);
  const isEmployee = $derived(
    userRoles.includes('employee') && !userRoles.some((r: string) => ['support', 'admin', 'super_admin'].includes(r))
  );
  const isSupport = $derived(userRoles.includes('support'));
  const isAdmin = $derived(userRoles.some((r: string) => ['admin', 'super_admin'].includes(r)));
  const isAdminOrSupport = $derived(isSupport || isAdmin);

  // Edit sheet
  let editSheetOpen = $state(false);

  // Comment form
  let commentBody = $state('');
  let isInternalNote = $state(false);
  let commentSubmitting = $state(false);

  // Status change
  let statusNote = $state('');

  // Delete attachment dialog
  let deleteAttachmentId = $state<string | null>(null);

  // Status action buttons
  const isClosed = $derived(ticket.status === 'closed');
  const showInProgress = $derived(
    isAdminOrSupport && (ticket.status === 'open' || ticket.status === 'pending')
  );
  const showPending = $derived(isAdminOrSupport && ticket.status === 'in_progress');
  const showResolved = $derived(isAdminOrSupport && ticket.status === 'in_progress');
  const showClose = $derived(
    isAdmin && ticket.status !== 'closed' && ticket.status !== 'open' ||
    isAdmin && ticket.status === 'open'
  );
  const showConfirmResolved = $derived(isEmployee && ticket.status === 'resolved');
  const showReopen = $derived(
    (isEmployee || isAdmin) && ticket.status === 'resolved'
  );

  function getInitials(name: string) {
    return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
  }

  function formatDate(iso: string | null) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  function formatFileSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  function withToast(successMsg?: string) {
    return async ({ result, update }: { result: { type: string; data?: unknown }; update: () => Promise<void> }) => {
      if (result.type === 'success') {
        toast.success((result.data as { message?: string })?.message ?? successMsg ?? 'Berhasil');
        await invalidateAll();
      } else if (result.type === 'failure') {
        toast.error((result.data as { error?: string })?.error ?? 'Terjadi kesalahan');
      }
      await update();
    };
  }

  const isImageMime = (mime: string) => mime.startsWith('image/');
</script>

<div class="p-4 sm:p-6">
  <!-- Breadcrumb -->
  <div class="mb-4 text-sm text-muted-foreground">
    <a href="/tickets" class="hover:underline">Tickets</a>
    <span class="mx-1">/</span>
    <span>{ticket.ticketNumber}</span>
  </div>

  <div class="grid gap-6 lg:grid-cols-3">
    <!-- ── Left column ─────────────────────────────────────────────── -->
    <div class="space-y-6 lg:col-span-2">

      <!-- Header -->
      <div class="space-y-2">
        <div class="flex flex-wrap items-center gap-2">
          <span class="font-mono text-sm text-muted-foreground">{ticket.ticketNumber}</span>
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
        </div>
        <h1 class="text-xl font-bold sm:text-2xl">{ticket.title}</h1>
      </div>

      <!-- Description -->
      <Card>
        <CardHeader><CardTitle class="text-base">Deskripsi</CardTitle></CardHeader>
        <CardContent>
          <p class="text-sm whitespace-pre-wrap">{ticket.description}</p>
        </CardContent>
      </Card>

      <!-- Comments -->
      <Card>
        <CardHeader><CardTitle class="text-base">Komentar & Aktivitas</CardTitle></CardHeader>
        <CardContent class="space-y-4">
          {#each ticket.comments as comment (comment.id)}
            <div class="flex gap-3 {comment.isInternal ? 'rounded-lg bg-amber-50 p-3 border border-amber-200' : ''}">
              <Avatar class="size-8 shrink-0">
                <AvatarFallback class="text-xs font-medium bg-primary/10 text-primary">
                  {getInitials(comment.author.fullName)}
                </AvatarFallback>
              </Avatar>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-sm font-medium">{comment.author.fullName}</span>
                  {#if comment.isInternal}
                    <span class="text-xs bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded">Internal</span>
                  {/if}
                  <span class="text-xs text-muted-foreground">{formatDate(comment.createdAt)}</span>
                </div>
                <p class="text-sm whitespace-pre-wrap">{comment.body}</p>
                {#if comment.author.id === user?.id && !isClosed}
                  <form method="POST" action="?/deleteComment" use:enhance={() => withToast('Komentar dihapus')} class="mt-1">
                    <input type="hidden" name="commentId" value={comment.id} />
                    <button type="submit" class="text-xs text-muted-foreground hover:text-destructive">Hapus</button>
                  </form>
                {/if}
              </div>
            </div>
          {:else}
            <p class="text-sm text-muted-foreground text-center py-4">Belum ada komentar.</p>
          {/each}

          <!-- Reply form -->
          {#if !isClosed}
            <form
              method="POST"
              action="?/addComment"
              use:enhance={() => async ({ result, update }) => {
                if (result.type === 'success') {
                  commentBody = '';
                  toast.success('Komentar ditambahkan');
                  await invalidateAll();
                } else {
                  toast.error((result.data as { error?: string })?.error ?? 'Gagal');
                }
                await update();
              }}
              class="space-y-2 pt-2 border-t"
            >
              <textarea
                name="body"
                bind:value={commentBody}
                rows={3}
                placeholder="Tulis komentar..."
                class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              ></textarea>
              {#if isAdminOrSupport}
                <label class="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" name="isInternal" value="true"
                    bind:checked={isInternalNote}
                    class="rounded border-input" />
                  Internal Note (hanya terlihat oleh Support/Admin)
                </label>
                {#if isInternalNote}
                  <input type="hidden" name="isInternal" value="true" />
                {/if}
              {/if}
              <div class="flex justify-end">
                <Button type="submit" size="sm" disabled={!commentBody.trim()}>
                  Kirim
                </Button>
              </div>
            </form>
          {/if}
        </CardContent>
      </Card>

      <!-- Attachments -->
      <Card>
        <CardHeader><CardTitle class="text-base">Lampiran</CardTitle></CardHeader>
        <CardContent class="space-y-3">
          {#each ticket.attachments as att (att.id)}
            <div class="flex items-center gap-3 rounded-lg border p-3">
              <div class="shrink-0 text-2xl">
                {isImageMime(att.mimeType) ? '🖼️' : '📄'}
              </div>
              <div class="flex-1 min-w-0">
                <a
                  href={att.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-sm font-medium truncate hover:underline"
                >
                  {att.fileName}
                </a>
                <p class="text-xs text-muted-foreground">
                  {formatFileSize(att.fileSize)} · {att.uploadedBy.fullName}
                </p>
              </div>
              {#if (att.uploadedBy.id === user?.id || isAdmin) && !isClosed}
                <button
                  onclick={() => (deleteAttachmentId = att.id)}
                  class="text-xs text-muted-foreground hover:text-destructive shrink-0"
                >
                  Hapus
                </button>
              {/if}
            </div>
          {:else}
            <p class="text-sm text-muted-foreground text-center py-2">Belum ada lampiran.</p>
          {/each}

          <!-- Upload form -->
          {#if !isClosed}
            <form
              method="POST"
              action="?/uploadAttachment"
              enctype="multipart/form-data"
              use:enhance={() => withToast('Lampiran diunggah')}
              class="pt-2 border-t"
            >
              <label class="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 p-6 cursor-pointer hover:bg-muted/50 transition-colors">
                <span class="text-2xl mb-1">📎</span>
                <span class="text-sm text-muted-foreground">Klik untuk upload file (maks 10 MB)</span>
                <input
                  type="file"
                  name="file"
                  class="sr-only"
                  onchange={(e) => (e.target as HTMLFormElement).form?.requestSubmit()}
                  accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                />
              </label>
            </form>
          {/if}
        </CardContent>
      </Card>
    </div>

    <!-- ── Right sidebar ────────────────────────────────────────────── -->
    <div class="space-y-4">

      <!-- Action buttons -->
      {#if !isClosed}
        <Card>
          <CardHeader><CardTitle class="text-base">Aksi</CardTitle></CardHeader>
          <CardContent class="space-y-2">
            {#if showInProgress}
              <form method="POST" action="?/updateStatus" use:enhance={() => withToast()}>
                <input type="hidden" name="status" value="in_progress" />
                <Button type="submit" variant="outline" class="w-full" size="sm">
                  Tandai In Progress
                </Button>
              </form>
            {/if}
            {#if showPending}
              <form method="POST" action="?/updateStatus" use:enhance={() => withToast()}>
                <input type="hidden" name="status" value="pending" />
                <Button type="submit" variant="outline" class="w-full" size="sm">
                  Butuh Info (Pending)
                </Button>
              </form>
            {/if}
            {#if showResolved}
              <form method="POST" action="?/updateStatus" use:enhance={() => withToast()}>
                <input type="hidden" name="status" value="resolved" />
                <Button type="submit" variant="outline" class="w-full text-green-700 border-green-300 hover:bg-green-50" size="sm">
                  Tandai Selesai
                </Button>
              </form>
            {/if}
            {#if showConfirmResolved}
              <form method="POST" action="?/updateStatus" use:enhance={() => withToast()}>
                <input type="hidden" name="status" value="closed" />
                <Button type="submit" class="w-full bg-green-600 hover:bg-green-700" size="sm">
                  Konfirmasi Selesai
                </Button>
              </form>
            {/if}
            {#if showReopen && !showConfirmResolved}
              <form method="POST" action="?/updateStatus" use:enhance={() => withToast()}>
                <input type="hidden" name="status" value="in_progress" />
                <Button type="submit" variant="outline" class="w-full" size="sm">
                  Reopen
                </Button>
              </form>
            {/if}
            {#if showClose}
              <form method="POST" action="?/updateStatus" use:enhance={() => withToast()} class="space-y-1.5">
                <input type="hidden" name="status" value="closed" />
                <textarea
                  name="note"
                  bind:value={statusNote}
                  rows={2}
                  placeholder="Alasan (opsional)..."
                  class="w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                ></textarea>
                <Button type="submit" variant="destructive" class="w-full" size="sm">
                  Tutup Ticket
                </Button>
              </form>
            {/if}
            {#if !isClosed && !isEmployee}
              <Button variant="outline" class="w-full" size="sm" onclick={() => (editSheetOpen = true)}>
                Edit Ticket
              </Button>
            {/if}
          </CardContent>
        </Card>
      {/if}

      <!-- Info card -->
      <Card>
        <CardHeader><CardTitle class="text-base">Informasi</CardTitle></CardHeader>
        <CardContent class="space-y-3 text-sm">
          <div class="flex justify-between">
            <span class="text-muted-foreground">Status</span>
            <StatusBadge status={ticket.status} />
          </div>
          <div class="flex justify-between">
            <span class="text-muted-foreground">Prioritas</span>
            <PriorityBadge priority={ticket.priority} />
          </div>
          {#if ticket.category}
            <div class="flex justify-between">
              <span class="text-muted-foreground">Kategori</span>
              <span class="font-medium">{ticket.category.name}</span>
            </div>
          {/if}
          <div class="flex justify-between">
            <span class="text-muted-foreground">Dibuat</span>
            <span>{formatDate(ticket.createdAt)}</span>
          </div>
          {#if ticket.dueAt}
            <div class="flex justify-between">
              <span class="text-muted-foreground">Due Date</span>
              <span>{formatDate(ticket.dueAt)}</span>
            </div>
          {/if}
          {#if ticket.resolvedAt}
            <div class="flex justify-between">
              <span class="text-muted-foreground">Diselesaikan</span>
              <span>{formatDate(ticket.resolvedAt)}</span>
            </div>
          {/if}
          {#if ticket.closedAt}
            <div class="flex justify-between">
              <span class="text-muted-foreground">Ditutup</span>
              <span>{formatDate(ticket.closedAt)}</span>
            </div>
          {/if}
        </CardContent>
      </Card>

      <!-- Assignee card -->
      {#if isAdminOrSupport}
        <Card>
          <CardHeader><CardTitle class="text-base">Assignee</CardTitle></CardHeader>
          <CardContent>
            {#if ticket.assignee}
              <div class="flex items-center gap-2 mb-3">
                <Avatar class="size-8">
                  <AvatarFallback class="text-xs font-medium bg-primary/10 text-primary">
                    {getInitials(ticket.assignee.fullName)}
                  </AvatarFallback>
                </Avatar>
                <span class="text-sm font-medium">{ticket.assignee.fullName}</span>
              </div>
            {:else}
              <p class="text-sm text-muted-foreground mb-3">Belum di-assign</p>
            {/if}

            {#if !isClosed}
              <form method="POST" action="?/assignTicket" use:enhance={() => withToast()}>
                <select
                  name="assigneeId"
                  class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring mb-2"
                >
                  <option value="">— Unassign —</option>
                  {#each supportUsers as su}
                    <option value={su.id} selected={ticket.assignee?.id === su.id}>
                      {su.fullName}
                    </option>
                  {/each}
                </select>
                <Button type="submit" variant="outline" size="sm" class="w-full">
                  {ticket.assignee ? 'Reassign' : 'Assign'}
                </Button>
              </form>
            {/if}
          </CardContent>
        </Card>
      {/if}

      <!-- Requester card -->
      <Card>
        <CardHeader><CardTitle class="text-base">Requester</CardTitle></CardHeader>
        <CardContent>
          <div class="flex items-center gap-2">
            <Avatar class="size-8">
              <AvatarFallback class="text-xs font-medium bg-primary/10 text-primary">
                {getInitials(ticket.requester.fullName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p class="text-sm font-medium">{ticket.requester.fullName}</p>
              <p class="text-xs text-muted-foreground">{ticket.requester.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</div>

<!-- Edit sheet -->
<TicketSheet
  bind:open={editSheetOpen}
  ticket={ticket}
  {categories}
  onSuccess={() => invalidateAll()}
/>

<!-- Delete attachment confirm -->
{#if deleteAttachmentId}
  <AlertDialog
    open={!!deleteAttachmentId}
    onOpenChange={(v) => { if (!v) deleteAttachmentId = null; }}
  >
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Hapus lampiran?</AlertDialogTitle>
        <AlertDialogDescription>
          Lampiran ini akan dihapus secara permanen.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel onclick={() => (deleteAttachmentId = null)}>Batal</AlertDialogCancel>
        <form
          method="POST"
          action="?/deleteAttachment"
          use:enhance={() => async ({ result, update }) => {
            deleteAttachmentId = null;
            if (result.type === 'success') {
              toast.success('Lampiran dihapus');
              await invalidateAll();
            } else {
              toast.error((result.data as { error?: string })?.error ?? 'Gagal menghapus lampiran');
            }
            await update();
          }}
        >
          <input type="hidden" name="attachmentId" value={deleteAttachmentId} />
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
