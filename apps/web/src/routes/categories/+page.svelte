<script lang="ts">
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import { toast } from 'svelte-sonner';
  import { Button } from '$lib/components/ui/button';
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
    AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
    AlertDialogHeader, AlertDialogTitle,
  } from '$lib/components/ui/alert-dialog';
  import CategorySheet from '$lib/components/categories/CategorySheet.svelte';
  import type { PageData } from './$types';
  import type { CategoryDetail } from '$lib/types/categories';

  let { data }: { data: PageData } = $props();

  let sheetOpen = $state(false);
  let editingCategory = $state<CategoryDetail | null>(null);
  let deleteOpen = $state(false);
  let deletingCategory = $state<CategoryDetail | null>(null);

  function openCreate() { editingCategory = null; sheetOpen = true; }
  function openEdit(c: CategoryDetail) { editingCategory = c; sheetOpen = true; }
  function openDelete(c: CategoryDetail) { deletingCategory = c; deleteOpen = true; }

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

  const activeCount = $derived(data.categories.filter((c) => c.isActive).length);
</script>

<div class="p-4 sm:p-6 space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-xl font-bold sm:text-2xl">Categories</h1>
      <p class="text-sm text-muted-foreground">
        {data.categories.length} total · {activeCount} aktif
      </p>
    </div>
    <Button onclick={openCreate} size="sm">+ Tambah Kategori</Button>
  </div>

  <!-- Table -->
  <div class="rounded-xl border bg-card shadow-sm overflow-hidden">
    <div class="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow class="hover:bg-transparent">
            <TableHead class="min-w-32">Kode</TableHead>
            <TableHead class="min-w-40">Nama</TableHead>
            <TableHead class="hidden md:table-cell">Deskripsi</TableHead>
            <TableHead>Status</TableHead>
            <TableHead class="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {#each data.categories as cat (cat.id)}
            <TableRow>
              <TableCell class="font-mono text-sm font-medium">{cat.code ?? '—'}</TableCell>
              <TableCell class="font-medium">{cat.name}</TableCell>
              <TableCell class="hidden md:table-cell text-sm text-muted-foreground max-w-xs truncate">
                {cat.description ?? '—'}
              </TableCell>
              <TableCell>
                <Badge variant={cat.isActive ? 'default' : 'secondary'}>
                  {cat.isActive ? 'Aktif' : 'Nonaktif'}
                </Badge>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    class="inline-flex size-8 items-center justify-center rounded-md hover:bg-accent"
                  >
                    <span class="text-lg leading-none">⋯</span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onclick={() => openEdit(cat)}>Edit</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <form method="POST" action="?/toggleActive" use:enhance={() => withToast()}>
                      <input type="hidden" name="id" value={cat.id} />
                      <input type="hidden" name="isActive" value={String(cat.isActive)} />
                      <DropdownMenuItem>
                        <button type="submit" class="w-full text-left {cat.isActive ? 'text-amber-600' : 'text-green-600'}">
                          {cat.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                        </button>
                      </DropdownMenuItem>
                    </form>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem class="text-destructive" onclick={() => openDelete(cat)}>
                      Hapus
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          {:else}
            <TableRow>
              <TableCell colspan={5} class="py-12 text-center text-muted-foreground">
                Belum ada kategori. Tambah kategori pertama.
              </TableCell>
            </TableRow>
          {/each}
        </TableBody>
      </Table>
    </div>
  </div>
</div>

<!-- Create/Edit Sheet -->
<CategorySheet
  bind:open={sheetOpen}
  category={editingCategory}
  onSuccess={() => invalidateAll()}
/>

<!-- Delete Confirm -->
{#if deletingCategory}
  <AlertDialog
    open={deleteOpen}
    onOpenChange={(v) => { deleteOpen = v; if (!v) deletingCategory = null; }}
  >
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Hapus kategori?</AlertDialogTitle>
        <AlertDialogDescription>
          <strong>{deletingCategory.name}</strong> akan dihapus.
          Ticket yang menggunakan kategori ini tidak terpengaruh.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel onclick={() => { deleteOpen = false; deletingCategory = null; }}>
          Batal
        </AlertDialogCancel>
        <form
          method="POST"
          action="?/deleteCategory"
          use:enhance={() => async ({ result, update }) => {
            deleteOpen = false;
            deletingCategory = null;
            if (result.type === 'success') {
              toast.success('Kategori berhasil dihapus');
              await invalidateAll();
            } else {
              toast.error((result.data as { error?: string })?.error ?? 'Gagal menghapus');
            }
            await update();
          }}
        >
          <input type="hidden" name="id" value={deletingCategory.id} />
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
