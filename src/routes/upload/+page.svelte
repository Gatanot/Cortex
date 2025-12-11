<script lang="ts">
    import { enhance } from '$app/forms';
    import type { PageData, ActionData } from './$types';

    let { data, form }: { data: PageData; form: ActionData } = $props();
    
    let uploading = $state(false);
    let selectedFile: File | null = $state(null);
    let dragActive = $state(false);
    let formElement: HTMLFormElement | null = $state(null);

    function handleDragEnter(e: DragEvent) {
        e.preventDefault();
        dragActive = true;
    }

    function handleDragLeave(e: DragEvent) {
        e.preventDefault();
        dragActive = false;
    }

    function handleDragOver(e: DragEvent) {
        e.preventDefault();
    }

    function handleDrop(e: DragEvent) {
        e.preventDefault();
        dragActive = false;
        
        const files = e.dataTransfer?.files;
        if (files && files.length > 0) {
            selectedFile = files[0];
            // 自动触发上传
            setTimeout(() => {
                if (formElement && !uploading) {
                    formElement.requestSubmit();
                }
            }, 100);
        }
    }

    function handleFileSelect(e: Event) {
        const target = e.target as HTMLInputElement;
        if (target.files && target.files.length > 0) {
            selectedFile = target.files[0];
            // 自动触发上传
            setTimeout(() => {
                if (formElement && !uploading) {
                    formElement.requestSubmit();
                }
            }, 100);
        }
    }

    function formatBytes(bytes: number): string {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
    }
</script>

