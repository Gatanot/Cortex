<script lang="ts">
    import type { PageProps } from "./$types";

    let { data }: PageProps = $props();

    type BackupEntry = (typeof data.backups)[number];
    const initialBackups = $derived.by(() => data.backups);

    let backups = $state<BackupEntry[]>([]);
    let restoring = $state<string | null>(null);
    let deleting = $state<string | null>(null);
    let toastMessage = $state("");
    let toastVisible = $state(false);
    let toastType = $state<"success" | "error">("success");

    $effect(() => {
        backups = [...initialBackups];
    });

    let totalSizeLabel = $derived.by(() => {
        const totalBytes = backups.reduce(
            (sum, backup) => sum + backup.size,
            0,
        );
        if (totalBytes === 0) return "0 B";
        return totalBytes >= 1024 * 1024
            ? `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`
            : `${(totalBytes / 1024).toFixed(1)} KB`;
    });

    function showToast(message: string, type: "success" | "error" = "success") {
        toastMessage = message;
        toastType = type;
        toastVisible = true;
        setTimeout(() => (toastVisible = false), 3000);
    }

    function formatSize(bytes: number): string {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
        return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    }

    function formatDate(isoString: string): string {
        return new Date(isoString).toLocaleString("zh-CN", {
            hour12: false,
        });
    }

    async function handleExport() {
        window.location.href = "/api/export";
    }

    async function handleImport(event: Event) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];

        if (!file) return;

        if (
            !confirm(
                "导入会覆盖当前所有提示数据，系统会自动生成备份，确定继续吗？",
            )
        ) {
            input.value = "";
            return;
        }

        try {
            const content = await file.text();
            const data = JSON.parse(content);

            const response = await fetch("/api/import", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer dev-secret-key",
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.error || "导入失败");
            }

            const result = await response.json();
            showToast(
                `已导入 ${result.imported} 条提示，自动备份：${result.backupCreated}`,
            );

            // Refresh backup list
            const backupsResponse = await fetch("/api/backups");
            backups = (await backupsResponse.json()) as BackupEntry[];
        } catch (error) {
            showToast(
                error instanceof Error ? error.message : "导入失败",
                "error",
            );
        } finally {
            input.value = "";
        }
    }

    async function restoreBackup(filename: string) {
        if (
            !confirm(
                `确定要恢复备份「${filename}」吗？此操作会覆盖当前数据。`,
            )
        ) {
            return;
        }

        restoring = filename;

        try {
            const response = await fetch("/api/backups/restore", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer dev-secret-key",
                },
                body: JSON.stringify({ filename }),
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.error || "恢复失败");
            }

            showToast(`已恢复备份：${filename}`);

            // Reload page to reflect changes
            setTimeout(() => window.location.reload(), 1000);
        } catch (error) {
            showToast(
                error instanceof Error ? error.message : "恢复失败",
                "error",
            );
        } finally {
            restoring = null;
        }
    }

    async function deleteBackup(filename: string) {
        if (
            !confirm(
                `确定要删除备份「${filename}」吗？删除后无法找回。`,
            )
        ) {
            return;
        }

        deleting = filename;

        try {
            const response = await fetch(
                `/api/backups/${encodeURIComponent(filename)}`,
                {
                    method: "DELETE",
                    headers: {
                        Authorization: "Bearer dev-secret-key",
                    },
                },
            );

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.error || "删除失败");
            }

            backups = backups.filter(
                (b: { filename: string }) => b.filename !== filename,
            );
            showToast(`已删除备份：${filename}`);
        } catch (error) {
            showToast(
                error instanceof Error ? error.message : "删除失败",
                "error",
            );
        } finally {
            deleting = null;
        }
    }
</script>

