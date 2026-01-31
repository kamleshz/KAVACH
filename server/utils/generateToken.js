import jwt from 'jsonwebtoken';

export const generateAccessToken = (userId) => {
    return jwt.sign(
        { id: userId },
        process.env.SECRET_KEY_ACCESS_TOKEN,
        { expiresIn: '6h' }
    );
};

export const generateRefreshToken = (userId) => {
    return jwt.sign(
        { id: userId },
        process.env.SECRET_KEY_REFRESH_TOKEN,
        { expiresIn: '7d' }
    );
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
