import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
    const response = await fetch('/api/backups');
    const backups = await response.json();

    return { backups };
};
