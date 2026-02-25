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

let selectedRoadLayer = null;
let selectedRoadFeature = null;

function selectRoad(feature, layer) {

    // Reset previously selected road
    if (selectedRoadLayer) {
        selectedRoadLayer.setStyle({
            color: "#555"
        });
    }

    selectedRoadLayer = layer;
    selectedRoadFeature = feature;

    layer.setStyle({
        color: "red"
    });

    console.log("Selected:", feature.properties.id);
}

function deleteSelectedRoad() {
    if (!selectedRoadLayer || !selectedRoadFeature) return;

    // Remove from map
    roadsLayer.removeLayer(selectedRoadLayer);

    // Remove from GeoJSON
    roadsGeoJSON.features = roadsGeoJSON.features.filter(
        f => f.properties.id !== selectedRoadFeature.properties.id
    );

    // Rebuild graph
    graph.clear();
    const newGraph = buildGraph(roadsGeoJSON);

    for (const [key, value] of newGraph) {
        graph.set(key, value);
    }

    selectedRoadLayer = null;
    selectedRoadFeature = null;

    console.log("Road deleted and graph rebuilt");
}

$("#saveNewGeoJson").on("click", function(){
    const dataStr = JSON.stringify(roadsGeoJSON, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "Dasma_LineStrings_modified.geojson";
    a.click();

    URL.revokeObjectURL(url);
    alert("Replace the currently fetched GeoJSON file with this new GeoJSON file.");
});

$("#disabledSelectedRoad").on("click", function(){
    deleteSelectedRoad();
});
