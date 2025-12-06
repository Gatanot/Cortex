<script lang="ts">
    import type { PageProps } from "./$types";

    let { data }: PageProps = $props();

    let backups = $state(data.backups);
    let restoring = $state<string | null>(null);
    let deleting = $state<string | null>(null);
    let toastMessage = $state("");
    let toastVisible = $state(false);
    let toastType = $state<"success" | "error">("success");

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
        return new Date(isoString).toLocaleString();
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
                "Warning: Importing will replace ALL existing prompts. A backup will be created automatically. Continue?",
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
                throw new Error(result.error || "Import failed");
            }

            const result = await response.json();
            showToast(
                `Imported ${result.imported} prompts. Backup created: ${result.backupCreated}`,
            );

            // Refresh backup list
            const backupsResponse = await fetch("/api/backups");
            backups = await backupsResponse.json();
        } catch (error) {
            showToast(
                error instanceof Error ? error.message : "Import failed",
                "error",
            );
        } finally {
            input.value = "";
        }
    }

    async function restoreBackup(filename: string) {
        if (
            !confirm(
                `Are you sure you want to restore "${filename}"? This will replace the current database.`,
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
                throw new Error(result.error || "Restore failed");
            }

            showToast(`Restored backup: ${filename}`);

            // Reload page to reflect changes
            setTimeout(() => window.location.reload(), 1000);
        } catch (error) {
            showToast(
                error instanceof Error ? error.message : "Restore failed",
                "error",
            );
        } finally {
            restoring = null;
        }
    }

    async function deleteBackup(filename: string) {
        if (
            !confirm(
                `Are you sure you want to delete "${filename}"? This cannot be undone.`,
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
                throw new Error(result.error || "Delete failed");
            }

            backups = backups.filter(
                (b: { filename: string }) => b.filename !== filename,
            );
            showToast(`Deleted backup: ${filename}`);
        } catch (error) {
            showToast(
                error instanceof Error ? error.message : "Delete failed",
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
                <h1 class="page-header-title">💾 Backup Management</h1>
                <p class="page-header-description">
                    Manage your database backups and import/export data
                </p>
            </div>
        </header>

        <div class="stats-grid">
            <div class="stat-card fade-in">
                <div class="stat-icon">📦</div>
                <div class="stat-info">
                    <div class="stat-value">{backups.length}</div>
                    <div class="stat-label">Total Backups</div>
                </div>
            </div>
            <div class="stat-card fade-in" style="animation-delay: 100ms">
                <div class="stat-icon">📄</div>
                <div class="stat-info">
                    <div class="stat-value">{backups.reduce((acc, b) => acc + b.size, 0) > 1024 * 1024 ? (backups.reduce((acc, b) => acc + b.size, 0) / (1024 * 1024)).toFixed(1) + ' MB' : (backups.reduce((acc, b) => acc + b.size, 0) / 1024).toFixed(1) + ' KB'}</div>
                    <div class="stat-label">Total Size</div>
                </div>
            </div>
        </div>

        <section class="card section-card mb-xl fade-in">
            <div class="section-header">
                <div>
                    <h2 class="section-title">📤 Import / Export</h2>
                    <p class="section-description">
                        Export all prompts to JSON or import from a backup file
                    </p>
                </div>
            </div>

            <div class="action-buttons">
                <button class="btn btn-primary btn-lg" onclick={handleExport}>
                    <span>⬇️</span> Export All Data
                </button>

                <label class="btn btn-secondary btn-lg">
                    <span>⬆️</span> Import JSON
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
                    <h2 class="section-title">🗄️ Database Backups</h2>
                    <p class="section-description">
                        Backups are created automatically before imports
                    </p>
                </div>
            </div>

            {#if backups.length === 0}
                <div class="empty-state">
                    <div class="empty-state-icon">📁</div>
                    <div class="empty-state-title">No backups yet</div>
                    <p class="empty-state-description">
                        Backups will be created automatically when you import data
                    </p>
                </div>
            {:else}
                <div class="backup-list">
                    {#each backups as backup, i (backup.filename)}
                        <div class="backup-item fade-in" style="animation-delay: {200 + i * 50}ms">
                            <div class="backup-icon">📄</div>
                            <div class="backup-info">
                                <span class="backup-name">{backup.filename}</span>
                                <div class="backup-meta">
                                    <span class="backup-meta-item">
                                        <span>📊</span> {formatSize(backup.size)}
                                    </span>
                                    <span class="backup-meta-item">
                                        <span>📅</span> {formatDate(backup.createdAt)}
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
                                        <span class="animate-spin">⟳</span> Restoring...
                                    {:else}
                                        <span>↩️</span> Restore
                                    {/if}
                                </button>
                                <button
                                    class="btn btn-danger btn-sm"
                                    onclick={() => deleteBackup(backup.filename)}
                                    disabled={deleting === backup.filename}
                                >
                                    {#if deleting === backup.filename}
                                        <span class="animate-spin">⟳</span> Deleting...
                                    {:else}
                                        <span>🗑️</span> Delete
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
    >
        <span>{toastType === "success" ? "✓" : "✕"}</span>
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
