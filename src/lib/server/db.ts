import Database from 'better-sqlite3';
import { env } from '$env/dynamic/private';
import path from 'path';
import fs from 'fs';

const DATABASE_PATH = env.DATABASE_PATH || 'data/cortex.db';

// Ensure data directory exists
const dataDir = path.dirname(DATABASE_PATH);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize database connection
const db = new Database(DATABASE_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Create tables if they don't exist
db.exec(`
    -- 提示词主表
    CREATE TABLE IF NOT EXISTS prompts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        user_category TEXT,
        algo_category TEXT,
        pos_x REAL,
        pos_y REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 提示词块表
    CREATE TABLE IF NOT EXISTS prompt_blocks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        prompt_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        sort_order INTEGER NOT NULL,
        FOREIGN KEY(prompt_id) REFERENCES prompts(id) ON DELETE CASCADE
    );

    -- 创建索引
    CREATE INDEX IF NOT EXISTS idx_user_category ON prompts(user_category);
    CREATE INDEX IF NOT EXISTS idx_algo_category ON prompts(algo_category);
    CREATE INDEX IF NOT EXISTS idx_prompt_blocks_prompt_id ON prompt_blocks(prompt_id);

    -- 触发器: 自动更新 updated_at
    CREATE TRIGGER IF NOT EXISTS update_prompt_timestamp
    AFTER UPDATE ON prompts
    FOR EACH ROW
    BEGIN
        UPDATE prompts SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
    END;
`);

// Type definitions
export interface Prompt {
    id: number;
    title: string;
    user_category: string | null;
    algo_category: string | null;
    pos_x: number | null;
    pos_y: number | null;
    created_at: string;
    updated_at: string;
}

export interface PromptBlock {
    id: number;
    prompt_id: number;
    content: string;
    sort_order: number;
}

export interface PromptWithBlocks extends Prompt {
    blocks: PromptBlock[];
}

// Prepared statements for better performance
const statements = {
    getAllPrompts: db.prepare(`
        SELECT * FROM prompts ORDER BY updated_at DESC
    `),
    
    getPromptById: db.prepare(`
        SELECT * FROM prompts WHERE id = ?
    `),
    
    getBlocksByPromptId: db.prepare(`
        SELECT * FROM prompt_blocks WHERE prompt_id = ? ORDER BY sort_order ASC
    `),
    
    createPrompt: db.prepare(`
        INSERT INTO prompts (title, user_category) VALUES (?, ?)
    `),
    
    updatePrompt: db.prepare(`
        UPDATE prompts SET title = ?, user_category = ? WHERE id = ?
    `),
    
    deletePrompt: db.prepare(`
        DELETE FROM prompts WHERE id = ?
    `),
    
    createBlock: db.prepare(`
        INSERT INTO prompt_blocks (prompt_id, content, sort_order) VALUES (?, ?, ?)
    `),
    
    updateBlock: db.prepare(`
        UPDATE prompt_blocks SET content = ?, sort_order = ? WHERE id = ?
    `),
    
    deleteBlock: db.prepare(`
        DELETE FROM prompt_blocks WHERE id = ?
    `),
    
    deleteBlocksByPromptId: db.prepare(`
        DELETE FROM prompt_blocks WHERE prompt_id = ?
    `),
    
    updateAnalysisResults: db.prepare(`
        UPDATE prompts SET algo_category = ?, pos_x = ?, pos_y = ? WHERE id = ?
    `),
    
    getCategories: db.prepare(`
        SELECT DISTINCT user_category FROM prompts WHERE user_category IS NOT NULL ORDER BY user_category
    `),
    
    getAlgoCategories: db.prepare(`
        SELECT DISTINCT algo_category FROM prompts WHERE algo_category IS NOT NULL ORDER BY algo_category
    `),

    getPromptsWithCoordinates: db.prepare(`
        SELECT * FROM prompts WHERE pos_x IS NOT NULL AND pos_y IS NOT NULL
    `)
};

// Database operations
export function getAllPrompts(): Prompt[] {
    return statements.getAllPrompts.all() as Prompt[];
}

export function getPromptById(id: number): Prompt | undefined {
    return statements.getPromptById.get(id) as Prompt | undefined;
}

export function getBlocksByPromptId(promptId: number): PromptBlock[] {
    return statements.getBlocksByPromptId.all(promptId) as PromptBlock[];
}

export function getPromptWithBlocks(id: number): PromptWithBlocks | undefined {
    const prompt = getPromptById(id);
    if (!prompt) return undefined;
    
    const blocks = getBlocksByPromptId(id);
    return { ...prompt, blocks };
}

export function getAllPromptsWithBlocks(): PromptWithBlocks[] {
    const prompts = getAllPrompts();
    return prompts.map(prompt => ({
        ...prompt,
        blocks: getBlocksByPromptId(prompt.id)
    }));
}

export function createPrompt(title: string, userCategory: string | null, blocks: string[]): number {
    const transaction = db.transaction(() => {
        const result = statements.createPrompt.run(title, userCategory);
        const promptId = result.lastInsertRowid as number;
        
        blocks.forEach((content, index) => {
            statements.createBlock.run(promptId, content, index);
        });
        
        return promptId;
    });
    
    return transaction();
}

export function updatePrompt(
    id: number, 
    title: string, 
    userCategory: string | null, 
    blocks: { id?: number; content: string; sort_order: number }[]
): void {
    const transaction = db.transaction(() => {
        statements.updatePrompt.run(title, userCategory, id);
        
        // Delete all existing blocks and recreate
        statements.deleteBlocksByPromptId.run(id);
        
        blocks.forEach((block) => {
            statements.createBlock.run(id, block.content, block.sort_order);
        });
    });
    
    transaction();
}

export function deletePrompt(id: number): void {
    statements.deletePrompt.run(id);
}

export function updateAnalysisResults(
    results: { id: number; algo_category: string; pos_x: number; pos_y: number }[]
): void {
    const transaction = db.transaction(() => {
        for (const result of results) {
            statements.updateAnalysisResults.run(
                result.algo_category,
                result.pos_x,
                result.pos_y,
                result.id
            );
        }
    });
    
    transaction();
}

export function getCategories(): string[] {
    const rows = statements.getCategories.all() as { user_category: string }[];
    return rows.map(row => row.user_category);
}

export function getAlgoCategories(): string[] {
    const rows = statements.getAlgoCategories.all() as { algo_category: string }[];
    return rows.map(row => row.algo_category);
}

export function getPromptsWithCoordinates(): Prompt[] {
    return statements.getPromptsWithCoordinates.all() as Prompt[];
}

// Export raw database for backup operations
export function getDatabase(): Database.Database {
    return db;
}

export function getDatabasePath(): string {
    return DATABASE_PATH;
}

export default db;
