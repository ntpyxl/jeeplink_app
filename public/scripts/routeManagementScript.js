import { apiFetch } from "./core/jeeplinkApiFetcher.js";
import { GraphHelper } from "./core/graphHelper.js";
import { RouteEditor } from "./core/routeEditor.js";
import { snapToRoad } from "./helper/snapToRoadFunction.js";
import { SavedRouteRenderer } from "./core/savedRouteRenderer.js";
import { renderRoutesTable } from "./ui/routeTableRowScript.js";

const map = L.map("map", {
    renderer: L.canvas()
}).setView([14.3272, 120.9404], 15);
map.createPane("routePane");
map.createPane("nodePane");
map.getPane("routePane").style.zIndex = 400;
map.getPane("nodePane").style.zIndex = 500;

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: 'Map data from <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
}).addTo(map);

const roadsGeoJSON = await fetch("../api/getBlobFile?filename=Dasma_LineStrings-PublicRoads.geojson").then(r => r.json());
let jeepRoutes = null;

const { queryData: jeepRoutesData } = await apiFetch("/getJeepRoutes", {
    method: "GET",
    headers: { "Content-Type": "application/json" },
});

jeepRoutes = jeepRoutesData || [];
renderRoutesTable(jeepRoutes, $("#routesTableBody"));

// Assigns a road ID to each road
roadsGeoJSON.features.forEach((feature, index) => {
    feature.properties.id = `road-${index}`;
});

const roadsLayer = L.geoJSON(roadsGeoJSON, {
    filter: function(feature) {
        return feature.geometry && feature.geometry.type === "LineString" && !feature.properties.disabled;
    },
    style: {
        color: "#555",
        opacity: 1,
        weight: 2
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
// NOTE: graphHelper.graph.get(key) => [{ to, weight, coords }]
const routeEditor = new RouteEditor({
    map: map,
    roadsGeoJSON: roadsGeoJSON,
    graphHelper: graphHelper,
    addInteractability: true
});
const savedRouteRenderer = new SavedRouteRenderer({
    map: map,
    roadsGeoJSON: roadsGeoJSON,
    graphHelper: graphHelper
});

let editingRouteId = null;
const routeNameInput = $("#drawnJeepRouteName");
const routeParentInput = $("#drawnJeepRouteParentId");
const routeStatusSelect = $("#drawnJeepRouteStatus");
const routeTypeSelect = $("#drawnJeepRouteType");
const editRouteFields = $("#editRouteFields");

async function enterEditMode(route) {
    editingRouteId = route.id;

    const jeepRouteData = await apiFetch("/getJeepRoutesWithNodesById", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            route_id: editingRouteId
        })
    });

    routeNameInput.val(route.name);
    routeParentInput.val(route.parent_route_id ?? "");
    routeStatusSelect.val((route.status).toLowerCase());
    routeTypeSelect.val((route.type).toLowerCase());
    editRouteFields.removeClass("hidden");
    $("#cancelEditRoute").removeClass("hidden");

    $("#saveDrawnJeepRoute")
        .removeClass("bg-[#35903A] text-white hover:bg-[#2f7a33]")
        .addClass("bg-yellow-400 text-black hover:bg-yellow-500 shadow-sm")
        .html('<i class="fas fa-save"></i><span> Save Route</span>');

    routeEditor.clear();

    for(let node of jeepRouteData.nodes) {
        const snapped = snapToRoad({lat: node.latitude, lng: node.longitude}, roadsGeoJSON)
        if (!snapped) return;

        const graphNodeKey = graphHelper.insertTemporaryNode(
            snapped.coordinates,
            snapped.segmentA,
            snapped.segmentB
        );   
        
        const formattedNode = {
            id: crypto.randomUUID(),
            coordinates: snapped.coordinates,
            roadId: snapped.roadId,
            graphKey: graphNodeKey,
            marker: null
        };

        routeEditor.addNode({node: formattedNode});
    }
    await routeEditor.drawRoute();
}

function exitEditMode() {
    editingRouteId = null;
    routeNameInput.val("");
    routeParentInput.val("");
    routeStatusSelect.val("enabled");
    routeTypeSelect.val("main");
    editRouteFields.addClass("hidden");

    $("#saveDrawnJeepRoute")
        .removeClass("bg-yellow-400 text-black hover:bg-yellow-500 shadow-sm")
        .addClass("bg-[#35903A] text-white hover:bg-[#2f7a33]")
        .text("+ Add Route");

    $("#cancelEditRoute").addClass("hidden");
}

