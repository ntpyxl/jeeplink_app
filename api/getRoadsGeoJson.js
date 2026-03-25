import { get } from "@vercel/blob";

export default async function handler(req) {
  const URL = "https://kb05hljdd5v8jslb.private.blob.vercel-storage.com/Dasma_LineStrings.geojson";

    try {
        const blobResponse = await get(URL, {
        access: 'private',
        token: process.env.BLOB_READ_WRITE_TOKEN
        });

        const data = await new Response(blobResponse.stream).json();

        return new Response(JSON.stringify(data), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'CDN-Cache-Control': 'public, s-maxage=604800',
                'Vercel-CDN-Cache-Control': 'public, s-maxage=604800',
                'Cache-Control': 'public, s-maxage=604800, stale-while-revalidate=86400',
                'Vary': 'Accept-Encoding', 
            },
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
        });
    }
}