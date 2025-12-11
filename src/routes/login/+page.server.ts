import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { verifyPassword, createSession } from '$lib/server/sessionUtils';

export const actions = {
    login: async ({ request, cookies, url }) => {
        const data = await request.formData();
        const password = data.get('password') as string;

        if (!password) {
            return fail(400, {
                error: '请输入密码',
                missing: true
            });
        }

        if (!verifyPassword(password)) {
            return fail(403, {
                error: '密码错误',
                incorrect: true
            });
        }

        // Create session
        createSession(cookies);

        // Redirect to original page or home
        const redirectTo = url.searchParams.get('redirect') || '/';
        throw redirect(303, redirectTo);
    }
} satisfies Actions;
