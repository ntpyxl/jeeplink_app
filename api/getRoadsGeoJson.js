import { get } from "@vercel/blob";

export default async function handler(req, res) {
    // 1. Only allow GET requests (POST/PUT/etc. are not cached by CDNs)
    if (req.method !== 'GET') {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const URL = "https://kb05hljdd5v8jslb.private.blob.vercel-storage.com/Dasma_LineStrings.geojson";

        const blobResponse = await get(URL, {
            access: 'private',
            token: process.env.BLOB_READ_WRITE_TOKEN
        });

        if (blobResponse.stream) {
            const data = await new Response(blobResponse.stream).json();

            // 2. Add Caching Headers
            // s-maxage=3600: Tells Vercel to cache this for 1 hour (3600 seconds)
            // stale-while-revalidate: Tells Vercel to serve the "old" version while 
            // fetching a fresh one in the background if the 1 hour is up.
            res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=86400');
            
            // 3. Set Vary to prevent cache splitting by cookies/auth
            res.setHeader('Vary', 'Accept-Encoding');

            return res.status(200).json(data);
        }

        throw new Error("Blob stream is unavailable");

    } catch (err) {
        console.error("Blob Getting Error:", err);
        return res.status(500).json({ 
            error: "Failed to read blob", 
            details: err.message 
        });
    }
}