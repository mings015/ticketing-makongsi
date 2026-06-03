<script lang="ts">
  import { enhance } from "$app/forms";
  import { toast } from "svelte-sonner";
  import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetFooter,
  } from "$lib/components/ui/sheet";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import type { Category, TicketSummary } from "$lib/types/tickets";

  let {
    open = $bindable(false),
    ticket = null,
    categories = [],
    onSuccess,
  }: {
    open: boolean;
    ticket?: TicketSummary | null;
    categories: Category[];
    onSuccess?: () => void;
  } = $props();

  const isEdit = $derived(!!ticket);
  const action = $derived(isEdit ? `?/updateTicket` : "?/createTicket");
  const title = $derived(isEdit ? "Edit Ticket" : "Buat Ticket Baru");

  async function handleResult({
    result,
    update,
  }: {
    result: { type: string; data?: unknown };
    update: () => Promise<void>;
  }) {
    if (result.type === "success") {
      const msg = (result.data as { message?: string })?.message;
      toast.success(msg ?? (isEdit ? "Ticket berhasil diperbarui" : "Ticket berhasil dibuat"));
      open = false;
      onSuccess?.();
    } else if (result.type === "failure") {
      const err = (result.data as { error?: string })?.error ?? "Terjadi kesalahan";
      toast.error(err);
    }
    await update();
  }
</script>

<Sheet bind:open>
  <SheetContent side="right" class="w-full sm:max-w-lg overflow-y-auto">
    <div class="border-b px-6 py-5">
      <SheetHeader>
        <SheetTitle>{title}</SheetTitle>
        <SheetDescription>
          {isEdit
            ? "Ubah informasi ticket ini."
            : "Isi form berikut untuk membuat ticket baru."}
        </SheetDescription>
      </SheetHeader>
    </div>

    <form
      method="POST"
      {action}
      use:enhance={() => handleResult}
      class="flex flex-col gap-5 px-6 py-6"
    >
      {#if isEdit}
        <input type="hidden" name="id" value={ticket!.id} />
      {/if}

      <div class="space-y-1.5">
        <Label for="title">Judul <span class="text-destructive">*</span></Label>
        <Input
          id="title"
          name="title"
          required
          minlength={5}
          maxlength={255}
          placeholder="Deskripsi singkat masalah..."
          value={ticket?.title ?? ""}
        />
      </div>

      <div class="space-y-1.5">
        <Label for="description"
          >Deskripsi <span class="text-destructive">*</span></Label
        >
        <textarea
          id="description"
          name="description"
          required
          minlength={10}
          rows={4}
          placeholder="Jelaskan masalah secara detail..."
          class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          >{ticket?.title ? "" : ""}</textarea
        >
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div class="space-y-1.5">
          <Label for="priority">Prioritas</Label>
          <select
            id="priority"
            name="priority"
            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="low" selected={ticket?.priority === "low"}
              >Low</option
            >
            <option
              value="medium"
              selected={!ticket || ticket.priority === "medium"}>Medium</option
            >
            <option value="high" selected={ticket?.priority === "high"}
              >High</option
            >
            <option value="critical" selected={ticket?.priority === "critical"}
              >Critical</option
            >
          </select>
        </div>

        <div class="space-y-1.5">
          <Label for="categoryId">Kategori</Label>
          <select
            id="categoryId"
            name="categoryId"
            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">— Pilih Kategori —</option>
            {#each categories as cat}
              <option value={cat.id} selected={ticket?.category?.id === cat.id}>
                {cat.name}
              </option>
            {/each}
          </select>
        </div>
      </div>

      <div class="space-y-1.5">
        <Label for="dueAt">Due Date (opsional)</Label>
        <Input
          id="dueAt"
          name="dueAt"
          type="datetime-local"
          value={ticket ? "" : ""}
        />
      </div>

      <SheetFooter class="pt-4">
        <Button type="button" variant="outline" onclick={() => (open = false)}
          >Batal</Button
        >
        <Button type="submit">{isEdit ? "Simpan" : "Buat Ticket"}</Button>
      </SheetFooter>
    </form>
  </SheetContent>
</Sheet>
