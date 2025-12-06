<script lang="ts">
    import { goto } from "$app/navigation";
    import type { PageProps } from "./$types";

    let { data }: PageProps = $props();

    const currentPrompt = $derived.by(() => data.prompt);

    type EditableBlock = {
        id: number;
        prompt_id: number;
        content: string;
        sort_order: number;
    };

    // Editable state
    let title = $state("");
    let userCategory = $state("");
    let newCategory = $state("");
    let showNewCategory = $state(false);
    let blocks = $state<EditableBlock[]>([]);

    $effect(() => {
        title = currentPrompt.title;
        userCategory = currentPrompt.user_category || "";
        blocks = currentPrompt.blocks.map((b) => ({
            id: b.id,
            prompt_id: b.prompt_id,
            content: b.content,
            sort_order: b.sort_order,
        }));
    });

    let editing = $state(false);
    let saving = $state(false);
    let deleting = $state(false);
    let error = $state("");
    let toastMessage = $state("");
    let toastVisible = $state(false);

    function showToast(message: string) {
        toastMessage = message;
        toastVisible = true;
        setTimeout(() => (toastVisible = false), 2000);
    }

    async function copyBlock(content: string) {
        await navigator.clipboard.writeText(content);
        showToast("段落已复制");
    }

    async function copyAll() {
        const text = blocks.map((b) => b.content).join("\n\n");
        await navigator.clipboard.writeText(text);
        showToast("整条提示已复制");
    }

    function startEdit() {
        editing = true;
        // Reset to original values
        title = currentPrompt.title;
        userCategory = currentPrompt.user_category || "";
        blocks = currentPrompt.blocks.map((b) => ({
            id: b.id,
            prompt_id: b.prompt_id,
            content: b.content,
            sort_order: b.sort_order,
        }));
    }

    function cancelEdit() {
        editing = false;
        error = "";
    }

    function addBlock() {
        const maxOrder = Math.max(...blocks.map((b) => b.sort_order), -1);
        blocks = [
            ...blocks,
            {
                id: 0,
                prompt_id: currentPrompt.id,
                content: "",
                sort_order: maxOrder + 1,
            },
        ];
    }

    function removeBlock(index: number) {
        if (blocks.length <= 1) return;
        blocks = blocks.filter((_, i) => i !== index);
    }

    function updateBlockContent(index: number, content: string) {
        blocks = blocks.map((b, i) => (i === index ? { ...b, content } : b));
    }

    function moveBlock(index: number, direction: "up" | "down") {
        if (direction === "up" && index === 0) return;
        if (direction === "down" && index === blocks.length - 1) return;

        const newBlocks = [...blocks];
        const targetIndex = direction === "up" ? index - 1 : index + 1;
        [newBlocks[index], newBlocks[targetIndex]] = [
            newBlocks[targetIndex],
            newBlocks[index],
        ];

        // Update sort_order
        newBlocks.forEach((b, i) => (b.sort_order = i));
        blocks = newBlocks;
    }

    async function saveChanges() {
        error = "";

        if (!title.trim()) {
            error = "标题不能为空";
            return;
        }

        const validBlocks = blocks.filter((b) => b.content.trim());
        if (validBlocks.length === 0) {
            error = "至少需要一个内容段";
            return;
        }

        saving = true;

        try {
            const category = showNewCategory
                ? newCategory.trim()
                : userCategory;

            const response = await fetch(`/api/prompts/${data.prompt.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer dev-secret-key",
                },
                body: JSON.stringify({
                    title: title.trim(),
                    user_category: category || null,
                    blocks: validBlocks.map((b, i) => ({
                        content: b.content.trim(),
                        sort_order: i,
                    })),
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "保存失败");
            }

            // Reload data
            window.location.reload();
        } catch (e) {
            error = e instanceof Error ? e.message : "保存失败";
        } finally {
            saving = false;
        }
    }

    async function deletePrompt() {
        if (
            !confirm(
                "确定要删除该提示吗？此操作无法撤销。",
            )
        ) {
            return;
        }

        deleting = true;

        try {
            const response = await fetch(`/api/prompts/${data.prompt.id}`, {
                method: "DELETE",
                headers: {
                    Authorization: "Bearer dev-secret-key",
                },
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "删除失败");
            }

            goto("/");
        } catch (e) {
            error = e instanceof Error ? e.message : "删除失败";
            deleting = false;
        }
    }
</script>

<div class="page">
    <div class="container">
        <header class="page-header">
            <a href="/" class="btn btn-ghost back-btn">
                返回
            </a>

            {#if !editing}
                <div class="header-actions">
                    <button class="btn btn-primary" onclick={copyAll}>
                        复制全部
                    </button>
                    <button class="btn btn-secondary" onclick={startEdit}>
                        进入编辑
                    </button>
                    <button
                        class="btn btn-danger"
                        onclick={deletePrompt}
                        disabled={deleting}
                    >
                        {#if deleting}
                            删除中…
                        {:else}
                            删除
                        {/if}
                    </button>
                </div>
            {/if}
        </header>

        {#if editing}
            <form
                class="prompt-form fade-in"
                onsubmit={(e) => {
                    e.preventDefault();
                    saveChanges();
                }}
            >
                {#if error}
                    <div class="error-message fade-in">
                        {error}
                    </div>
                {/if}

                <div class="form-card">
                    <div class="form-section">
                        <h3 class="form-section-title">基础信息</h3>

                        <div class="form-group">
                            <label class="form-label" for="title">标题</label>
                            <input
                                type="text"
                                id="title"
                                class="form-input"
                                bind:value={title}
                            />
                        </div>

                        <div class="form-group">
                            <p class="form-label">分类</p>
                            <div class="category-selector">
                                {#if !showNewCategory}
                                    <select
                                        class="form-select"
                                        bind:value={userCategory}
                                    >
                                        <option value="">不设置分类</option>
                                        {#each data.categories as category}
                                            <option value={category}>{category}</option>
                                        {/each}
                                    </select>
                                    <button
                                        type="button"
                                        class="btn btn-secondary"
                                        onclick={() => (showNewCategory = true)}
                                    >
                                        新增分类
                                    </button>
                                {:else}
                                    <input
                                        type="text"
                                        class="form-input"
                                        bind:value={newCategory}
                                        placeholder="输入新分类名称"
                                    />
                                    <button
                                        type="button"
                                        class="btn btn-ghost"
                                        onclick={() => (showNewCategory = false)}
                                    >
                                        取消
                                    </button>
                                {/if}
                            </div>
                        </div>
                    </div>

                    <div class="divider"></div>

                    <div class="form-section">
                        <div class="form-section-header">
                            <h3 class="form-section-title">内容段</h3>
                            <span class="badge">共 {blocks.length} 段</span>
                        </div>

                        <div class="blocks-editor">
                            {#each blocks as block, index (block.sort_order)}
                                <div class="block-editor fade-in">
                                    <div class="block-header">
                                        <span class="block-number">
                                            段落 {index + 1}
                                        </span>
                                        <div class="block-actions-edit">
                                            <button
                                                type="button"
                                                class="btn btn-ghost btn-sm"
                                                onclick={() => moveBlock(index, "up")}
                                                disabled={index === 0}
                                                title="上移"
                                            >↑</button>
                                            <button
                                                type="button"
                                                class="btn btn-ghost btn-sm"
                                                onclick={() => moveBlock(index, "down")}
                                                disabled={index === blocks.length - 1}
                                                title="下移"
                                            >↓</button>
                                            <button
                                                type="button"
                                                class="btn btn-ghost btn-sm btn-danger-text"
                                                onclick={() => removeBlock(index)}
                                                disabled={blocks.length <= 1}
                                                title="删除该段"
                                            >移除</button>
                                        </div>
                                    </div>
                                    <textarea
                                        class="form-textarea"
                                        value={block.content}
                                        oninput={(e) =>
                                            updateBlockContent(
                                                index,
                                                (e.target as HTMLTextAreaElement).value,
                                            )}
                                        placeholder="填写段落内容"
                                    ></textarea>
                                </div>
                            {/each}
                        </div>

                        <button
                            type="button"
                            class="btn btn-secondary w-full mt-lg add-block-btn"
                            onclick={addBlock}
                        >
                            添加新段落
                        </button>
                    </div>
                </div>

                <div class="form-actions">
                    <button
                        type="button"
                        class="btn btn-ghost btn-lg"
                        onclick={cancelEdit}
                    >取消编辑</button>
                    <button
                        type="submit"
                        class="btn btn-primary btn-lg"
                        disabled={saving}
                    >
                        {#if saving}
                            保存中…
                        {:else}
                            保存更改
                        {/if}
                    </button>
                </div>
            </form>
        {:else}
            <article class="prompt-view fade-in">
                <header class="prompt-header">
                    <h1 class="prompt-title">{data.prompt.title}</h1>
                    <div class="prompt-meta">
                        {#if data.prompt.user_category}
                            <span class="badge badge-primary badge-lg">
                                分类：{data.prompt.user_category}
                            </span>
                        {/if}
                        {#if data.prompt.algo_category}
                            <span class="badge badge-lg">
                                聚类：{data.prompt.algo_category}
                            </span>
                        {/if}
                        <span class="text-sm text-muted">
                            更新：{new Date(data.prompt.updated_at).toLocaleString("zh-CN", { hour12: false })}
                        </span>
                    </div>
                </header>

                <div class="blocks-view">
                    {#each data.prompt.blocks as block, index (block.id)}
                        <div class="block fade-in" style="animation-delay: {index * 50}ms">
                            <div class="block-actions">
                                <button
                                    class="btn btn-ghost btn-sm"
                                    onclick={() => copyBlock(block.content)}
                                >
                                    复制
                                </button>
                            </div>
                            <div class="block-label">段落 {index + 1}</div>
                            <div class="block-content">{block.content}</div>
                        </div>
                    {/each}
                </div>
            </article>
        {/if}
    </div>
</div>

{#if toastVisible}
    <div class="toast toast-success fade-in" role="status">
        {toastMessage}
    </div>
{/if}

<style>
    .page-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: var(--space-2xl);
        gap: var(--space-lg);
    }

    .back-btn {
        flex-shrink: 0;
    }

    .header-actions {
        display: flex;
        gap: var(--space-sm);
    }

    .prompt-form {
        max-width: 800px;
    }

    .form-card {
        background: var(--color-bg-secondary);
        border: 1px solid var(--color-border-light);
        border-radius: var(--radius-xl);
        padding: var(--space-xl);
        margin-bottom: var(--space-xl);
    }

    .form-section {
        margin-bottom: var(--space-lg);
    }

    .form-section:last-child {
        margin-bottom: 0;
    }

    .form-section-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: var(--space-lg);
    }

    .form-section-title {
        font-size: var(--font-size-lg);
        font-weight: var(--font-weight-semibold);
        color: var(--color-text);
        margin: 0 0 var(--space-lg) 0;
    }

    .form-section-header .form-section-title {
        margin: 0;
    }

    .divider {
        height: 1px;
        background: var(--color-border-light);
        margin: var(--space-xl) 0;
    }

    .error-message {
        display: flex;
        align-items: center;
        gap: var(--space-sm);
        padding: var(--space-md) var(--space-lg);
        background: var(--color-danger-light);
        border: 1px solid var(--color-danger);
        border-radius: var(--radius-lg);
        color: var(--color-danger);
        margin-bottom: var(--space-xl);
        font-weight: var(--font-weight-medium);
    }

    .category-selector {
        display: flex;
        gap: var(--space-sm);
    }

    .category-selector .form-select,
    .category-selector .form-input {
        flex: 1;
    }

    .blocks-editor {
        display: flex;
        flex-direction: column;
        gap: var(--space-lg);
    }

    .block-editor {
        background: var(--color-bg);
        border: 1px solid var(--color-border-light);
        border-radius: var(--radius-lg);
        padding: var(--space-lg);
        transition: all var(--transition-fast);
    }

    .block-editor:hover {
        border-color: var(--color-border);
    }

    .block-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--space-md);
    }

    .block-number {
        display: flex;
        align-items: center;
        gap: var(--space-sm);
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-semibold);
        color: var(--color-text);
    }

    .block-actions-edit {
        display: flex;
        gap: var(--space-xs);
    }

    .btn-danger-text:not(:disabled):hover {
        color: var(--color-danger);
    }

    .add-block-btn {
        border-style: dashed;
    }

    .mt-lg {
        margin-top: var(--space-lg);
    }

    .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: var(--space-md);
        padding-top: var(--space-lg);
    }

    .prompt-view {
        max-width: 800px;
    }

    .prompt-header {
        margin-bottom: var(--space-2xl);
        padding-bottom: var(--space-xl);
        border-bottom: 1px solid var(--color-border-light);
    }

    .prompt-title {
        font-size: var(--font-size-3xl);
        font-weight: var(--font-weight-bold);
        margin-bottom: var(--space-md);
        letter-spacing: var(--letter-spacing-tight);
    }

    .prompt-meta {
        display: flex;
        align-items: center;
        gap: var(--space-md);
        flex-wrap: wrap;
    }

    .blocks-view {
        display: flex;
        flex-direction: column;
        gap: var(--space-lg);
    }

    @media (max-width: 768px) {
        .page-header {
            flex-direction: column;
            align-items: flex-start;
        }

        .header-actions {
            width: 100%;
            flex-wrap: wrap;
        }

        .header-actions .btn {
            flex: 1;
        }

        .form-card {
            padding: var(--space-lg);
        }

        .category-selector {
            flex-direction: column;
        }

        .form-actions {
            flex-direction: column-reverse;
        }

        .form-actions .btn {
            width: 100%;
        }
    }
</style>
