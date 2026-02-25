import { put } from "@vercel/blob";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const geojson = req.body;

        const blob = await put(
            "Dasma_LineStrings_modified.geojson",
            JSON.stringify(geojson, null, 2),
            {
                access: "private",
                contentType: "application/json"
            }
        );

        return res.status(200).json({ url: blob.url });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Failed to save file" });
    }
}