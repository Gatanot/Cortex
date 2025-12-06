import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { getPromptWithBlocks, updatePrompt, deletePrompt } from '$lib/server/db';

export const GET: RequestHandler = async ({ params }) => {
    const id = parseInt(params.id);

    if (isNaN(id)) {
        return json({ error: 'Invalid prompt ID' }, { status: 400 });
    }

    const prompt = getPromptWithBlocks(id);

    if (!prompt) {
        return json({ error: 'Prompt not found' }, { status: 404 });
    }

    return json(prompt);
};

export const PUT: RequestHandler = async ({ params, request }) => {
    try {
        const id = parseInt(params.id);

        if (isNaN(id)) {
            return json({ error: 'Invalid prompt ID' }, { status: 400 });
        }

        const data = await request.json();
        const { title, user_category, blocks } = data;

        if (!title || typeof title !== 'string' || title.trim() === '') {
            return json({ error: 'Title is required' }, { status: 400 });
        }

        if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
            return json({ error: 'At least one block is required' }, { status: 400 });
        }

        const formattedBlocks = blocks.map((b: { content: string; sort_order: number }) => ({
            content: b.content.trim(),
            sort_order: b.sort_order
        })).filter((b: { content: string }) => b.content);

        updatePrompt(id, title.trim(), user_category?.trim() || null, formattedBlocks);

        return json({ success: true });
    } catch (error) {
        console.error('Error updating prompt:', error);
        return json({ error: 'Failed to update prompt' }, { status: 500 });
    }
};

export const DELETE: RequestHandler = async ({ params }) => {
    try {
        const id = parseInt(params.id);

        if (isNaN(id)) {
            return json({ error: 'Invalid prompt ID' }, { status: 400 });
        }

        deletePrompt(id);

        return json({ success: true });
    } catch (error) {
        console.error('Error deleting prompt:', error);
        return json({ error: 'Failed to delete prompt' }, { status: 500 });
    }
};
