import type { PageServerLoad } from './$types';
import { getPromptWithBlocks, getCategories } from '$lib/server/db';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
    const id = parseInt(params.id);

    if (isNaN(id)) {
        throw error(400, 'Invalid prompt ID');
    }

    const prompt = getPromptWithBlocks(id);

    if (!prompt) {
        throw error(404, 'Prompt not found');
    }

    const categories = getCategories();

    return {
        prompt,
        categories
    };
};
