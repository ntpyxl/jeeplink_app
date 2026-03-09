import { put } from "@vercel/blob";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const geojson = req.body.roads;
        const graph = req.body.graph;

        const roadsBlob = await put(
            "Dasma_LineStrings.geojson",
            JSON.stringify(geojson),
            {
                access: "private",
                contentType: "application/json",
                token: process.env.BLOB_READ_WRITE_TOKEN,
                allowOverwrite: true
            }
        );

        const graphBlob = await put(
            "Dasma_RoadGraph.json",
            JSON.stringify(graph),
            {
                access: "private",
                contentType: "application/json",
                token: process.env.BLOB_READ_WRITE_TOKEN,
                allowOverwrite: true
            }
        );

        return res.status(200).json({
            roadsUrl: roadsBlob.url,
            graphUrl: graphBlob.url
        });


    } catch (err) {
        console.error("Blob Saving Error:", err);
        return res.status(500).json({ 
            error: "Failed to save blob", 
            details: err.message 
        });
    }
}