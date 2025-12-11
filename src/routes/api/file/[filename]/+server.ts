import { error } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { sanitizeFilename, fileExists, getFilePath } from '$lib/server/fileUtils';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';

export const GET: RequestHandler = async ({ params }) => {
    const filename = params.filename;

    if (!filename) {
        throw error(400, '文件名不能为空');
    }

    // Sanitize filename to prevent path traversal
    const sanitizedName = sanitizeFilename(filename);
    
    // Check if file exists
    const exists = await fileExists(sanitizedName);
    if (!exists) {
        throw error(404, '文件不存在');
    }

    const filePath = getFilePath(sanitizedName);

    try {
        // Get file stats
        const stats = await stat(filePath);
        
        // Create read stream
        const stream = createReadStream(filePath);

        // Return stream as response
        return new Response(stream as any, {
            headers: {
                'Content-Type': 'application/octet-stream',
                'Content-Disposition': `attachment; filename="${encodeURIComponent(sanitizedName)}"`,
                'Content-Length': stats.size.toString()
            }
        });
    } catch (err) {
        console.error('File download error:', err);
        throw error(500, '文件下载失败');
    }
};
