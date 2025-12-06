import type { PageServerLoad } from './$types';
import { getAllPromptsWithBlocks, getCategories, getAlgoCategories } from '$lib/server/db';

export const load: PageServerLoad = async () => {
    const prompts = getAllPromptsWithBlocks();
    const userCategories = getCategories();
    const algoCategories = getAlgoCategories();

    return {
        prompts,
        userCategories,
        algoCategories
    };
};
