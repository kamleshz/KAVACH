import jwt from 'jsonwebtoken';

export const generateAccessToken = (userId) => {
    const secret =
        process.env.SECRET_KEY_ACCESS_TOKEN ||
        (process.env.NODE_ENV !== 'production' ? 'dev-access-secret' : undefined);
    if (!secret) {
        throw new Error('Missing SECRET_KEY_ACCESS_TOKEN');
    }
    if (!process.env.SECRET_KEY_ACCESS_TOKEN && process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.warn('[Auth] Using development fallback for ACCESS token secret');
    }
    return jwt.sign({ id: userId }, secret, { expiresIn: '6h' });
};

export const generateRefreshToken = (userId) => {
    const secret =
        process.env.SECRET_KEY_REFRESH_TOKEN ||
        (process.env.NODE_ENV !== 'production' ? 'dev-refresh-secret' : undefined);
    if (!secret) {
        throw new Error('Missing SECRET_KEY_REFRESH_TOKEN');
    }
    if (!process.env.SECRET_KEY_REFRESH_TOKEN && process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.warn('[Auth] Using development fallback for REFRESH token secret');
    }
    return jwt.sign({ id: userId }, secret, { expiresIn: '7d' });
};

export const verifyAccessToken = (token) => {
    try {
        return jwt.verify(token, process.env.SECRET_KEY_ACCESS_TOKEN);
    } catch (error) {
        throw new Error('Invalid or expired token');
    }
};

export const verifyRefreshToken = (token) => {
    try {
        return jwt.verify(token, process.env.SECRET_KEY_REFRESH_TOKEN);
    } catch (error) {
        throw new Error('Invalid or expired refresh token');
    }
};