roadsLayer.on("click", async e => {
    const snapped = snapToRoad(e.latlng, roadsGeoJSON);
    if (!snapped) return;

    // TODO: Consider double checking graphKey and coordinates var, both are coordinates but are somewhat different (with coords being more accurate vs graphKey).
    /* TODO: Delete this old function when no issues arise with new function below!
    const graphNodeKey = graphHelper.snapToGraphNode(snapped.coordinates);
    */
    const graphNodeKey = graphHelper.insertTemporaryNode(
        snapped.coordinates,
        snapped.segmentA,
        snapped.segmentB
    );    

    const node = {
        id: crypto.randomUUID(),
        coordinates: snapped.coordinates,
        roadId: snapped.roadId,
        graphKey: graphNodeKey,
        marker: null
    };

    routeEditor.addNode({node: node});
    await routeEditor.drawRoute();

    $("#startNodeText").text(routeEditor.getStartNode().graphKey);
    if(routeEditor.nodes.length > 1) $("#endNodeText").text(routeEditor.getEndNode().graphKey);
});

// TODO: Currently does NOT check if changes have been made before actually saving, wasting resources.
// Takes around 6.7s to save
$("#rebuildPublicRoadsGraph").on("click", async () => {
    try {
        const response = await fetch("/api/saveBlobFile", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                filename: "Dasma_RoadGraph-PublicRoads.json",
                fileData: Object.fromEntries(graphHelper.graph)
            })
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error);

        alert("Successfully saved new Public Roads Graph Data!");
    } catch (err) {
        console.error(err);
        alert("Failed to save Public Roads Graph Data.");
    }
});

$("#clearDrawnJeepRoute").on("click", () => {
    clearDrawnJeepRoute();
});

$("#toggleJeepRoutes").on("click", async () => {
    savedRouteRenderer.toggle();
});

$("#saveDrawnJeepRoute").on("click", async () => {
    const routeName = routeNameInput.val().trim();
    if (!routeName) {
        alert("Route name is required.");
        return;
    }

    if(routeEditor.nodes.length <= 1) {
        alert("No routes have been drawn yet.");
        return;
    }

    try {       
        if (editingRouteId) {
            const nodes = routeEditor.nodes.map(node => ({
                id: node.id,
                roadId: node.roadId,
                graphKey: node.graphKey,
                coordinates: node.coordinates
            }));

            await apiFetch("/updateJeepRoute", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    route_id: editingRouteId,
                    route_name: routeName || "Unnamed Jeep Route",
                    route_status: routeStatusSelect.val(),
                    route_type: routeTypeSelect.val(),
                    nodes: nodes
                })
            });
        } else {
            const nodes = routeEditor.nodes.map(node => ({
                id: node.id,
                roadId: node.roadId,
                graphKey: node.graphKey,
                coordinates: node.coordinates
            }));

            await apiFetch("/insertJeepRoute", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    routeName: routeName || "Unnamed Jeep Route",
                    nodes: nodes
                })
            });
        }

        clearDrawnJeepRoute();
        reloadJeepRouteData()
        alert("Successfully saved Jeepney Route!");
    } catch (err) {
        console.error(err);
        alert("Failed to save Jeepney Route.");
    }
});

$("#cancelEditRoute").on("click", () => {
    exitEditMode();
});

$("#toggleJeepRoutes").on("click", async () => {
    routeRenderer.toggle();
});

$("#routesTableBody").on("click", ".edit-route-btn", function() {
    const routeId = parseInt($(this).data("route-id"));
    const route = jeepRoutes.find(route => route.id === routeId);
    if (!route) return;

    enterEditMode(route);
});

$("#routesTableBody").on("click", ".delete-route-btn", async function() {
    const routeId = $(this).data("route-id");
    const routeData = jeepRoutes.find(route => route.id === routeId);
    if (!routeData) return;

    // TODO: Tentative route deletion modal
    if(!confirm(`Are you sure you want to delete ${routeData.name}?`)) return;

    try {
        await apiFetch("/deleteJeepRoute", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                route_id: routeId
            })
        });

        clearDrawnJeepRoute();
        reloadJeepRouteData()
        alert("Successfully deleted Jeepney Route!");
    } catch (err) {
        console.error(err);
        alert("Failed to delete Jeepney Route.");
    }
});

function clearDrawnJeepRoute() {
    routeEditor.clear();
    routeNameInput.val("");
    routeParentInput.val("");
    routeStatusSelect.val("enabled");
    routeTypeSelect.val("main");
    $("#startNodeText, #endNodeText").text("");
    exitEditMode();
}

async function reloadJeepRouteData() {
    const { queryData: jeepRoutesData } = await apiFetch("/getJeepRoutes", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });

    jeepRoutes = jeepRoutesData || [];
    renderRoutesTable(jeepRoutes, $("#routesTableBody"));
}