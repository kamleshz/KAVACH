
export const toAbsUrl = (p, API_URL) => {
    if (!p) return '';
    if (typeof p !== 'string') return '';
    const isAbs = p.startsWith('http://') || p.startsWith('https://');
    return isAbs ? p : `${API_URL}/${p}`;
};

export const loadImageAsDataUrl = async (url) => {
    try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const blob = await res.blob();
        return await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Failed to read image'));
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        return null;
    }
};

export const loadImageForPdf = async (url) => {
    const dataUrl = await loadImageAsDataUrl(url);
    if (!dataUrl) return null;
    try {
        const img = await new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = () => reject(new Error('Failed to get dimensions'));
            image.src = dataUrl;
        });
        return {
            dataUrl,
            width: img.width || null,
            height: img.height || null
        };
    } catch {
        return {
            dataUrl,
            width: null,
            height: null
        };
    }
};

export const parseRemarksToItems = (value) => {
    if (!value) return [];
    if (typeof value !== 'string') return [];
    const lines = value.split(/\r?\n/);
    const items = [];
    lines.forEach((line) => {
        const parts = line.split(/(?:\||,|;|\/)/);
        parts.forEach((p) => {
            const t = p.trim();
            if (t) items.push(t);
        });
    });
    return items;
};
