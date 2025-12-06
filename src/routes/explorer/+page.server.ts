import type { PageServerLoad } from './$types';
import { getPromptsWithCoordinates, getAlgoCategories } from '$lib/server/db';

export const load: PageServerLoad = async () => {
    const prompts = getPromptsWithCoordinates();
    const categories = getAlgoCategories();

    return {
        prompts,
        categories
    };
};
