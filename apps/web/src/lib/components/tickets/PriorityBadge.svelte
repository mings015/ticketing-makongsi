<script lang="ts">
  import { TICKET_PRIORITY_COLORS, TICKET_PRIORITY_LABELS, type TicketPriority } from '$lib/types/tickets';

  let { priority }: { priority: TicketPriority } = $props();
</script>

<span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium {TICKET_PRIORITY_COLORS[priority]}">
  {TICKET_PRIORITY_LABELS[priority]}
</span>
