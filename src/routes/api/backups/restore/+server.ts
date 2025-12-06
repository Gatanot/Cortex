import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { getDatabasePath } from '$lib/server/db';
import fs from 'fs';
import path from 'path';

const BACKUP_DIR = env.BACKUP_DIR || 'backups';

function isValidFilename(filename: string): boolean {
    // Prevent path traversal
    if (!filename ||
        filename.includes('..') ||
        filename.includes('/') ||
        filename.includes('\\') ||
        !filename.endsWith('.db')) {
        return false;
    }
    return true;
}

export const POST: RequestHandler = async ({ request }) => {
    try {
        const data = await request.json();
        const { filename } = data;

        if (!isValidFilename(filename)) {
            return json({ error: 'Invalid filename' }, { status: 400 });
        }

        const backupPath = path.join(BACKUP_DIR, filename);

        if (!fs.existsSync(backupPath)) {
            return json({ error: 'Backup file not found' }, { status: 404 });
        }

        const dbPath = getDatabasePath();

        // Copy backup to database location
        fs.copyFileSync(backupPath, dbPath);

        return json({ success: true, restored: filename });
    } catch (error) {
        console.error('Error restoring backup:', error);
        return json({ error: 'Failed to restore backup' }, { status: 500 });
    }
};
