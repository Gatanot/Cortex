<script lang="ts">
    import { goto } from "$app/navigation";
    import type { PageProps } from "./$types";

    let { data }: PageProps = $props();

    let canvas: HTMLCanvasElement;
    let hoveredPrompt: {
        id: number;
        title: string;
        x: number;
        y: number;
    } | null = $state(null);

    // Color palette for categories
    const colors = [
        "#4361ee",
        "#f72585",
        "#4cc9f0",
        "#7209b7",
        "#3a0ca3",
        "#4895ef",
        "#560bad",
        "#480ca8",
        "#b5179e",
        "#f77f00",
    ];

    function getCategoryColor(category: string | null): string {
        if (!category) return "#6c757d";
        const index = data.categories.indexOf(category);
        return colors[index % colors.length];
    }

    // Calculate bounds for normalization
    function getBounds() {
        if (data.prompts.length === 0) {
            return { minX: 0, maxX: 1, minY: 0, maxY: 1 };
        }

        let minX = Infinity,
            maxX = -Infinity;
        let minY = Infinity,
            maxY = -Infinity;

        for (const p of data.prompts) {
            if (p.pos_x !== null && p.pos_y !== null) {
                minX = Math.min(minX, p.pos_x);
                maxX = Math.max(maxX, p.pos_x);
                minY = Math.min(minY, p.pos_y);
                maxY = Math.max(maxY, p.pos_y);
            }
        }

        // Add padding
        const padX = (maxX - minX) * 0.1 || 0.5;
        const padY = (maxY - minY) * 0.1 || 0.5;

        return {
            minX: minX - padX,
            maxX: maxX + padX,
            minY: minY - padY,
            maxY: maxY + padY,
        };
    }

    function draw() {
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();

        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        const width = rect.width;
        const height = rect.height;
        const bounds = getBounds();

        // Clear canvas
        ctx.fillStyle =
            getComputedStyle(document.documentElement)
                .getPropertyValue("--color-bg-secondary")
                .trim() || "#ffffff";
        ctx.fillRect(0, 0, width, height);

        if (data.prompts.length === 0) {
            ctx.fillStyle =
                getComputedStyle(document.documentElement)
                    .getPropertyValue("--color-text-muted")
                    .trim() || "#6c757d";
            ctx.font = "16px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(
                "No visualization data available",
                width / 2,
                height / 2,
            );
            ctx.fillText(
                "Run the Python script to generate embeddings",
                width / 2,
                height / 2 + 24,
            );
            return;
        }

        // Draw points
        const pointRadius = 6;

        for (const prompt of data.prompts) {
            if (prompt.pos_x === null || prompt.pos_y === null) continue;

            const x =
                ((prompt.pos_x - bounds.minX) / (bounds.maxX - bounds.minX)) *
                    (width - 40) +
                20;
            const y =
                ((prompt.pos_y - bounds.minY) / (bounds.maxY - bounds.minY)) *
                    (height - 40) +
                20;

            ctx.beginPath();
            ctx.arc(x, y, pointRadius, 0, Math.PI * 2);
            ctx.fillStyle = getCategoryColor(prompt.algo_category);
            ctx.fill();
        }
    }

    function handleMouseMove(event: MouseEvent) {
        if (!canvas || data.prompts.length === 0) return;

        const rect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        const bounds = getBounds();
        const width = rect.width;
        const height = rect.height;

        const pointRadius = 6;
        let found = false;

        for (const prompt of data.prompts) {
            if (prompt.pos_x === null || prompt.pos_y === null) continue;

            const x =
                ((prompt.pos_x - bounds.minX) / (bounds.maxX - bounds.minX)) *
                    (width - 40) +
                20;
            const y =
                ((prompt.pos_y - bounds.minY) / (bounds.maxY - bounds.minY)) *
                    (height - 40) +
                20;

            const distance = Math.sqrt((mouseX - x) ** 2 + (mouseY - y) ** 2);

            if (distance <= pointRadius + 4) {
                hoveredPrompt = {
                    id: prompt.id,
                    title: prompt.title,
                    x: x,
                    y: y,
                };
                found = true;
                break;
            }
        }

        if (!found) {
            hoveredPrompt = null;
        }
    }

    function handleClick(event: MouseEvent) {
        if (hoveredPrompt) {
            goto(`/prompts/${hoveredPrompt.id}`);
        }
    }

    $effect(() => {
        if (canvas) {
            draw();
            window.addEventListener("resize", draw);
            return () => window.removeEventListener("resize", draw);
        }
    });
