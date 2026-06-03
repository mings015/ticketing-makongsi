<script lang="ts">
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

  let {
    open = $bindable(false),
    userName,
    onConfirm,
  }: {
    open: boolean;
    userName: string;
    onConfirm: () => void;
  } = $props();
</script>

<!-- open prop controlled from parent; component only mounted when needed via {#if} in parent -->
<AlertDialog
  open={open}
  onOpenChange={(v) => (open = v)}
>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Nonaktifkan pengguna?</AlertDialogTitle>
      <AlertDialogDescription>
        <strong>{userName}</strong> tidak akan bisa login. Semua sesi aktif akan dicabut.
        Tindakan ini dapat dibatalkan kapan saja.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel onclick={() => (open = false)}>Batal</AlertDialogCancel>
      <AlertDialogAction
        onclick={onConfirm}
        class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
      >
        Nonaktifkan
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
