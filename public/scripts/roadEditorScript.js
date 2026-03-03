import { buildGraph } from "./graphBuilder.js";

const map = L.map("map").setView([14.3272, 120.9404], 15);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: 'Map data from <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
}).addTo(map);

const roadsGeoJSON = await fetch("/api/getRoadsGeoJson").then(r => r.json());
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
        weight: map.getZoom()/3
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

            graph = buildGraph(roadsGeoJSON, true);
        });
    }
}).addTo(map);

let graph = buildGraph(roadsGeoJSON, true);
// NOTE: graph.get(key) => [{ to, weight, coords }]

$("#saveNewGeoJson").on("click", async function () {
    // TODO: Currently does NOT check if changes have been made before actually saving, wasting resources.
    // TODO: May also want to implement a progress bar and disable other actions after clicking the save button.
    try {
        const response = await fetch("/api/saveRoadsGeoJson", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(roadsGeoJSON)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error);
        }

        alert("Successfully saved new GeoJson Road Data!");
    } catch (err) {
        console.error(err);
        alert("Failed to save GeoJSON Road Data.");
    }
});