<div class="page">
    <div class="container">
        <header class="page-header">
            <div class="header-content">
                <h1 class="page-header-title">文件上传中心</h1>
                <p class="page-header-description">
                    临时文件存储，支持拖拽上传，12小时后自动清理
                </p>
            </div>
        </header>

        <!-- Upload Form -->
        <div class="card upload-card">
            <form 
                bind:this={formElement}
                method="POST" 
                action="?/upload" 
                enctype="multipart/form-data"
                use:enhance={() => {
                    uploading = true;
                    return async ({ update }) => {
                        await update();
                        uploading = false;
                        selectedFile = null;
                    };
                }}
            >
                <div 
                    role="button"
                    tabindex="0"
                    class="upload-dropzone {dragActive ? 'active' : ''}"
                    ondragenter={handleDragEnter}
                    ondragleave={handleDragLeave}
                    ondragover={handleDragOver}
                    ondrop={handleDrop}
                >
                    <input
                        type="file"
                        name="file"
                        id="file"
                        class="visually-hidden"
                        onchange={handleFileSelect}
                        required
                    />
                    
                    <div class="dropzone-content">
                        {#if uploading}
                            <div class="file-uploading">
                                <div class="spinner"></div>
                                <div class="file-info">
                                    <p class="file-name">{selectedFile?.name || '上传中...'}</p>
                                    <p class="upload-status">正在上传到服务器...</p>
                                </div>
                            </div>
                        {:else if selectedFile}
                            <div class="file-selected">
                                <div class="success-icon">✓</div>
                                <div class="file-info">
                                    <p class="file-name">{selectedFile.name}</p>
                                    <p class="file-size">{formatBytes(selectedFile.size)}</p>
                                </div>
                            </div>
                        {:else}
                            <div class="upload-prompt">
                                <div class="upload-icon">📤</div>
                                <p class="upload-text">拖拽文件到此处</p>
                                <p class="upload-divider">或</p>
                                <label for="file" class="upload-button">
                                    点击选择文件
                                </label>
                                <p class="upload-hint">文件选择后将自动上传</p>
                            </div>
                        {/if}
                    </div>
                </div>

                <div class="upload-info">
                    <div class="info-item">
                        <span class="info-icon">📏</span>
                        <span>单文件最大 100MB</span>
                    </div>
                    <div class="info-item">
                        <span class="info-icon">💾</span>
                        <span>总容量限制 20GB</span>
                    </div>
                    <div class="info-item">
                        <span class="info-icon">⏱️</span>
                        <span>保留 12 小时</span>
                    </div>
                </div>

                {#if uploading}
                    <div class="alert alert-info">
                        <span class="alert-icon">⏳</span>
                        <span>正在上传文件...</span>
                    </div>
                {/if}

                {#if form?.error}
                    <div class="alert alert-danger">
                        <span class="alert-icon">⚠️</span>
                        <span>{form.error}</span>
                    </div>
                {/if}

                {#if form?.success}
                    <div class="alert alert-success">
                        <span class="alert-icon">✓</span>
                        <span>文件上传成功: {form.filename}</span>
                    </div>
                {/if}

                <!-- Hidden submit button for form submission -->
                <button type="submit" class="visually-hidden" aria-hidden="true"></button>
            </form>
        </div>

        <!-- File List -->
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">已上传文件</h2>
                {#if data.files.length > 0}
                    <div class="file-count">
                        共 {data.files.length} 个文件
                    </div>
                {/if}
            </div>

            {#if data.files.length === 0}
                <div class="empty-state">
                    <div class="empty-icon">📂</div>
                    <p class="empty-text">暂无文件</p>
                    <p class="empty-hint">上传的文件将显示在这里</p>
                </div>
            {:else}
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>文件名</th>
                                <th>大小</th>
                                <th>上传时间</th>
                                <th>剩余时间</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {#each data.files as file}
                                <tr class:expired={file.isExpired}>
                                    <td>
                                        <div class="file-cell">
                                            <span class="file-icon">📄</span>
                                            <span class="file-name-text">{file.name}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span class="file-size-badge">{file.sizeFormatted}</span>
                                    </td>
                                    <td class="text-muted">{file.uploadTimeFormatted}</td>
                                    <td>
                                        <span class="time-badge {file.isExpired ? 'expired' : ''}">
                                            {file.remainingTimeFormatted}
                                        </span>
                                    </td>
                                    <td>
                                        <div class="action-buttons">
                                            <a
                                                href="/api/file/{encodeURIComponent(file.name)}"
                                                class="btn btn-sm btn-secondary"
                                                download
                                            >
                                                <span>⬇️</span>
                                                <span>下载</span>
                                            </a>
                                            <form 
                                                method="POST" 
                                                action="?/delete" 
                                                use:enhance
                                                class="inline-form"
                                            >
                                                <input type="hidden" name="filename" value={file.name} />
                                                <button
                                                    type="submit"
                                                    class="btn btn-sm btn-danger"
                                                    onclick={(e) => {
                                                        if (!confirm('确定要删除此文件吗？')) {
                                                            e.preventDefault();
                                                        }
                                                    }}
                                                >
                                                    <span>🗑️</span>
                                                    <span>删除</span>
                                                </button>
                                            </form>
                                        </div>
                                    </td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            {/if}
        </div>
    </div>
</div>

<style>
    .upload-card {
        margin-bottom: var(--space-xl);
    }

    .upload-dropzone {
        border: 2px dashed var(--color-border);
        border-radius: var(--radius-lg);
        padding: var(--space-2xl);
        text-align: center;
        transition: all var(--transition-normal);
        cursor: pointer;
        background: var(--color-bg-secondary);
    }

    .upload-dropzone:hover,
    .upload-dropzone.active {
        border-color: var(--color-primary);
        background: var(--color-primary-light);
    }

    .dropzone-content {
        min-height: 200px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .file-selected {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--space-md);
    }

    .success-icon {
        width: 64px;
        height: 64px;
        background: var(--color-success);
        color: white;
        border-radius: var(--radius-full);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 2rem;
        font-weight: bold;
        animation: scaleIn 0.3s ease-out;
    }

    .file-info {
        text-align: center;
    }

    .file-name {
        font-size: var(--font-size-lg);
        font-weight: var(--font-weight-medium);
        color: var(--color-text);
        margin: 0 0 var(--space-xs) 0;
    }

    .file-size {
        font-size: var(--font-size-sm);
        color: var(--color-text-muted);
        margin: 0;
    }

    .upload-prompt {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--space-md);
    }

    .upload-icon {
        font-size: 4rem;
        opacity: 0.6;
    }

    .upload-text {
        font-size: var(--font-size-lg);
        color: var(--color-text-secondary);
        margin: 0;
    }

    .upload-divider {
        font-size: var(--font-size-sm);
        color: var(--color-text-muted);
        margin: var(--space-sm) 0;
    }

    .upload-button {
        display: inline-block;
        padding: var(--space-sm) var(--space-lg);
        background: var(--color-primary);
        color: white;
        border-radius: var(--radius-md);
        font-weight: var(--font-weight-medium);
        cursor: pointer;
        transition: all var(--transition-fast);
    }

    .upload-button:hover {
        background: var(--color-primary-hover);
        transform: translateY(-2px);
        box-shadow: var(--shadow-md);
    }

    .upload-hint {
        font-size: var(--font-size-xs);
        color: var(--color-text-muted);
        margin-top: var(--space-md);
        font-style: italic;
    }

    .file-uploading {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--space-lg);
    }

    .spinner {
        width: 48px;
        height: 48px;
        border: 4px solid var(--color-border-light);
        border-top-color: var(--color-primary);
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }

    .upload-status {
        font-size: var(--font-size-sm);
        color: var(--color-primary);
        margin: 0;
        font-weight: var(--font-weight-medium);
    }

    .alert-info {
        background: var(--color-info-light);
        color: var(--color-info);
        border-color: var(--color-info);
    }

    .upload-info {
        display: flex;
        gap: var(--space-lg);
        padding: var(--space-lg);
        background: var(--color-bg-tertiary);
        border-radius: var(--radius-md);
        margin-top: var(--space-lg);
        flex-wrap: wrap;
    }

    .info-item {
        display: flex;
        align-items: center;
        gap: var(--space-xs);
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
    }

    .info-icon {
        font-size: 1rem;
    }

    .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--space-lg);
        padding-bottom: var(--space-md);
        border-bottom: 1px solid var(--color-border-light);
    }

    .file-count {
        font-size: var(--font-size-sm);
        color: var(--color-text-muted);
        background: var(--color-bg-tertiary);
        padding: var(--space-xs) var(--space-md);
        border-radius: var(--radius-full);
    }

    .empty-state {
        text-align: center;
        padding: var(--space-3xl) var(--space-lg);
    }

    .empty-icon {
        font-size: 4rem;
        margin-bottom: var(--space-lg);
        opacity: 0.4;
    }

    .empty-text {
        font-size: var(--font-size-lg);
        color: var(--color-text-secondary);
        margin: 0 0 var(--space-sm) 0;
    }

    .empty-hint {
        font-size: var(--font-size-sm);
        color: var(--color-text-muted);
        margin: 0;
    }

    .table-container {
        overflow-x: auto;
    }

    .data-table {
        width: 100%;
        border-collapse: collapse;
    }

    .data-table th {
        text-align: left;
        padding: var(--space-md);
        font-size: var(--font-size-xs);
        font-weight: var(--font-weight-semibold);
        color: var(--color-text-muted);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        border-bottom: 1px solid var(--color-border-light);
    }

    .data-table td {
        padding: var(--space-md);
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
        border-bottom: 1px solid var(--color-border-light);
    }

    .data-table tr:last-child td {
        border-bottom: none;
    }

    .data-table tr:hover {
        background: var(--color-bg-tertiary);
    }

    .data-table tr.expired {
        opacity: 0.5;
    }

    .file-cell {
        display: flex;
        align-items: center;
        gap: var(--space-sm);
    }

    .file-icon {
        font-size: 1.25rem;
    }

    .file-name-text {
        font-weight: var(--font-weight-medium);
        color: var(--color-text);
    }

    .file-size-badge {
        display: inline-block;
        padding: var(--space-xs) var(--space-sm);
        background: var(--color-bg-tertiary);
        border-radius: var(--radius-sm);
        font-size: var(--font-size-xs);
        font-weight: var(--font-weight-medium);
    }

    .text-muted {
        color: var(--color-text-muted) !important;
    }

    .time-badge {
        display: inline-block;
        padding: var(--space-xs) var(--space-sm);
        background: var(--color-info-light);
        color: var(--color-info);
        border-radius: var(--radius-sm);
        font-size: var(--font-size-xs);
        font-weight: var(--font-weight-medium);
    }

    .time-badge.expired {
        background: var(--color-danger-light);
        color: var(--color-danger);
    }

    .action-buttons {
        display: flex;
        gap: var(--space-sm);
    }

    .inline-form {
        display: inline;
    }

    .btn-sm {
        padding: var(--space-xs) var(--space-sm);
        font-size: var(--font-size-xs);
        display: inline-flex;
        align-items: center;
        gap: var(--space-xs);
    }

    .btn-danger {
        background: var(--color-danger);
        color: white;
    }

    .btn-danger:hover {
        background: var(--color-danger);
        filter: brightness(1.1);
    }

    .visually-hidden {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border-width: 0;
    }

    @keyframes scaleIn {
        from {
            transform: scale(0);
        }
        to {
            transform: scale(1);
        }
    }
</style>
