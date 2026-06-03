<script lang="ts">
  import { browser } from '$app/environment';
  import { onDestroy } from 'svelte';
  import type { Chart as ChartType } from 'chart.js';

  let {
    data,
    title,
  }: {
    data: { label: string; value: number; color: string }[];
    title?: string;
  } = $props();

  let canvas: HTMLCanvasElement;
  let chart: ChartType | undefined;

  $effect(() => {
    if (!browser || !canvas) return;

    const labels = data.map((d) => d.label);
    const values = data.map((d) => d.value);
    const colors = data.map((d) => d.color);

    import('chart.js').then(({ Chart, ArcElement, Tooltip, Legend }) => {
      Chart.register(ArcElement, Tooltip, Legend);

      if (chart) {
        chart.data.labels = labels;
        chart.data.datasets[0].data = values;
        chart.data.datasets[0].backgroundColor = colors;
        chart.update();
        return;
      }

      chart = new Chart(canvas, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{ data: values, backgroundColor: colors, borderWidth: 2 }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12, font: { size: 12 } } },
            tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.parsed}` } },
          },
        },
      });
    });

    return () => {
      chart?.destroy();
      chart = undefined;
    };
  });

  onDestroy(() => chart?.destroy());
</script>

<div class="rounded-xl border bg-card p-5 shadow-sm">
  {#if title}
    <p class="mb-4 text-sm font-medium text-muted-foreground">{title}</p>
  {/if}
  <div class="relative h-52">
    <canvas bind:this={canvas}></canvas>
  </div>
</div>
