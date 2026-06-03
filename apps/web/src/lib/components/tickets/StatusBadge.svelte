<script lang="ts">
  import { TICKET_STATUS_COLORS, TICKET_STATUS_LABELS, type TicketStatus } from '$lib/types/tickets';

  let { status }: { status: TicketStatus } = $props();
</script>

<span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium {TICKET_STATUS_COLORS[status]}">
  {TICKET_STATUS_LABELS[status]}
</span>
