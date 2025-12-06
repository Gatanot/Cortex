import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
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

export const DELETE: RequestHandler = async ({ params }) => {
    try {
        const { filename } = params;

        if (!isValidFilename(filename)) {
            return json({ error: 'Invalid filename' }, { status: 400 });
        }

        const backupPath = path.join(BACKUP_DIR, filename);

        if (!fs.existsSync(backupPath)) {
            return json({ error: 'Backup file not found' }, { status: 404 });
        }

        fs.unlinkSync(backupPath);

        return json({ success: true, deleted: filename });
    } catch (error) {
        console.error('Error deleting backup:', error);
        return json({ error: 'Failed to delete backup' }, { status: 500 });
    }
};
