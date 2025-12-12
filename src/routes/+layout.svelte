<script lang="ts">
    import '../app.css';
    import { page } from '$app/state';
    import { browser } from '$app/environment';

    let { children } = $props();
    
    let theme = $state<'light' | 'dark'>('light');
    let mobileMenuOpen = $state(false);
    
    // Initialize theme from localStorage
    $effect(() => {
        if (browser) {
            const saved = localStorage.getItem('theme') as 'light' | 'dark' | null;
            theme = saved || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
            document.documentElement.setAttribute('data-theme', theme);
        }
    });

    function toggleTheme() {
        theme = theme === 'light' ? 'dark' : 'light';
        localStorage.setItem('theme', theme);
        document.documentElement.setAttribute('data-theme', theme);
    }

    function toggleMobileMenu() {
        mobileMenuOpen = !mobileMenuOpen;
    }

    function closeMobileMenu() {
        mobileMenuOpen = false;
    }

    function isActive(path: string): boolean {
        if (path === '/') {
            return page.url.pathname === '/';
        }
        return page.url.pathname.startsWith(path);
    }

    // Close mobile menu on route change
    $effect(() => {
        page.url.pathname;
        mobileMenuOpen = false;
    });

    // Prevent body scroll when mobile menu is open
    $effect(() => {
        if (browser) {
            if (mobileMenuOpen) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = '';
            }
        }
    });
</script>

<svelte:head>
    <title>Cortex - Prompt Manager</title>
    <meta name="description" content="Lightweight, high-performance prompt management system" />
</svelte:head>

<nav class="nav">
    <div class="nav-container">
        <a href="/" class="nav-brand">Cortex</a>
        
        <div class="nav-links">
            <a href="/" class="nav-link" class:active={isActive('/')}>
                <span>📝</span> Prompts
            </a>
            <a href="/explorer" class="nav-link" class:active={isActive('/explorer')}>
                <span>🔬</span> Explorer
            </a>
            <a href="/upload" class="nav-link" class:active={isActive('/upload')}>
                <span>📁</span> Upload
            </a>
            <a href="/backups" class="nav-link" class:active={isActive('/backups')}>
                <span>💾</span> Backups
            </a>
        </div>
        
        <div class="nav-actions">
            <button class="theme-toggle" onclick={toggleTheme} aria-label="切换主题">
                {theme === 'light' ? '🌙' : '☀️'}
            </button>
            <button class="mobile-menu-toggle" onclick={toggleMobileMenu} aria-label="菜单">
                <span class="hamburger-icon" class:open={mobileMenuOpen}></span>
            </button>
        </div>
    </div>
</nav>

