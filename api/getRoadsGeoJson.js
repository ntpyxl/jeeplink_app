import { get } from "@vercel/blob";

export default async function handler(req, res) {
    try {
        // TODO: May use up all Vercel blob transfer (1GB/month). Might consider using caches.
        const URL = "https://kb05hljdd5v8jslb.private.blob.vercel-storage.com/Dasma_LineStrings.geojson";

        const blobResponse = await get(URL, {
            access: 'private',
            token: process.env.BLOB_READ_WRITE_TOKEN
        });

        if (blobResponse.stream) {
            const data = await new Response(blobResponse.stream).json();
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