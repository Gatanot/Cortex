import { fail } from '@sveltejs/kit';
import type { Actions } from '@sveltejs/kit';
import { 
    getFileList, 
    ensureUploadDir, 
    sanitizeFilename, 
    hasEnoughSpace,
    MAX_FILE_SIZE,
    getFilePath
} from '$lib/server/fileUtils';
import { createWriteStream } from 'fs';
import { unlink } from 'fs/promises';

export const load = async () => {
    await ensureUploadDir();
    const files = await getFileList();
    
    return {
        files
    };
};

export const actions = {
    upload: async ({ request }) => {
        try {
            const formData = await request.formData();
            const file = formData.get('file') as File;

            if (!file) {
                return fail(400, {
                    error: '请选择要上传的文件',
                    missing: true
                });
            }

            // Check file size
            if (file.size > MAX_FILE_SIZE) {
                return fail(413, {
                    error: `文件大小超过限制（最大 100MB）`,
                    tooLarge: true
                });
            }

            // Check available space
            const enoughSpace = await hasEnoughSpace(file.size);
            if (!enoughSpace) {
                return fail(507, {
                    error: '存储空间不足（总容量限制为 20GB）',
                    insufficientStorage: true
                });
            }

            // Sanitize filename
            const sanitizedName = sanitizeFilename(file.name);
            const filePath = getFilePath(sanitizedName);

            // Ensure upload directory exists
            await ensureUploadDir();

            // Save file using stream
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            
            await new Promise<void>((resolve, reject) => {
                const writeStream = createWriteStream(filePath);
                
                writeStream.on('error', reject);
                writeStream.on('finish', resolve);
                
                writeStream.write(buffer);
                writeStream.end();
            });

            return {
                success: true,
                filename: sanitizedName
            };
        } catch (error) {
            console.error('Upload error:', error);
            return fail(500, {
                error: '文件上传失败',
                serverError: true
            });
        }
    },

    delete: async ({ request }) => {
        try {
            const formData = await request.formData();
            const filename = formData.get('filename') as string;

            if (!filename) {
                return fail(400, {
                    error: '文件名不能为空',
                    missing: true
                });
            }

            // Sanitize filename to prevent path traversal
            const sanitizedName = sanitizeFilename(filename);
            const filePath = getFilePath(sanitizedName);

            await unlink(filePath);

            return {
                success: true,
                deleted: sanitizedName
            };
        } catch (error) {
            console.error('Delete error:', error);
            return fail(500, {
                error: '文件删除失败',
                serverError: true
            });
        }
    }
} satisfies Actions;
