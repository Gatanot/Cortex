// Load .env into process.env at runtime when present (useful for simple deployments)
// NOTE: in production it's recommended to set environment variables in the host/service
// instead of relying on a repository .env file.
import 'dotenv/config';
import type { Handle } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import { cleanupExpiredFiles } from '$lib/server/fileUtils';

// Diagnostic: Log environment variable status on startup
console.log('=== Cortex Environment Variables Status ===');
console.log('NODE_ENV:', process.env.NODE_ENV || 'not set');
console.log('API_SECRET exists:', !!env.API_SECRET);
console.log('Working directory:', process.cwd());
console.log('==========================================');

const API_SECRET = env.API_SECRET || 'dev-secret-key';

// Protected routes that require API key authentication
const PROTECTED_METHODS = ['POST', 'PUT', 'DELETE', 'PATCH'];
const PROTECTED_PATHS = [
    '/api/prompts/analysis-results',
    '/api/import'
];

// Paths that require API key for any method
const ALWAYS_PROTECTED_PATHS = [
    '/api/prompts/analysis-results',
    '/api/import'
];

// Static resources and public paths that don't require authentication
const PUBLIC_PATHS = [
    '/_app',
    '/favicon.ico',
    '/robots.txt'
];

// Initialize file cleanup daemon (runs every hour)
let cleanupInterval: NodeJS.Timeout | null = null;

function startCleanupDaemon() {
    if (cleanupInterval) return;

    // Run cleanup immediately on startup
    cleanupExpiredFiles().then(count => {
        if (count > 0) {
            console.log(`[Startup] Cleaned up ${count} expired files`);
        }
    });

    // Then run every hour
    cleanupInterval = setInterval(async () => {
        const count = await cleanupExpiredFiles();
        if (count > 0) {
            console.log(`[Scheduled] Cleaned up ${count} expired files`);
        }
    }, 60 * 60 * 1000); // 1 hour
}

// Start the cleanup daemon
startCleanupDaemon();

export const handle: Handle = async ({ event, resolve }) => {
    const { pathname } = event.url;
    const method = event.request.method;

    // 1. Static resources exemption - allow without authentication
    const isPublicPath = PUBLIC_PATHS.some(path => pathname.startsWith(path));
    if (isPublicPath) {
        return resolve(event);
    }

    // 2. API exemption - check for Bearer token (for Python scripts)
    const authHeader = event.request.headers.get('Authorization');
    if (authHeader) {
        const [type, token] = authHeader.split(' ');
        if (type === 'Bearer' && token === API_SECRET) {
            // API key is valid, allow access
            return resolve(event);
        }
    }

    // Check if this is an API route that needs protection
    const isApiRoute = pathname.startsWith('/api/');

    if (isApiRoute) {
        // Check if path always requires authentication
        const alwaysProtected = ALWAYS_PROTECTED_PATHS.some(path => pathname.startsWith(path));

        // Check if method requires authentication for this path
        const methodProtected = PROTECTED_METHODS.includes(method) &&
            (pathname.startsWith('/api/prompts') ||
                pathname.startsWith('/api/backups') ||
                pathname.startsWith('/api/import'));

        if (alwaysProtected || methodProtected) {
            // For API routes, we've already checked Bearer token above
            // If we're here, it means no valid Bearer token was provided
            return json({ error: 'Authorization required' }, { status: 401 });
        }

        // Path traversal protection for backup routes
        if (pathname.includes('/api/backups/') && (method === 'DELETE' || method === 'POST')) {
            const pathParts = pathname.split('/');
            const filename = pathParts[pathParts.length - 1];

            if (filename && (filename.includes('..') || filename.includes('/') || filename.includes('\\'))) {
                return json({ error: 'Invalid filename' }, { status: 400 });
            }
        }
    }

    // 3. Allow all other requests - no session/password authentication required
    return resolve(event);
};
