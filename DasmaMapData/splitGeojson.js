const fs = require("fs");
const path = require("path");

// Get file from command line
const inputFile = process.argv[2];

if (!inputFile) {
    console.error("Please provide an input file.");
    console.log("Usage: node split-geojson.js <file.geojson>");
    process.exit(1);
}

if (!fs.existsSync(inputFile)) {
    console.error("File not found:", inputFile);
    process.exit(1);
}

console.log("Reading:", inputFile);

const rawData = fs.readFileSync(inputFile, "utf8");
const geojson = JSON.parse(rawData);

const points = { type: "FeatureCollection", features: [] };
const linestrings = { type: "FeatureCollection", features: [] };
const polygons = { type: "FeatureCollection", features: [] };

geojson.features.forEach(feature => {
    const type = feature.geometry?.type;

    if (type === "Point" || type === "MultiPoint") {
        points.features.push(feature);
    }
    else if (type === "LineString" || type === "MultiLineString") {
        linestrings.features.push(feature);
    }
    else if (type === "Polygon" || type === "MultiPolygon") {
        polygons.features.push(feature);
    }
});

// Output filenames based on input name
const baseName = path.parse(inputFile).name;

fs.writeFileSync(`Dasma_Points.geojson`, JSON.stringify(points));
fs.writeFileSync(`Dasma_LineStrings.geojson`, JSON.stringify(linestrings));
fs.writeFileSync(`Dasma_Polygons.geojson`, JSON.stringify(polygons));

console.log("Done splitting!");