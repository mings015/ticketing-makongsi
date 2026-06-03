<script lang="ts">
  import { enhance, applyAction } from '$app/forms';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
  import type { ActionData } from './$types';

  let { form }: { form: ActionData } = $props();

  let loading = $state(false);
</script>

<div class="flex min-h-screen items-center justify-center bg-background px-4">
  <Card class="w-full max-w-sm shadow-lg">
    <CardHeader class="text-center">
      <CardTitle class="text-2xl font-bold">Ticketing System</CardTitle>
      <CardDescription>Sign in to your account</CardDescription>
    </CardHeader>
    <CardContent>
      <form
        method="POST"
        use:enhance={() => {
          loading = true;
          return async ({ result }) => {
            loading = false;
            await applyAction(result);
          };
        }}
        class="space-y-4"
      >
        {#if form?.error}
          <div class="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {form.error}
          </div>
        {/if}

        <div class="space-y-2">
          <Label for="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            autocomplete="email"
            required
          />
        </div>

        <div class="space-y-2">
          <Label for="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            autocomplete="current-password"
            required
          />
        </div>

        <Button type="submit" class="w-full" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>
    </CardContent>
  </Card>
</div>
