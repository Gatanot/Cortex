<script lang="ts">
    import { goto } from "$app/navigation";
    import type { PageProps } from "./$types";

    let { data }: PageProps = $props();

    let title = $state("");
    let userCategory = $state("");
    let newCategory = $state("");
    let showNewCategory = $state(false);
    let blocks = $state<string[]>([""]);
    let saving = $state(false);
    let error = $state("");

    function addBlock() {
        blocks = [...blocks, ""];
    }

    function removeBlock(index: number) {
        if (blocks.length <= 1) return;
        blocks = blocks.filter((_, i) => i !== index);
    }

    function updateBlock(index: number, value: string) {
        blocks = blocks.map((b, i) => (i === index ? value : b));
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
        blocks = newBlocks;
    }

    async function handleSubmit() {
        error = "";

        if (!title.trim()) {
            error = "Title is required";
            return;
        }

        const validBlocks = blocks.filter((b) => b.trim());
        if (validBlocks.length === 0) {
            error = "At least one block is required";
            return;
        }

        saving = true;

        try {
            const category = showNewCategory
                ? newCategory.trim()
                : userCategory;

            const response = await fetch("/api/prompts", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer dev-secret-key",
                },
                body: JSON.stringify({
                    title: title.trim(),
                    user_category: category || null,
                    blocks: validBlocks,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Failed to create prompt");
            }

            const result = await response.json();
            goto(`/prompts/${result.id}`);
        } catch (e) {
            error = e instanceof Error ? e.message : "Failed to create prompt";
        } finally {
            saving = false;
        }
    }
</script>

<div class="page">
    <div class="container">
        <header class="page-header">
            <a href="/" class="btn btn-ghost back-btn">
                <span>←</span> Back
            </a>
            <div class="header-title">
                <h1 class="page-header-title">✨ New Prompt</h1>
                <p class="page-header-description">Create a new prompt with content blocks</p>
            </div>
        </header>

        <form
            class="prompt-form fade-in"
            onsubmit={(e) => {
                e.preventDefault();
                handleSubmit();
            }}
        >
            {#if error}
                <div class="error-message fade-in">
                    <span>⚠️</span> {error}
                </div>
            {/if}

            <div class="form-card">
                <div class="form-section">
                    <h3 class="form-section-title">📋 Basic Information</h3>
                    
                    <div class="form-group">
                        <label class="form-label" for="title">
                            Title <span class="form-label-hint">(required)</span>
                        </label>
                        <input
                            type="text"
                            id="title"
                            class="form-input"
                            bind:value={title}
                            placeholder="Enter a descriptive title..."
                        />
                    </div>

                    <div class="form-group">
                        <label class="form-label">Category</label>
                        <div class="category-selector">
                            {#if !showNewCategory}
                                <select class="form-select" bind:value={userCategory}>
                                    <option value="">No category</option>
                                    {#each data.categories as category}
                                        <option value={category}>{category}</option>
                                    {/each}
                                </select>
                                <button
                                    type="button"
                                    class="btn btn-secondary"
                                    onclick={() => (showNewCategory = true)}
                                >
                                    <span>＋</span> New
                                </button>
                            {:else}
                                <input
                                    type="text"
                                    class="form-input"
                                    bind:value={newCategory}
                                    placeholder="Enter new category name..."
                                />
                                <button
                                    type="button"
                                    class="btn btn-ghost"
                                    onclick={() => (showNewCategory = false)}
                                >
                                    Cancel
                                </button>
                            {/if}
                        </div>
                    </div>
                </div>

                <div class="divider"></div>

                <div class="form-section">
                    <div class="form-section-header">
                        <h3 class="form-section-title">📝 Content Blocks</h3>
                        <span class="badge">{blocks.length} blocks</span>
                    </div>
                    
                    <div class="blocks-editor">
                        {#each blocks as block, index (index)}
                            <div class="block-editor fade-in" style="animation-delay: {index * 50}ms">
                                <div class="block-header">
                                    <span class="block-number">
                                        <span class="block-number-icon">📄</span>
                                        Block {index + 1}
                                    </span>
                                    <div class="block-actions-edit">
                                        <button
                                            type="button"
                                            class="btn btn-ghost btn-sm"
                                            onclick={() => moveBlock(index, "up")}
                                            disabled={index === 0}
                                            title="Move up"
                                        >
                                            ↑
                                        </button>
                                        <button
                                            type="button"
                                            class="btn btn-ghost btn-sm"
                                            onclick={() => moveBlock(index, "down")}
                                            disabled={index === blocks.length - 1}
                                            title="Move down"
                                        >
                                            ↓
                                        </button>
                                        <button
                                            type="button"
                                            class="btn btn-ghost btn-sm btn-danger-text"
                                            onclick={() => removeBlock(index)}
                                            disabled={blocks.length <= 1}
                                            title="Remove block"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                                <textarea
                                    class="form-textarea"
                                    value={block}
                                    oninput={(e) =>
                                        updateBlock(
                                            index,
                                            (e.target as HTMLTextAreaElement).value,
                                        )}
                                placeholder="Enter block content..."
                            ></textarea>
                        </div>
                    {/each}
                </div>

                <button
                    type="button"
                    class="btn btn-secondary w-full mt-lg add-block-btn"
                    onclick={addBlock}
                >
                    <span>＋</span> Add Block
                </button>
            </div>
            </div>

            <div class="form-actions">
                <a href="/" class="btn btn-ghost btn-lg">Cancel</a>
                <button type="submit" class="btn btn-primary btn-lg" disabled={saving}>
                    {#if saving}
                        <span class="animate-spin">⟳</span> Creating...
                    {:else}
                        <span>✓</span> Create Prompt
                    {/if}
                </button>
            </div>
        </form>
    </div>
</div>

<style>
    .page-header {
        display: flex;
        align-items: center;
        gap: var(--space-lg);
        margin-bottom: var(--space-2xl);
    }

    .back-btn {
        flex-shrink: 0;
    }

    .header-title {
        flex: 1;
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

    .block-number-icon {
        font-size: var(--font-size-md);
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

    @media (max-width: 768px) {
        .page-header {
            flex-direction: column;
            align-items: flex-start;
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
