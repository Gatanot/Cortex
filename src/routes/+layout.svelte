<script lang="ts">
    import '../app.css';
    import { page } from '$app/state';
    import { browser } from '$app/environment';

    let { children } = $props();
    
    let theme = $state<'light' | 'dark'>('light');
    
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

    function isActive(path: string): boolean {
        if (path === '/') {
            return page.url.pathname === '/';
        }
        return page.url.pathname.startsWith(path);
    }
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
            <a href="/backups" class="nav-link" class:active={isActive('/backups')}>
                <span>💾</span> Backups
            </a>
        </div>
        
        <div class="nav-actions">
            <a href="/prompts/new" class="btn btn-primary btn-sm">
                <span>＋</span> New
            </a>
            <button class="theme-toggle" onclick={toggleTheme} aria-label="Toggle theme">
                {theme === 'light' ? '🌙' : '☀️'}
            </button>
        </div>
    </div>
</nav>

<main>
    {@render children()}
</main>

<style>
    main {
        min-height: calc(100vh - var(--nav-height));
    }
</style>
