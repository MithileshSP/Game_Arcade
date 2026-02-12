const imageCache = new Map();
/**
 * Loads an image into a shared cache.
 *
 * @param {string} id Unique key used by getImage(id)
 * @param {string} src URL string (recommended: new URL('./path.png', import.meta.url).href)
 * @returns {Promise<HTMLImageElement|null>} Resolves with the image, or null if it failed.
 */

export function loadImage(id, src) {
    if (!id) {
        return Promise.reject(new Error("loadImage: 'id' is required"));
    }

    const existing = imageCache.get(id);
    if (existing?.status === "loaded") {
        return Promise.resolve(existing.image);
    }
    if (existing?.status === "loading") {
        return existing.promise;
    }
    const img = new Image();
    const promise = new Promise((resolve) => {
        img.onload = () => {
            imageCache.set(id, { status: "loaded", image: img, src});
            resolve(img);
        };
        img.onerror = () => {
            imageCache.set(id, { status: "error", image: null, src});
            resolve(null);
        };
        img.src = src;
    });

    imageCache.set(id, { status: "loading", image: null, src, promise });
    return promise;
}
/**
 * Loads multiple images.
 * @param {Record<string,string>} manifest Map of id -> src
 * @returns {Promise<Record<string, HTMLImageElement|null>>}
 */

export async function loadImages(manifest) {
    const entries = Object.entries(manifest ?? {});
    const results = await Promise.all(
        entries.map(([id, src]) => loadImage(id, src)),
    );

    /** @type {Record<string, HTMLImageElement|null>} */
    const out = {};
    for (let i = 0; i < entries.length; i++) {
        out[entries[i][0]] = results[i];
    }
    return out;
}

export function getImage(id) {
    return imageCache.get(id)?.image ?? null;
}

export function isImageLoaded(id) {
    return imageCache.get(id)?.status === "loaded";
}