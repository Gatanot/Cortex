import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { getAllPromptsWithBlocks, createPrompt } from '$lib/server/db';

export const GET: RequestHandler = async () => {
    const prompts = getAllPromptsWithBlocks();
    return json(prompts);
};

export const POST: RequestHandler = async ({ request }) => {
    try {
        const data = await request.json();
        const { title, user_category, blocks } = data;

        if (!title || typeof title !== 'string' || title.trim() === '') {
            return json({ error: 'Title is required' }, { status: 400 });
        }

        if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
            return json({ error: 'At least one block is required' }, { status: 400 });
        }

        const id = createPrompt(
            title.trim(),
            user_category?.trim() || null,
            blocks.map((b: string) => b.trim()).filter((b: string) => b)
        );

        return json({ id }, { status: 201 });
    } catch (error) {
        console.error('Error creating prompt:', error);
        return json({ error: 'Failed to create prompt' }, { status: 500 });
    }
};
