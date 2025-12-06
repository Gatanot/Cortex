<script lang="ts">
    import type { PageProps } from "./$types";

    let { data }: PageProps = $props();

    let viewMode = $state<"user" | "algo">("user");
    let searchQuery = $state("");

    // Derived stats for quick overview
    let stats = $derived.by(() => {
        const totalBlocks = data.prompts.reduce(
            (sum, prompt) => sum + prompt.blocks.length,
            0,
        );
        const userCategories = new Set(
            data.prompts
                .map((prompt) => prompt.user_category)
                .filter(Boolean) as string[],
        );
        const algoCategories = new Set(
            data.prompts
                .map((prompt) => prompt.algo_category)
                .filter(Boolean) as string[],
        );

        return {
            totalPrompts: data.prompts.length,
            totalBlocks,
            userCategories: userCategories.size,
            algoCategories: algoCategories.size,
        };
    });

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
            sortedGroups.push(["未分类", uncategorized]);
        }

        return sortedGroups;
    });

    // Copy all blocks of a prompt to clipboard
    async function copyAll(promptId: number) {
        const prompt = data.prompts.find((p) => p.id === promptId);
        if (!prompt) return;

        const text = prompt.blocks.map((b) => b.content).join("\n\n");
        await navigator.clipboard.writeText(text);
        showToast("已复制到剪贴板");
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
                <p class="eyebrow">提示资源</p>
                <h1 class="page-header-title">提示库总览</h1>
                <p class="page-header-description">
                    已收录 {data.prompts.length} 条提示模板，可随时检索与复用
                </p>
            </div>

            <div class="header-actions">
                <label class="search-input-wrapper" aria-label="搜索提示">
                    <svg
                        class="search-icon"
                        viewBox="0 0 24 24"
                        role="presentation"
                        aria-hidden="true"
                    >
                        <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.5" fill="none" />
                        <line
                            x1="15.5"
                            y1="15.5"
                            x2="21"
                            y2="21"
                            stroke="currentColor"
                            stroke-width="1.5"
                            stroke-linecap="round"
                        />
                    </svg>
                    <input
                        type="search"
                        class="form-input"
                        placeholder="搜索标题或正文"
                        bind:value={searchQuery}
                    />
                </label>
                <a href="/prompts/new" class="btn btn-primary">
                    新建提示
                </a>
            </div>
        </header>

        <section class="stats-grid overview-grid">
            <div class="stat-card">
                <div class="stat-icon">提示</div>
                <div>
                    <div class="stat-value">{stats.totalPrompts}</div>
                    <div class="stat-label">当前总数</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">段落</div>
                <div>
                    <div class="stat-value">{stats.totalBlocks}</div>
                    <div class="stat-label">内容拆分</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">分类</div>
                <div>
                    <div class="stat-value">{stats.userCategories}</div>
                    <div class="stat-label">自定义标签</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">聚类</div>
                <div>
                    <div class="stat-value">{stats.algoCategories}</div>
                    <div class="stat-label">算法建议</div>
                </div>
            </div>
        </section>

        <div class="view-controls">
            <div class="view-toggle">
                <button
                    class="view-toggle-btn"
                    class:active={viewMode === "user"}
                    aria-pressed={viewMode === "user"}
                    onclick={() => (viewMode = "user")}
                >
                    按自定义分类
                </button>
                <button
                    class="view-toggle-btn"
                    class:active={viewMode === "algo"}
                    aria-pressed={viewMode === "algo"}
                    onclick={() => (viewMode = "algo")}
                >
                    按聚类标签
                </button>
            </div>
        </div>

        {#if data.prompts.length === 0}
            <div class="empty-state fade-in">
                <div class="empty-state-icon">空</div>
                <div class="empty-state-title">尚未创建提示</div>
                <p class="empty-state-description">
                    使用“新建提示”按钮，将常用写作或对话思路整理成可复用的模板。
                </p>
                <a href="/prompts/new" class="btn btn-primary btn-lg">
                    立即创建
                </a>
            </div>
        {:else if filteredPrompts.length === 0}
            <div class="empty-state fade-in">
                <div class="empty-state-icon">搜</div>
                <div class="empty-state-title">未找到匹配内容</div>
                <p class="empty-state-description">
                    调整关键字或清空搜索条件，重新浏览全部提示。
                </p>
                <button class="btn btn-secondary" onclick={() => (searchQuery = "")}>
                    清空搜索
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
                                        title="复制整条提示"
                                    >
                                        复制
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
                                        {prompt.blocks.length} 段内容
                                    </span>
                                    {#if prompt.user_category && viewMode === "algo"}
                                        <span class="badge badge-primary">
                                            自定义：{prompt.user_category}
                                        </span>
                                    {/if}
                                    {#if prompt.algo_category && viewMode === "user"}
                                        <span class="badge badge-info">
                                            聚类：{prompt.algo_category}
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
    <div class="toast toast-success fade-in" role="status">
        {toastMessage}
    </div>
{/if}

<style>
    .eyebrow {
        font-size: var(--font-size-xs);
        letter-spacing: 0.2em;
        text-transform: uppercase;
        color: var(--color-text-muted);
        margin-bottom: var(--space-xs);
    }

    .header-actions {
        display: flex;
        align-items: center;
        gap: var(--space-md);
        flex-wrap: wrap;
    }

    .search-input-wrapper {
        position: relative;
        width: 320px;
        display: flex;
        align-items: center;
        gap: var(--space-sm);
    }

    .search-icon {
        position: absolute;
        left: var(--space-md);
        width: 18px;
        height: 18px;
        color: var(--color-text-muted);
    }

    .search-input-wrapper .form-input {
        width: 100%;
        padding-left: 2.75rem;
    }

    .overview-grid {
        margin-bottom: var(--space-2xl);
    }

    .view-controls {
        margin-bottom: var(--space-2xl);
    }

    .prompts-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
        gap: var(--space-lg);
    }

    .prompt-card {
        display: flex;
        flex-direction: column;
        text-decoration: none;
        color: inherit;
        min-height: 190px;
        gap: var(--space-sm);
    }

    .prompt-card .card-header {
        margin-bottom: 0;
    }

    .prompt-preview {
        flex: 1;
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
        font-size: var(--font-size-xs);
        text-transform: none;
    }

    @media (max-width: 768px) {
        .page-header {
            flex-direction: column;
            align-items: flex-start;
        }

        .header-actions {
            width: 100%;
        }

        .search-input-wrapper {
            width: 100%;
        }

        .prompts-grid {
            grid-template-columns: 1fr;
        }
    }
</style>
