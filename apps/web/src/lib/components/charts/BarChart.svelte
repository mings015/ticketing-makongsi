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

    import('chart.js').then(({ Chart, BarElement, CategoryScale, LinearScale, Tooltip, Legend }) => {
      Chart.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

      if (chart) {
        chart.data.labels = labels;
        chart.data.datasets[0].data = values;
        chart.data.datasets[0].backgroundColor = colors;
        chart.update();
        return;
      }

      chart = new Chart(canvas, {
        type: 'bar',
        data: {
          labels,
          datasets: [{ data: values, backgroundColor: colors, borderRadius: 6, borderWidth: 0 }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: (ctx) => ` ${ctx.parsed.y} ticket` } },
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { stepSize: 1, font: { size: 11 } },
              grid: { color: 'rgba(0,0,0,0.05)' },
            },
            x: { ticks: { font: { size: 11 } }, grid: { display: false } },
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