<div class="page">
    <div class="container">
        <header class="page-header">
            <div class="header-content">
                <h1 class="page-header-title">数据备份与迁移</h1>
                <p class="page-header-description">
                    导出归档、快速导入，并在需要时恢复任意历史快照
                </p>
            </div>
        </header>

        <div class="stats-grid">
            <div class="stat-card fade-in">
                <div class="stat-icon">数量</div>
                <div class="stat-info">
                    <div class="stat-value">{backups.length}</div>
                    <div class="stat-label">备份文件</div>
                </div>
            </div>
            <div class="stat-card fade-in" style="animation-delay: 100ms">
                <div class="stat-icon">容量</div>
                <div class="stat-info">
                    <div class="stat-value">{totalSizeLabel}</div>
                    <div class="stat-label">占用空间</div>
                </div>
            </div>
        </div>

        <section class="card section-card mb-xl fade-in">
            <div class="section-header">
                <div>
                    <h2 class="section-title">导入 / 导出</h2>
                    <p class="section-description">
                        将全部提示导出为 JSON，或从备份文件中恢复
                    </p>
                </div>
            </div>

            <div class="action-buttons">
                <button class="btn btn-primary btn-lg" onclick={handleExport}>
                    导出全部数据
                </button>

                <label class="btn btn-secondary btn-lg">
                    导入 JSON
                    <input
                        type="file"
                        accept=".json"
                        onchange={handleImport}
                        style="display: none"
                    />
                </label>
            </div>
        </section>

        <section class="card section-card fade-in" style="animation-delay: 150ms">
            <div class="section-header">
                <div>
                    <h2 class="section-title">备份清单</h2>
                    <p class="section-description">
                        每次导入前会自动保存最新快照，支持随时恢复
                    </p>
                </div>
            </div>

            {#if backups.length === 0}
                <div class="empty-state">
                    <div class="empty-state-icon">备</div>
                    <div class="empty-state-title">暂无备份</div>
                    <p class="empty-state-description">
                        首次导入数据时系统会自动生成一份备份文件。
                    </p>
                </div>
            {:else}
                <div class="backup-list">
                    {#each backups as backup, i (backup.filename)}
                        <div class="backup-item fade-in" style="animation-delay: {200 + i * 50}ms">
                            <div class="backup-icon">档</div>
                            <div class="backup-info">
                                <span class="backup-name">{backup.filename}</span>
                                <div class="backup-meta">
                                    <span class="backup-meta-item">
                                        大小：{formatSize(backup.size)}
                                    </span>
                                    <span class="backup-meta-item">
                                        时间：{formatDate(backup.createdAt)}
                                    </span>
                                </div>
                            </div>
                            <div class="backup-actions">
                                <button
                                    class="btn btn-secondary btn-sm"
                                    onclick={() => restoreBackup(backup.filename)}
                                    disabled={restoring === backup.filename}
                                >
                                    {#if restoring === backup.filename}
                                        恢复中…
                                    {:else}
                                        恢复
                                    {/if}
                                </button>
                                <button
                                    class="btn btn-danger btn-sm"
                                    onclick={() => deleteBackup(backup.filename)}
                                    disabled={deleting === backup.filename}
                                >
                                    {#if deleting === backup.filename}
                                        删除中…
                                    {:else}
                                        删除
                                    {/if}
                                </button>
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}
        </section>
    </div>
</div>

{#if toastVisible}
    <div
        class="toast fade-in"
        class:toast-success={toastType === "success"}
        class:toast-error={toastType === "error"}
        role="status"
    >
        {toastMessage}
    </div>
{/if}

<style>
    .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: var(--space-lg);
        margin-bottom: var(--space-2xl);
    }

    .stat-card {
        display: flex;
        align-items: center;
        gap: var(--space-md);
    }

    .stat-info {
        display: flex;
        flex-direction: column;
    }

    .section-card {
        padding: var(--space-xl);
    }

    .section-header {
        margin-bottom: var(--space-xl);
    }

    .section-title {
        font-size: var(--font-size-xl);
        font-weight: var(--font-weight-semibold);
        margin-bottom: var(--space-xs);
    }

    .section-description {
        color: var(--color-text-muted);
        margin: 0;
    }

    .action-buttons {
        display: flex;
        gap: var(--space-md);
        flex-wrap: wrap;
    }

    .backup-list {
        display: flex;
        flex-direction: column;
        gap: var(--space-md);
    }

    .backup-item {
        display: flex;
        align-items: center;
        gap: var(--space-md);
        padding: var(--space-lg);
        background: var(--color-bg);
        border: 1px solid var(--color-border-light);
        border-radius: var(--radius-lg);
        transition: all var(--transition-fast);
    }

    .backup-item:hover {
        border-color: var(--color-border);
        box-shadow: var(--shadow-sm);
    }

    .backup-icon {
        width: 44px;
        height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--color-primary-light);
        border-radius: var(--radius-md);
        font-size: var(--font-size-xl);
        flex-shrink: 0;
    }

    .backup-info {
        flex: 1;
        min-width: 0;
    }

    .backup-name {
        display: block;
        font-family: var(--font-family-mono);
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
        color: var(--color-text);
        margin-bottom: var(--space-xs);
    }

    .backup-meta {
        display: flex;
        gap: var(--space-lg);
        flex-wrap: wrap;
    }

    .backup-meta-item {
        display: flex;
        align-items: center;
        gap: var(--space-xs);
        font-size: var(--font-size-xs);
        color: var(--color-text-muted);
    }

    .backup-actions {
        display: flex;
        gap: var(--space-sm);
        flex-shrink: 0;
    }

    .mb-xl {
        margin-bottom: var(--space-xl);
    }

    @media (max-width: 768px) {
        .backup-item {
            flex-direction: column;
            align-items: flex-start;
        }

        .backup-actions {
            width: 100%;
            margin-top: var(--space-sm);
        }

        .backup-actions .btn {
            flex: 1;
        }
    }
</style>
