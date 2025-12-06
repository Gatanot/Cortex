import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { updateAnalysisResults } from '$lib/server/db';

export const PATCH: RequestHandler = async ({ request }) => {
    try {
        const results = await request.json();

        if (!Array.isArray(results)) {
            return json({ error: 'Expected array of results' }, { status: 400 });
        }

        // Validate each result
        for (const result of results) {
            if (typeof result.id !== 'number' ||
                typeof result.algo_category !== 'string' ||
                typeof result.pos_x !== 'number' ||
                typeof result.pos_y !== 'number') {
                return json({
                    error: 'Each result must have id (number), algo_category (string), pos_x (number), pos_y (number)'
                }, { status: 400 });
            }
        }

        updateAnalysisResults(results);

        return json({ success: true, updated: results.length });
    } catch (error) {
        console.error('Error updating analysis results:', error);
        return json({ error: 'Failed to update analysis results' }, { status: 500 });
    }
};
