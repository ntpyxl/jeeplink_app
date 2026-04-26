import { put } from "@vercel/blob";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { filename, fileData } = req.body;

        const fileUrlResult = await put(
            filename,
            JSON.stringify(fileData),
            {
                access: "private",
                contentType: "application/json",
                token: process.env.BLOB_READ_WRITE_TOKEN,
                allowOverwrite: true
            }
        );

        return res.status(200).json({
            fileUrlResult: fileUrlResult.url
        });


    } catch (err) {
        console.error("Blob Saving Error:", err);
        return res.status(500).json({ 
            error: "Failed to save blob", 
            details: err.message 
        });
    }
}