</script>

<div class="page">
    <div class="container explorer-container">
        <header class="page-header">
            <div class="header-content">
                <h1 class="page-header-title">🔬 Prompt Explorer</h1>
                <p class="page-header-description">
                    {data.prompts.length} prompts with coordinates
                    {#if data.categories.length > 0}
                        · {data.categories.length} clusters detected
                    {/if}
                </p>
            </div>
        </header>

        {#if data.categories.length > 0}
            <div class="legend fade-in">
                <div class="legend-title">🏷️ Clusters</div>
                <div class="legend-items">
                    {#each data.categories as category, index}
                        <div class="legend-item">
                            <span
                                class="legend-color"
                                style="background-color: {colors[index % colors.length]}"
                            ></span>
                            <span class="legend-label">{category}</span>
                        </div>
                    {/each}
                </div>
            </div>
        {/if}

        <div class="canvas-container fade-in" style="animation-delay: 100ms">
            <canvas
                bind:this={canvas}
                onmousemove={handleMouseMove}
                onmouseleave={() => (hoveredPrompt = null)}
                onclick={handleClick}
                style="cursor: {hoveredPrompt ? 'pointer' : 'default'}"
            ></canvas>

            {#if hoveredPrompt}
                <div
                    class="tooltip"
                    style="left: {hoveredPrompt.x}px; top: {hoveredPrompt.y - 40}px"
                >
                    <span class="tooltip-icon">📝</span>
                    {hoveredPrompt.title}
                </div>
            {/if}

            {#if data.prompts.length === 0}
                <div class="canvas-empty-state">
                    <div class="empty-state-icon">🗺️</div>
                    <div class="empty-state-title">No visualization data</div>
                    <p class="empty-state-description">
                        Run the Python script to generate embeddings and explore your prompts visually
                    </p>
                </div>
            {/if}
        </div>
    </div>
</div>

<style>
    .explorer-container {
        height: calc(100vh - var(--nav-height) - var(--space-2xl) * 2);
        display: flex;
        flex-direction: column;
    }

    .page-header {
        margin-bottom: var(--space-lg);
    }

    .legend {
        display: flex;
        flex-direction: column;
        gap: var(--space-sm);
        margin-bottom: var(--space-lg);
        padding: var(--space-md) var(--space-lg);
        background: var(--color-bg-secondary);
        border: 1px solid var(--color-border-light);
        border-radius: var(--radius-lg);
    }

    .legend-title {
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-semibold);
        color: var(--color-text);
        margin-bottom: var(--space-xs);
    }

    .legend-items {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-md);
    }

    .legend-item {
        display: flex;
        align-items: center;
        gap: var(--space-sm);
        padding: var(--space-xs) var(--space-sm);
        background: var(--color-bg);
        border-radius: var(--radius-md);
        transition: all var(--transition-fast);
    }

    .legend-item:hover {
        background: var(--color-bg-tertiary);
    }

    .legend-color {
        width: 14px;
        height: 14px;
        border-radius: var(--radius-full);
        box-shadow: var(--shadow-sm);
    }

    .legend-label {
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
    }

    .canvas-container {
        flex: 1;
        position: relative;
        background: var(--color-bg-secondary);
        border: 1px solid var(--color-border-light);
        border-radius: var(--radius-xl);
        overflow: hidden;
        min-height: 400px;
    }

    canvas {
        width: 100%;
        height: 100%;
        display: block;
    }

    .tooltip {
        position: absolute;
        transform: translateX(-50%);
        display: flex;
        align-items: center;
        gap: var(--space-xs);
        padding: var(--space-sm) var(--space-md);
        background: var(--color-bg-secondary);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
        white-space: nowrap;
        pointer-events: none;
        z-index: 10;
        box-shadow: var(--shadow-lg);
        animation: fadeInUp var(--transition-fast) ease-out;
    }

    .tooltip-icon {
        font-size: var(--font-size-md);
    }

    .canvas-empty-state {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: var(--space-xl);
        background: var(--color-bg-secondary);
    }

    .canvas-empty-state .empty-state-icon {
        font-size: 4rem;
        margin-bottom: var(--space-lg);
        opacity: 0.5;
    }

    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateX(-50%) translateY(5px);
        }
        to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
    }

    @media (max-width: 768px) {
        .explorer-container {
            height: auto;
        }

        .canvas-container {
            min-height: 350px;
            height: 60vh;
        }
    }
</style>
