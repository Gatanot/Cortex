import { promises as fs } from 'fs';
import path from 'path';

// 配置常量
export const UPLOAD_DIR = path.join(process.cwd(), 'data', 'upload');
export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
export const MAX_TOTAL_SIZE = 20 * 1024 * 1024 * 1024; // 20GB
export const FILE_TTL = 12 * 60 * 60 * 1000; // 12 hours in milliseconds

/**
 * 确保上传目录存在
 */
export async function ensureUploadDir(): Promise<void> {
    try {
        await fs.access(UPLOAD_DIR);
    } catch {
        await fs.mkdir(UPLOAD_DIR, { recursive: true });
    }
}

/**
 * 清洗文件名，防止路径遍历攻击
 */
export function sanitizeFilename(filename: string): string {
    // 移除路径分隔符和危险字符
    let sanitized = filename
        .replace(/[\/\\]/g, '')  // 移除路径分隔符
        .replace(/\.\./g, '.')   // 移除双点
        .replace(/[<>:"|?*]/g, '') // 移除 Windows 不允许的字符
        .trim();
    
    // 确保文件名不为空
    if (!sanitized || sanitized === '.' || sanitized === '..') {
        sanitized = `file_${Date.now()}`;
    }
    
    // 确保文件名长度合理（Windows 最大 255 字符）
    if (sanitized.length > 255) {
        const ext = path.extname(sanitized);
        const nameWithoutExt = sanitized.slice(0, 255 - ext.length);
        sanitized = nameWithoutExt + ext;
    }
    
    return sanitized;
}

/**
 * 计算目录总大小（字节）
 */
export async function calculateDirectorySize(dirPath: string): Promise<number> {
    let totalSize = 0;
    
    try {
        const files = await fs.readdir(dirPath);
        
        for (const file of files) {
            const filePath = path.join(dirPath, file);
            const stats = await fs.stat(filePath);
            
            if (stats.isFile()) {
                totalSize += stats.size;
            }
        }
    } catch (error) {
        console.error('Error calculating directory size:', error);
    }
    
    return totalSize;
}

/**
 * 检查是否有足够空间存储新文件
 */
export async function hasEnoughSpace(newFileSize: number): Promise<boolean> {
    const currentSize = await calculateDirectorySize(UPLOAD_DIR);
    return (currentSize + newFileSize) <= MAX_TOTAL_SIZE;
}

/**
 * 获取文件列表，包含详细信息
 */
export interface FileInfo {
    name: string;
    size: number;
    sizeFormatted: string;
    uploadTime: number;
    uploadTimeFormatted: string;
    remainingTime: number;
    remainingTimeFormatted: string;
    isExpired: boolean;
}

export async function getFileList(): Promise<FileInfo[]> {
    await ensureUploadDir();
    
    try {
        const files = await fs.readdir(UPLOAD_DIR);
        const fileInfos: FileInfo[] = [];
        
        for (const file of files) {
            const filePath = path.join(UPLOAD_DIR, file);
            const stats = await fs.stat(filePath);
            
            if (stats.isFile()) {
                const uploadTime = stats.mtimeMs;
                const now = Date.now();
                const age = now - uploadTime;
                const remaining = Math.max(0, FILE_TTL - age);
                const isExpired = age > FILE_TTL;
                
                fileInfos.push({
                    name: file,
                    size: stats.size,
                    sizeFormatted: formatBytes(stats.size),
                    uploadTime,
                    uploadTimeFormatted: new Date(uploadTime).toLocaleString('zh-CN'),
                    remainingTime: remaining,
                    remainingTimeFormatted: formatDuration(remaining),
                    isExpired
                });
            }
        }
        
        // 按修改时间倒序排列
        fileInfos.sort((a, b) => b.uploadTime - a.uploadTime);
        
        return fileInfos;
    } catch (error) {
        console.error('Error getting file list:', error);
        return [];
    }
}

/**
 * 删除过期文件
 */
export async function cleanupExpiredFiles(): Promise<number> {
    await ensureUploadDir();
    
    let deletedCount = 0;
    const now = Date.now();
    
    try {
        const files = await fs.readdir(UPLOAD_DIR);
        
        for (const file of files) {
            const filePath = path.join(UPLOAD_DIR, file);
            const stats = await fs.stat(filePath);
            
            if (stats.isFile()) {
                const age = now - stats.mtimeMs;
                
                if (age > FILE_TTL) {
                    await fs.unlink(filePath);
                    deletedCount++;
                    console.log(`Deleted expired file: ${file}`);
                }
            }
        }
    } catch (error) {
        console.error('Error cleaning up expired files:', error);
    }
    
    return deletedCount;
}

/**
 * 格式化字节大小
 */
function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * 格式化时长
 */
function formatDuration(ms: number): string {
    if (ms <= 0) return '已过期';
    
    const hours = Math.floor(ms / (60 * 60 * 1000));
    const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
    
    if (hours > 0) {
        return `${hours}小时${minutes}分钟`;
    }
    return `${minutes}分钟`;
}

/**
 * 检查文件是否存在
 */
export async function fileExists(filename: string): Promise<boolean> {
    const filePath = path.join(UPLOAD_DIR, filename);
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

/**
 * 获取文件路径
 */
export function getFilePath(filename: string): string {
    return path.join(UPLOAD_DIR, filename);
}
