<script lang="ts">
    import type { PageProps } from "./$types";

    let { data }: PageProps = $props();

    let viewMode = $state<"user" | "algo">("user");
    let searchQuery = $state("");

    // Filter prompts by search query
    let filteredPrompts = $derived.by(() => {
        if (!searchQuery.trim()) return data.prompts;
        const query = searchQuery.toLowerCase();
        return data.prompts.filter(
            (p) =>
                p.title.toLowerCase().includes(query) ||
                p.blocks.some((b) => b.content.toLowerCase().includes(query)),
        );
    });

    // Group prompts by category
    let groupedPrompts = $derived.by(() => {
        const prompts = filteredPrompts;
        const categoryKey =
            viewMode === "user" ? "user_category" : "algo_category";

        const groups: Record<string, typeof prompts> = {};
        const uncategorized: typeof prompts = [];

        for (const prompt of prompts) {
            const category = prompt[categoryKey];
            if (category) {
                if (!groups[category]) groups[category] = [];
                groups[category].push(prompt);
            } else {
                uncategorized.push(prompt);
            }
        }

        // Sort groups by name
        const sortedGroups = Object.entries(groups).sort(([a], [b]) =>
            a.localeCompare(b),
        );

        // Add uncategorized at the end if exists
        if (uncategorized.length > 0) {
            sortedGroups.push(["Uncategorized", uncategorized]);
        }

        return sortedGroups;
    });

    // Copy all blocks of a prompt to clipboard
    async function copyAll(promptId: number) {
        const prompt = data.prompts.find((p) => p.id === promptId);
        if (!prompt) return;

        const text = prompt.blocks.map((b) => b.content).join("\n\n");
        await navigator.clipboard.writeText(text);
        showToast("Copied to clipboard!");
    }

    // Toast notification
    let toastMessage = $state("");
    let toastVisible = $state(false);

    function showToast(message: string) {
        toastMessage = message;
        toastVisible = true;
        setTimeout(() => {
            toastVisible = false;
        }, 2000);
    }
</script>

<div class="page">
    <div class="container">
        <header class="page-header">
            <div class="header-content">
                <h1 class="page-header-title">✨ Prompts</h1>
                <p class="page-header-description">
                    {data.prompts.length} prompts in your library
                </p>
            </div>

            <div class="header-actions">
                <div class="search-input-wrapper">
                    <span class="search-icon">🔍</span>
                    <input
                        type="text"
                        class="form-input"
                        placeholder="Search prompts..."
                        bind:value={searchQuery}
                    />
                </div>
                <a href="/prompts/new" class="btn btn-primary">
                    <span>＋</span> New Prompt
                </a>
            </div>
        </header>

        <div class="view-controls">
            <div class="view-toggle">
                <button
                    class="view-toggle-btn"
                    class:active={viewMode === "user"}
                    onclick={() => (viewMode = "user")}
                >
                    📁 By Category
                </button>
                <button
                    class="view-toggle-btn"
                    class:active={viewMode === "algo"}
                    onclick={() => (viewMode = "algo")}
                >
                    🔬 By Cluster
                </button>
            </div>
        </div>

        {#if data.prompts.length === 0}
            <div class="empty-state fade-in">
                <div class="empty-state-icon">📝</div>
                <div class="empty-state-title">No prompts yet</div>
                <p class="empty-state-description">
                    Create your first prompt to get started managing your AI conversations
                </p>
                <a href="/prompts/new" class="btn btn-primary btn-lg">
                    Create Your First Prompt
                </a>
            </div>
        {:else if filteredPrompts.length === 0}
            <div class="empty-state fade-in">
                <div class="empty-state-icon">🔍</div>
                <div class="empty-state-title">No matching prompts</div>
                <p class="empty-state-description">
                    Try adjusting your search query or browse all prompts
                </p>
                <button class="btn btn-secondary" onclick={() => (searchQuery = "")}>
                    Clear Search
                </button>
            </div>
        {:else}
            {#each groupedPrompts as [category, prompts], i}
                <section class="category-section fade-in" style="animation-delay: {i * 50}ms">
                    <div class="category-header">
                        <span class="category-name">{category}</span>
                        <span class="category-count">{prompts.length}</span>
                    </div>

                    <div class="prompts-grid">
                        {#each prompts as prompt, j (prompt.id)}
                            <a
                                href="/prompts/{prompt.id}"
                                class="card card-clickable prompt-card fade-in"
                                style="animation-delay: {(i * prompts.length + j) * 30}ms"
                            >
                                <div class="card-header">
                                    <h3 class="card-title truncate">{prompt.title}</h3>
                                    <button
                                        class="btn btn-ghost btn-sm copy-btn"
                                        onclick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            copyAll(prompt.id);
                                        }}
                                        title="Copy all blocks"
                                    >
                                        📋
                                    </button>
                                </div>

                                <div class="prompt-preview">
                                    {#if prompt.blocks.length > 0}
                                        <p class="preview-text line-clamp-3">
                                            {prompt.blocks[0].content.slice(0, 200)}{prompt.blocks[0].content.length > 200 ? "..." : ""}
                                        </p>
                                    {/if}
                                </div>

                                <div class="prompt-meta">
                                    <span class="badge">
                                        <span>📦</span> {prompt.blocks.length} blocks
                                    </span>
                                    {#if prompt.user_category && viewMode === "algo"}
                                        <span class="badge badge-primary">
                                            {prompt.user_category}
                                        </span>
                                    {/if}
                                    {#if prompt.algo_category && viewMode === "user"}
                                        <span class="badge badge-info">
                                            {prompt.algo_category}
                                        </span>
                                    {/if}
                                </div>
                            </a>
                        {/each}
                    </div>
                </section>
            {/each}
        {/if}
    </div>
</div>

{#if toastVisible}
    <div class="toast toast-success fade-in">
        <span>✓</span> {toastMessage}
    </div>
{/if}

<style>
    .page-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--space-2xl);
        flex-wrap: wrap;
        gap: var(--space-lg);
    }

    .header-actions {
        display: flex;
        align-items: center;
        gap: var(--space-md);
    }

    .search-input-wrapper {
        position: relative;
        width: 300px;
    }

    .search-input-wrapper .search-icon {
        position: absolute;
        left: var(--space-md);
        top: 50%;
        transform: translateY(-50%);
        font-size: var(--font-size-sm);
        pointer-events: none;
    }

    .search-input-wrapper .form-input {
        padding-left: 2.5rem;
    }

    .view-controls {
        margin-bottom: var(--space-2xl);
    }

    .prompts-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
        gap: var(--space-lg);
    }

    .prompt-card {
        display: flex;
        flex-direction: column;
        text-decoration: none;
        color: inherit;
        min-height: 180px;
    }

    .prompt-card .card-header {
        margin-bottom: var(--space-sm);
    }

    .prompt-preview {
        flex: 1;
        margin-bottom: var(--space-md);
    }

    .preview-text {
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
        line-height: 1.6;
        margin: 0;
    }

    .prompt-meta {
        display: flex;
        gap: var(--space-sm);
        flex-wrap: wrap;
        margin-top: auto;
    }

    .copy-btn {
        opacity: 0;
        transition: opacity var(--transition-fast);
    }

    .prompt-card:hover .copy-btn {
        opacity: 1;
    }

    @media (max-width: 768px) {
        .page-header {
            flex-direction: column;
            align-items: stretch;
        }

        .header-actions {
            flex-direction: column;
        }

        .search-input-wrapper {
            width: 100%;
        }

        .prompts-grid {
            grid-template-columns: 1fr;
        }
    }
</style>
