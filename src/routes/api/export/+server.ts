import type { RequestHandler } from './$types';
import { getAllPromptsWithBlocks } from '$lib/server/db';

export const GET: RequestHandler = async () => {
    const prompts = getAllPromptsWithBlocks();

    const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        prompts: prompts.map(p => ({
            title: p.title,
            user_category: p.user_category,
            algo_category: p.algo_category,
            pos_x: p.pos_x,
            pos_y: p.pos_y,
            blocks: p.blocks.map(b => b.content)
        }))
    };

    return new Response(JSON.stringify(exportData, null, 2), {
        headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="cortex-export-${new Date().toISOString().split('T')[0]}.json"`
        }
    });
};
