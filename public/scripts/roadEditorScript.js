import { GraphHelper } from "./core/graphHelper.js";

const map = L.map("map", {
    renderer: L.canvas()
}).setView([14.3272, 120.9404], 15);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: 'Map data from <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
}).addTo(map);

const roadsGeoJSON = await fetch("../api/getBlobFile?filename=Dasma_LineStrings-AllRoads.geojson").then(r => r.json());

// Assigns a road ID to each road
roadsGeoJSON.features.forEach((feature, index) => {
    feature.properties.id = `road-${index}`;
});

const roadsLayer = L.geoJSON(roadsGeoJSON, {
    filter: function(feature) {
        return feature.geometry && feature.geometry.type === "LineString";
    },
    style: {
        color: "#555",
        opacity: 1,
        weight: 2
    },
    onEachFeature: function(feature, layer) {
        if (feature.properties.disabled) {
            layer.setStyle({
                color: "#e00",
                opacity: 1
            });
        }

        layer.on("click", function () {
            const roadId = feature.properties.id;
            const isDisabled = feature.properties.disabled === true;

            feature.properties.disabled = !isDisabled;
            if (feature.properties.disabled) {
                layer.setStyle({
                    color: "#e00",
                    opacity: 1
                });
            } else {
                layer.setStyle({
                    color: "#555",
                    opacity: 1
                });
            }
        });
    }
}).addTo(map);

map.on("zoomend", () => {
    const zoom = map.getZoom();
    let weight;

    if (zoom <= 13) weight = 1;
    else if (zoom <= 15) weight = 2;
    else if (zoom <= 17) weight = 3;
    else weight = 4;

    roadsLayer.setStyle({ weight });
});

const graphHelper = new GraphHelper(roadsGeoJSON);
// NOTE: graph.get(key) => [{ to, weight, coords }]

// TODO: Currently does NOT check if changes have been made before actually saving, wasting resources.
// TODO: May also want to implement a progress bar and disable other actions after clicking the save button.
// TODO: Currently takes too long to save.. takes around 10s?
$("#saveNewGeoJson").on("click", async function () {
    try {
        graphHelper.buildGraph(roadsGeoJSON, true); 
        
        await Promise.all([
            saveRoadsGeoJson(),
            saveGraphJson()
        ]);

        alert("Successfully saved new GeoJson and Graph Road Data!");
    } catch (err) {
        console.error(err);
        alert("Failed to save GeoJSON Road Data.");
    }
});

async function saveRoadsGeoJson() {
    const response = await fetch("/api/saveBlobFile", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            filename: "Dasma_LineStrings-AllRoads.geojson",
            fileData: roadsGeoJSON
        })
    });

    const result = await response.json();

    if (!response.ok) {
        throw new Error(result.error);
    }
}

async function saveGraphJson() {
    const response = await fetch("/api/saveBlobFile", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            filename: "Dasma_RoadGraph-AllRoads.json",
            fileData: Object.fromEntries(graphHelper.graph)
        })
    });

    const result = await response.json();

    if (!response.ok) {
        throw new Error(result.error);
    }
}
