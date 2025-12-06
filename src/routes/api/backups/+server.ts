import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import fs from 'fs';
import path from 'path';

const BACKUP_DIR = env.BACKUP_DIR || 'backups';

function ensureBackupDir() {
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
}

interface BackupInfo {
    filename: string;
    size: number;
    createdAt: string;
}

export const GET: RequestHandler = async () => {
    try {
        ensureBackupDir();

        const files = fs.readdirSync(BACKUP_DIR);
        const backups: BackupInfo[] = files
            .filter(f => f.endsWith('.db'))
            .map(filename => {
                const filePath = path.join(BACKUP_DIR, filename);
                const stats = fs.statSync(filePath);
                return {
                    filename,
                    size: stats.size,
                    createdAt: stats.birthtime.toISOString()
                };
            })
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return json(backups);
    } catch (error) {
        console.error('Error listing backups:', error);
        return json({ error: 'Failed to list backups' }, { status: 500 });
    }
};
