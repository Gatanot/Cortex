import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { getDatabase, getDatabasePath, createPrompt } from '$lib/server/db';
import fs from 'fs';
import path from 'path';

const BACKUP_DIR = env.BACKUP_DIR || 'backups';

function ensureBackupDir() {
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
}

function createBackup(): string {
    ensureBackupDir();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFilename = `backup-${timestamp}.db`;
    const backupPath = path.join(BACKUP_DIR, backupFilename);

    // Copy current database to backup
    const dbPath = getDatabasePath();
    fs.copyFileSync(dbPath, backupPath);

    return backupFilename;
}

interface ImportPrompt {
    title: string;
    user_category?: string | null;
    algo_category?: string | null;
    pos_x?: number | null;
    pos_y?: number | null;
    blocks: string[];
}

interface ImportData {
    version?: string;
    prompts: ImportPrompt[];
}

export const POST: RequestHandler = async ({ request }) => {
    try {
        const data: ImportData = await request.json();

        if (!data.prompts || !Array.isArray(data.prompts)) {
            return json({ error: 'Invalid import format: prompts array required' }, { status: 400 });
        }

        // Validate prompts
        for (const prompt of data.prompts) {
            if (!prompt.title || typeof prompt.title !== 'string') {
                return json({ error: 'Each prompt must have a title' }, { status: 400 });
            }
            if (!prompt.blocks || !Array.isArray(prompt.blocks) || prompt.blocks.length === 0) {
                return json({ error: 'Each prompt must have at least one block' }, { status: 400 });
            }
        }

        // Create backup before import
        const backupFilename = createBackup();

        // Clear existing data
        const db = getDatabase();
        db.exec('DELETE FROM prompt_blocks');
        db.exec('DELETE FROM prompts');

        // Import new data
        for (const prompt of data.prompts) {
            const id = createPrompt(
                prompt.title,
                prompt.user_category || null,
                prompt.blocks
            );

            // Update algo_category and coordinates if provided
            if (prompt.algo_category || prompt.pos_x !== undefined || prompt.pos_y !== undefined) {
                db.prepare(`
                    UPDATE prompts SET algo_category = ?, pos_x = ?, pos_y = ? WHERE id = ?
                `).run(
                    prompt.algo_category || null,
                    prompt.pos_x ?? null,
                    prompt.pos_y ?? null,
                    id
                );
            }
        }

        return json({
            success: true,
            imported: data.prompts.length,
            backupCreated: backupFilename
        });
    } catch (error) {
        console.error('Import error:', error);
        return json({ error: 'Failed to import data' }, { status: 500 });
    }
};
