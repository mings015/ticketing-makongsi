<script lang="ts">
  let {
    label,
    value,
    sublabel,
    colorClass = 'text-foreground',
  }: {
    label: string;
    value: number | string;
    sublabel?: string;
    colorClass?: string;
  } = $props();
</script>

<div class="rounded-xl border bg-card p-5 shadow-sm">
  <p class="text-sm text-muted-foreground">{label}</p>
  <p class="mt-1 text-3xl font-bold {colorClass}">{value}</p>
  {#if sublabel}
    <p class="mt-1 text-xs text-muted-foreground">{sublabel}</p>
  {/if}
</div>
