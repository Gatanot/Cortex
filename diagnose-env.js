#!/usr/bin/env node
/**
 * 环境变量诊断脚本
 * 用于检查 .env 文件是否被正确加载
 */

import { config } from 'dotenv';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

console.log('=== Cortex 环境变量诊断工具 ===\n');

// 1. 检查 .env 文件是否存在
const envPath = resolve(process.cwd(), '.env');
console.log('1. 检查 .env 文件');
console.log('   路径:', envPath);
console.log('   存在:', existsSync(envPath) ? '✓ 是' : '✗ 否');

if (!existsSync(envPath)) {
    console.log('\n❌ 错误: .env 文件不存在！');
    console.log('   请确保 .env 文件在项目根目录下');
    process.exit(1);
}

// 2. 读取并分析 .env 文件内容
console.log('\n2. 读取 .env 文件内容');
try {
    const envContent = readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n');
    console.log('   总行数:', lines.length);
    
    // 检查每个关键变量
    const requiredVars = ['WEB_PASSWORD', 'API_SECRET', 'SESSION_SECRET'];
    const foundVars = {};
    
    lines.forEach((line, index) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        
        const match = trimmed.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim();
            
            if (requiredVars.includes(key)) {
                foundVars[key] = {
                    line: index + 1,
                    length: value.length,
                    hasQuotes: value.startsWith('"') || value.startsWith("'"),
                    hasSpaces: value.includes(' '),
                    value: value // 仅用于调试，生产环境应删除
                };
            }
        }
    });
    
    console.log('\n3. 必需的环境变量检查');
    requiredVars.forEach(varName => {
        console.log(`\n   ${varName}:`);
        if (foundVars[varName]) {
            const info = foundVars[varName];
            console.log('   ✓ 找到 (第', info.line, '行)');
            console.log('   长度:', info.length, '字符');
            console.log('   使用引号:', info.hasQuotes ? '是' : '否');
            console.log('   包含空格:', info.hasSpaces ? '是' : '否');
            console.log('   实际值:', info.value.substring(0, 10) + '...' + (info.length > 10 ? ' (已截断)' : ''));
            
            // 警告
            if (info.hasQuotes) {
                console.log('   ⚠️  警告: 值包含引号，可能导致解析问题');
            }
            if (info.hasSpaces && !info.hasQuotes) {
                console.log('   ⚠️  警告: 值包含空格但没有引号包裹');
            }
        } else {
            console.log('   ✗ 未找到');
        }
    });
} catch (error) {
    console.log('   ✗ 读取失败:', error.message);
}

// 3. 使用 dotenv 加载并验证
console.log('\n4. 使用 dotenv 加载环境变量');
config();

const requiredVars = ['WEB_PASSWORD', 'API_SECRET', 'SESSION_SECRET'];
let allPresent = true;

requiredVars.forEach(varName => {
    const value = process.env[varName];
    const exists = !!value;
    console.log(`   ${varName}:`, exists ? '✓ 已加载' : '✗ 未加载');
    
    if (exists) {
        console.log('   长度:', value.length);
        console.log('   前3字符:', value.substring(0, 3) + '...');
    } else {
        allPresent = false;
    }
});

// 5. 总结
console.log('\n=== 诊断结果 ===');
if (allPresent) {
    console.log('✓ 所有必需的环境变量都已正确加载');
    console.log('\n如果仍然无法登录，请检查：');
    console.log('1. 确认服务器上的 .env 文件与本地一致');
    console.log('2. 重启应用以重新加载环境变量');
    console.log('3. 检查是否使用了 HTTPS (如果是，需要设置 FORCE_SECURE_COOKIE=false)');
    console.log('4. 查看应用日志中的 [auth] 开头的调试信息');
} else {
    console.log('✗ 部分环境变量未加载，请检查 .env 文件格式');
    console.log('\n建议：');
    console.log('1. 确保变量名拼写正确');
    console.log('2. 确保没有多余的空格');
    console.log('3. 如果值包含特殊字符，使用双引号包裹');
    console.log('4. 示例: WEB_PASSWORD="my-secure-password"');
}

console.log('\n工作目录:', process.cwd());
console.log('Node 版本:', process.version);
console.log('===================\n');
