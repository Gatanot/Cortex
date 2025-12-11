import type { Cookies } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { createHmac } from 'crypto';

const COOKIE_NAME = 'cortex_session';

interface SessionData {
    auth: boolean;
    timestamp: number;
}

/**
 * 生成 HMAC 签名
 */
function generateSignature(data: string, secret: string): string {
    return createHmac('sha256', secret)
        .update(data)
        .digest('hex');
}

/**
 * 验证签名
 */
function verifySignature(data: string, signature: string, secret: string): boolean {
    const expectedSignature = generateSignature(data, secret);
    return signature === expectedSignature;
}

/**
 * 创建 Session Cookie
 */
export function createSession(cookies: Cookies): void {
    const sessionSecret = env.SESSION_SECRET || 'default-secret-change-in-production';
    const maxAge = parseInt(env.SESSION_MAX_AGE || '604800', 10);
    
    const sessionData: SessionData = {
        auth: true,
        timestamp: Date.now()
    };
    
    const dataString = JSON.stringify(sessionData);
    const signature = generateSignature(dataString, sessionSecret);
    const cookieValue = `${Buffer.from(dataString).toString('base64')}.${signature}`;
    
    cookies.set(COOKIE_NAME, cookieValue, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge
    });
}

/**
 * 验证 Session Cookie
 */
export function verifySession(cookies: Cookies): boolean {
    const sessionSecret = env.SESSION_SECRET || 'default-secret-change-in-production';
    const maxAge = parseInt(env.SESSION_MAX_AGE || '604800', 10);
    
    const cookieValue = cookies.get(COOKIE_NAME);
    
    if (!cookieValue) {
        return false;
    }
    
    try {
        const [dataBase64, signature] = cookieValue.split('.');
        
        if (!dataBase64 || !signature) {
            return false;
        }
        
        const dataString = Buffer.from(dataBase64, 'base64').toString('utf-8');
        
        // 验证签名
        if (!verifySignature(dataString, signature, sessionSecret)) {
            return false;
        }
        
        // 验证数据
        const sessionData: SessionData = JSON.parse(dataString);
        
        if (!sessionData.auth) {
            return false;
        }
        
        // 验证时间戳（防止过期）
        const age = Date.now() - sessionData.timestamp;
        if (age > maxAge * 1000) {
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('Session verification error:', error);
        return false;
    }
}

/**
 * 销毁 Session
 */
export function destroySession(cookies: Cookies): void {
    cookies.delete(COOKIE_NAME, { path: '/' });
}

/**
 * 验证密码
 */
export function verifyPassword(password: string): boolean {
    const correctPassword = env.WEB_PASSWORD || 'admin';
    return password === correctPassword;
}
