import type { PageServerLoad } from './$types';
import { getCategories } from '$lib/server/db';

export const load: PageServerLoad = async () => {
    const categories = getCategories();
    return { categories };
};
