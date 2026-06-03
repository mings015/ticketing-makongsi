<script lang="ts">
  import { browser } from '$app/environment';
  import { onDestroy } from 'svelte';
  import type { Chart as ChartType } from 'chart.js';

  let {
    data,
    title,
    color = '#3b82f6',
  }: {
    data: { label: string; value: number }[];
    title?: string;
    color?: string;
  } = $props();

  let canvas: HTMLCanvasElement;
  let chart: ChartType | undefined;

  $effect(() => {
    if (!browser || !canvas) return;

    const labels = data.map((d) => d.label);
    const values = data.map((d) => d.value);

    import('chart.js').then(({ Chart, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Filler }) => {
      Chart.register(LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Filler);

      if (chart) {
        chart.data.labels = labels;
        chart.data.datasets[0].data = values;
        chart.update();
        return;
      }

      chart = new Chart(canvas, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            data: values,
            borderColor: color,
            backgroundColor: `${color}20`,
            fill: true,
            tension: 0.3,
            pointRadius: data.length > 30 ? 0 : 3,
            pointHoverRadius: 5,
            borderWidth: 2,
          }],
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
            x: { ticks: { font: { size: 11 }, maxRotation: 45 }, grid: { display: false } },
          },
        },
      });
    });

    return () => { chart?.destroy(); chart = undefined; };
  });

  onDestroy(() => chart?.destroy());
</script>

<div class="rounded-xl border bg-card p-5 shadow-sm">
  {#if title}
    <p class="mb-4 text-sm font-medium text-muted-foreground">{title}</p>
  {/if}
  <div class="relative h-56">
    <canvas bind:this={canvas}></canvas>
  </div>
</div>
