import type { Handle } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';

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

export const handle: Handle = async ({ event, resolve }) => {
    const { pathname } = event.url;
    const method = event.request.method;

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
            const authHeader = event.request.headers.get('Authorization');

            if (!authHeader) {
                return json({ error: 'Authorization header required' }, { status: 401 });
            }

            const [type, token] = authHeader.split(' ');

            if (type !== 'Bearer' || token !== API_SECRET) {
                return json({ error: 'Invalid API key' }, { status: 403 });
            }
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

    return resolve(event);
};