<!-- Mobile Menu Overlay -->
{#if mobileMenuOpen}
    <div class="mobile-menu-overlay" onclick={closeMobileMenu}></div>
{/if}

<!-- Mobile Menu -->
<div class="mobile-menu" class:open={mobileMenuOpen}>
    <div class="mobile-menu-header">
        <span class="mobile-menu-title">菜单</span>
        <button class="mobile-menu-close" onclick={closeMobileMenu} aria-label="关闭菜单">
            ✕
        </button>
    </div>
    <nav class="mobile-menu-nav">
        <a href="/" class="mobile-menu-link" class:active={isActive('/')}>
            <span class="mobile-menu-icon">📝</span>
            <span>Prompts</span>
        </a>
        <a href="/explorer" class="mobile-menu-link" class:active={isActive('/explorer')}>
            <span class="mobile-menu-icon">🔬</span>
            <span>Explorer</span>
        </a>
        <a href="/upload" class="mobile-menu-link" class:active={isActive('/upload')}>
            <span class="mobile-menu-icon">📁</span>
            <span>Upload</span>
        </a>
        <a href="/backups" class="mobile-menu-link" class:active={isActive('/backups')}>
            <span class="mobile-menu-icon">💾</span>
            <span>Backups</span>
        </a>
        <div class="mobile-menu-divider"></div>
        <a href="/prompts/new" class="mobile-menu-link mobile-menu-action">
            <span class="mobile-menu-icon">＋</span>
            <span>新建提示</span>
        </a>
    </nav>
</div>

<main>
    {@render children()}
</main>

<style>
    main {
        min-height: calc(100vh - var(--nav-height));
    }

    .mobile-menu-toggle {
        display: none;
        width: 40px;
        height: 40px;
        padding: 8px;
        border: none;
        background: transparent;
        cursor: pointer;
        border-radius: var(--radius-md);
        transition: background-color var(--transition-fast);
    }

    .mobile-menu-toggle:hover {
        background: var(--color-bg-tertiary);
    }

    .hamburger-icon {
        display: block;
        width: 24px;
        height: 2px;
        background: var(--color-text);
        position: relative;
        transition: background-color var(--transition-fast);
    }

    .hamburger-icon::before,
    .hamburger-icon::after {
        content: '';
        position: absolute;
        width: 24px;
        height: 2px;
        background: var(--color-text);
        left: 0;
        transition: transform var(--transition-normal);
    }

    .hamburger-icon::before {
        top: -7px;
    }

    .hamburger-icon::after {
        top: 7px;
    }

    .hamburger-icon.open {
        background-color: transparent;
    }

    .hamburger-icon.open::before {
        transform: rotate(45deg);
        top: 0;
    }

    .hamburger-icon.open::after {
        transform: rotate(-45deg);
        top: 0;
    }

    .mobile-menu-overlay {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 200;
        backdrop-filter: blur(4px);
    }

    .mobile-menu {
        position: fixed;
        top: 0;
        right: -100%;
        width: min(320px, 85vw);
        height: 100vh;
        background: var(--color-bg);
        border-left: 1px solid var(--color-border);
        z-index: 201;
        transition: right var(--transition-normal);
        display: flex;
        flex-direction: column;
        box-shadow: var(--shadow-xl);
    }

    .mobile-menu.open {
        right: 0;
    }

    .mobile-menu-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--space-lg) var(--space-xl);
        border-bottom: 1px solid var(--color-border);
    }

    .mobile-menu-title {
        font-size: var(--font-size-lg);
        font-weight: var(--font-weight-semibold);
        color: var(--color-text);
    }

    .mobile-menu-close {
        width: 36px;
        height: 36px;
        border: none;
        background: transparent;
        color: var(--color-text-secondary);
        font-size: var(--font-size-xl);
        cursor: pointer;
        border-radius: var(--radius-md);
        transition: all var(--transition-fast);
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .mobile-menu-close:hover {
        background: var(--color-bg-tertiary);
        color: var(--color-text);
    }

    .mobile-menu-nav {
        flex: 1;
        padding: var(--space-lg) 0;
        overflow-y: auto;
    }

    .mobile-menu-link {
        display: flex;
        align-items: center;
        gap: var(--space-md);
        padding: var(--space-md) var(--space-xl);
        color: var(--color-text);
        text-decoration: none;
        font-size: var(--font-size-md);
        font-weight: var(--font-weight-medium);
        transition: all var(--transition-fast);
        border-left: 3px solid transparent;
    }

    .mobile-menu-link:hover {
        background: var(--color-bg-tertiary);
    }

    .mobile-menu-link.active {
        background: var(--color-primary-light);
        color: var(--color-primary);
        border-left-color: var(--color-primary);
    }

    .mobile-menu-link.mobile-menu-action {
        background: var(--color-primary);
        color: white;
        margin: var(--space-md) var(--space-lg);
        padding: var(--space-md) var(--space-lg);
        border-radius: var(--radius-md);
        border-left: none;
        font-weight: var(--font-weight-semibold);
    }

    .mobile-menu-link.mobile-menu-action:hover {
        background: var(--color-primary-hover);
    }

    .mobile-menu-icon {
        font-size: var(--font-size-lg);
        width: 28px;
        text-align: center;
    }

    .mobile-menu-divider {
        height: 1px;
        background: var(--color-border);
        margin: var(--space-lg) var(--space-xl);
    }

    @media (max-width: 768px) {
        .mobile-menu-toggle {
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .mobile-menu-overlay {
            display: block;
        }
    }
</style>
