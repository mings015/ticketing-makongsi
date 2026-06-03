<script lang="ts">
  import { enhance } from "$app/forms";
  import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
  } from "$lib/components/ui/sheet";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { Separator } from "$lib/components/ui/separator";
  import { ROLES, ROLE_LABELS, type UserSummary } from "$lib/types/users";
  import { toast } from "svelte-sonner";

  let {
    open = $bindable(false),
    user = null,
    onSuccess,
  }: {
    open: boolean;
    user: UserSummary | null;
    onSuccess: () => void;
  } = $props();

  const isEdit = $derived(user !== null);

  let selectedRoles = $state<string[]>([]);
  let loading = $state(false);
  let pwLoading = $state(false);

  // Password fields (create mode)
  let password = $state("");
  let confirmPassword = $state("");
  let pwError = $state("");

  // Change password fields (edit mode)
  let newPassword = $state("");
  let confirmNewPassword = $state("");
  let changePwError = $state("");

  $effect(() => {
    selectedRoles = user?.roles ?? ["employee"];
    // Reset fields when sheet opens/closes
    password = "";
    confirmPassword = "";
    pwError = "";
    newPassword = "";
    confirmNewPassword = "";
    changePwError = "";
  });

  function toggleRole(role: string) {
    if (selectedRoles.includes(role)) {
      if (selectedRoles.length > 1)
        selectedRoles = selectedRoles.filter((r) => r !== role);
    } else {
      selectedRoles = [...selectedRoles, role];
    }
  }

  function validatePassword() {
    if (password.length < 8) {
      pwError = "Password minimal 8 karakter";
      return false;
    }
    if (password !== confirmPassword) {
      pwError = "Password dan konfirmasi tidak sama";
      return false;
    }
    pwError = "";
    return true;
  }

  function validateNewPassword() {
    if (newPassword.length < 8) {
      changePwError = "Password minimal 8 karakter";
      return false;
    }
    if (newPassword !== confirmNewPassword) {
      changePwError = "Password dan konfirmasi tidak sama";
      return false;
    }
    changePwError = "";
    return true;
  }
</script>

<Sheet bind:open>
  <SheetContent
    class="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-md"
  >
    <div class="border-b px-6 py-5">
      <SheetHeader>
        <SheetTitle>{isEdit ? "Edit User" : "New User"}</SheetTitle>
        <SheetDescription>
          {isEdit ? "Perbarui informasi pengguna." : "Buat akun pengguna baru."}
        </SheetDescription>
      </SheetHeader>
    </div>

    <!-- ── Form Info (Create & Edit) ── -->
    <form
      method="POST"
      action={isEdit ? "?/updateUser" : "?/createUser"}
      use:enhance={() => {
        if (!isEdit && !validatePassword()) return ({ cancel }) => cancel();
        loading = true;
        return async ({ result, update }) => {
          loading = false;
          if (result.type === "success") {
            toast.success(
              (result.data as { message?: string })?.message ?? "Berhasil",
            );
            open = false;
            onSuccess();
          } else if (result.type === "failure") {
            toast.error(
              (result.data as { error?: string })?.error ?? "Terjadi kesalahan",
            );
          }
          await update({ reset: false });
        };
      }}
      class="flex flex-col gap-5 px-6 py-6"
    >
      {#if isEdit}
        <input type="hidden" name="id" value={user!.id} />
      {/if}

      <div class="space-y-2">
        <Label for="fullName">Full Name</Label>
        <Input
          id="fullName"
          name="fullName"
          placeholder="John Doe"
          value={user?.fullName ?? ""}
          required
        />
      </div>

      <div class="space-y-2">
        <Label for="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="john@company.com"
          value={user?.email ?? ""}
          required={!isEdit}
        />
      </div>

      {#if !isEdit}
        <!-- Password fields hanya saat create -->
        <div class="space-y-2">
          <Label for="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="Minimal 8 karakter"
            bind:value={password}
            oninput={() => (pwError = "")}
            required
          />
        </div>

        <div class="space-y-2">
          <Label for="confirmPassword">Konfirmasi Password</Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            placeholder="Ulangi password"
            bind:value={confirmPassword}
            oninput={() => (pwError = "")}
            required
          />
        </div>

        {#if pwError}
          <p class="text-sm text-destructive">{pwError}</p>
        {/if}

        <div class="space-y-3">
          <Label>Roles</Label>
          <div class="flex flex-wrap gap-2">
            {#each ROLES as role}
              <button
                type="button"
                onclick={() => toggleRole(role)}
                class={[
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  selectedRoles.includes(role)
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground hover:bg-accent",
                ].join(" ")}
              >
                {ROLE_LABELS[role]}
              </button>
            {/each}
          </div>
          {#each selectedRoles as role}
            <input type="hidden" name="roles" value={role} />
          {/each}
          <p class="text-xs text-muted-foreground">
            Minimum 1 role wajib dipilih.
          </p>
        </div>
      {/if}

      <div class="flex justify-end gap-3 border-t pt-4">
        <Button type="button" variant="outline" onclick={() => (open = false)}
          >Batal</Button
        >
        <Button type="submit" disabled={loading}>
          {loading ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Buat User"}
        </Button>
      </div>
    </form>

    <!-- ── Ubah Password (hanya Edit mode) ── -->
    {#if isEdit}
      <Separator />

      <form
        method="POST"
        action="?/changePassword"
        use:enhance={() => {
          if (!validateNewPassword()) return ({ cancel }) => cancel();
          pwLoading = true;
          return async ({ result, update }) => {
            pwLoading = false;
            if (result.type === "success") {
              toast.success("Password berhasil diubah");
              newPassword = "";
              confirmNewPassword = "";
              open = false;
            } else if (result.type === "failure") {
              changePwError =
                (result.data as { error?: string })?.error ??
                "Terjadi kesalahan";
            }
            await update({ reset: false });
          };
        }}
        class="flex flex-col gap-5 px-6 py-6"
      >
        <input type="hidden" name="id" value={user!.id} />

        <p class="text-sm font-medium">Ubah Password</p>

        <div class="space-y-2">
          <Label for="newPassword">Password Baru</Label>
          <Input
            id="newPassword"
            name="password"
            type="password"
            placeholder="Minimal 8 karakter"
            bind:value={newPassword}
            oninput={() => (changePwError = "")}
          />
        </div>

        <div class="space-y-2">
          <Label for="confirmNewPassword">Konfirmasi Password Baru</Label>
          <Input
            id="confirmNewPassword"
            name="confirmPassword"
            type="password"
            placeholder="Ulangi password baru"
            bind:value={confirmNewPassword}
            oninput={() => (changePwError = "")}
          />
        </div>

        {#if changePwError}
          <p class="text-sm text-destructive">{changePwError}</p>
        {/if}

        <div class="flex justify-end gap-3 border-t pt-4">
          <Button
            type="submit"
            variant="outline"
            disabled={pwLoading || !newPassword}
          >
            {pwLoading ? "Menyimpan..." : "Ubah Password"}
          </Button>
        </div>
      </form>
    {/if}
  </SheetContent>
</Sheet>
