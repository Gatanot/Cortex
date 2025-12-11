<script lang="ts">
    import { enhance } from '$app/forms';
    import type { ActionData } from './$types';

    let { form }: { form: ActionData } = $props();
</script>

<div class="page login-page">
    <div class="container">
        <div class="login-wrapper">
            <div class="login-card card">
                <div class="login-header">
                    <div class="login-icon">🔐</div>
                    <h1 class="login-title">欢迎回到 Cortex</h1>
                    <p class="login-subtitle">请输入密码以继续访问系统</p>
                </div>

                <form method="POST" action="?/login" use:enhance class="login-form">
                    <div class="form-group">
                        <label for="password" class="form-label">
                            <span class="label-icon">🔑</span>
                            <span>密码</span>
                        </label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            class="form-input"
                            placeholder="输入您的密码"
                            required
                        />
                    </div>

                    {#if form?.error}
                        <div class="alert alert-danger">
                            <span class="alert-icon">⚠️</span>
                            <span>{form.error}</span>
                        </div>
                    {/if}

                    <button type="submit" class="btn btn-primary btn-block">
                        <span>登录系统</span>
                        <span class="btn-arrow">→</span>
                    </button>
                </form>

                <div class="login-footer">
                    <p class="help-text">
                        <span class="help-icon">💡</span>
                        请使用系统管理员提供的密码登录
                    </p>
                </div>
            </div>
        </div>
    </div>
</div>

<style>
    /* 仅保留与布局和动画相关的局部样式，复用全局样式 (src/app.css) */
    .login-page {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: var(--space-lg);
    }

    .login-wrapper {
        width: 100%;
        max-width: 440px;
        margin: 0 auto; /* 在容器内水平居中 */
        animation: fadeInUp 0.45s ease-out;
    }

    /* 让卡片在登录页更突出（复用 .card 的基础样式） */
    .login-card {
        box-shadow: var(--shadow-card);
        border-color: var(--color-border);
    }

    .login-header {
        text-align: center;
        margin-bottom: var(--space-xl);
    }

    .login-icon {
        font-size: 3rem;
        margin-bottom: var(--space-md);
        animation: pulse 2s ease-in-out infinite;
    }

    .label-icon {
        margin-right: var(--space-sm);
    }

    .btn-arrow {
        margin-left: var(--space-sm);
        transition: transform var(--transition-fast);
    }

    .btn-primary:hover .btn-arrow {
        transform: translateX(4px);
    }

    @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(12px); }
        to { opacity: 1; transform: translateY(0); }
    }

    @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
    }
</style>
