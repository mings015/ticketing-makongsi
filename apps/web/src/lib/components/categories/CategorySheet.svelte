<script lang="ts">
  import { enhance } from '$app/forms';
  import { toast } from 'svelte-sonner';
  import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetFooter,
  } from '$lib/components/ui/sheet';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import type { CategoryDetail } from '$lib/types/categories';

  let {
    open = $bindable(false),
    category = null,
    onSuccess,
  }: {
    open: boolean;
    category?: CategoryDetail | null;
    onSuccess?: () => void;
  } = $props();

  const isEdit = $derived(!!category);
  const action = $derived(isEdit ? '?/updateCategory' : '?/createCategory');
  const title = $derived(isEdit ? 'Edit Kategori' : 'Tambah Kategori');

  async function handleResult({ result, update }: { result: { type: string; data?: unknown }; update: () => Promise<void> }) {
    if (result.type === 'success') {
      const msg = (result.data as { message?: string })?.message;
      toast.success(msg ?? (isEdit ? 'Kategori berhasil diperbarui' : 'Kategori berhasil dibuat'));
      open = false;
      onSuccess?.();
    } else if (result.type === 'failure') {
      const err = (result.data as { error?: string })?.error ?? 'Terjadi kesalahan';
      toast.error(err);
    }
    await update();
  }
</script>

<Sheet bind:open>
  <SheetContent side="right" class="w-full sm:max-w-md overflow-y-auto">
    <SheetHeader class="border-b px-6 py-5">
      <SheetTitle>{title}</SheetTitle>
      <SheetDescription>
        {isEdit ? 'Ubah informasi kategori ini.' : 'Isi form untuk menambah kategori baru.'}
      </SheetDescription>
    </SheetHeader>

    <form
      method="POST"
      action={action}
      use:enhance={() => handleResult}
      class="flex flex-col gap-4 px-6 py-6"
    >
      {#if isEdit}
        <input type="hidden" name="id" value={category!.id} />
      {/if}

      <div class="space-y-1.5">
        <Label for="name">Nama <span class="text-destructive">*</span></Label>
        <Input
          id="name"
          name="name"
          required
          minlength={2}
          maxlength={100}
          placeholder="Contoh: Hardware"
          value={category?.name ?? ''}
        />
      </div>

      <div class="space-y-1.5">
        <Label for="code">Kode</Label>
        <Input
          id="code"
          name="code"
          minlength={2}
          maxlength={20}
          placeholder="Contoh: HW"
          value={category?.code ?? ''}
        />
        <p class="text-xs text-muted-foreground">Singkatan unik untuk kategori ini (opsional).</p>
      </div>

      <div class="space-y-1.5">
        <Label for="description">Deskripsi</Label>
        <textarea
          id="description"
          name="description"
          rows={3}
          maxlength={500}
          placeholder="Deskripsi singkat kategori..."
          class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        >{category?.description ?? ''}</textarea>
      </div>

      <label class="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          name="isActive"
          value="true"
          checked={category ? category.isActive : true}
          class="rounded border-input"
        />
        <span class="text-sm font-medium">Aktif</span>
      </label>

      <SheetFooter class="pt-2">
        <Button type="button" variant="outline" onclick={() => (open = false)}>Batal</Button>
        <Button type="submit">{isEdit ? 'Simpan' : 'Tambah'}</Button>
      </SheetFooter>
    </form>
  </SheetContent>
</Sheet>
