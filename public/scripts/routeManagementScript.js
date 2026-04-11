import { apiFetch } from "./core/jeeplinkApiFetcher.js";
import { GraphHelper } from "./core/graphHelper.js";
import { RouteEditor } from "./core/routeEditor.js";
import { RouteRenderer } from "./core/routeRenderer.js";

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
    snapToRoad: snapToRoad,
    graphHelper: graphHelper,
    addInteractability: true
});
const routeRenderer = new RouteRenderer({
    map: map, 
    snapToRoad: snapToRoad,
    graphHelper: graphHelper
});

let jeepRoutes = [];
let editingRouteId = null;
const routeNameInput = $("#drawnJeepRouteName");
const routeParentInput = $("#drawnJeepRouteParentId");
const routeStatusSelect = $("#drawnJeepRouteStatus");
const routeTypeSelect = $("#drawnJeepRouteType");
const editRouteFields = $("#editRouteFields");

function enterEditMode(route) {
    editingRouteId = route.id;
    routeNameInput.val(route.name || "");
    routeParentInput.val(route.parent_route_id ?? "");
    routeStatusSelect.val((route.status || "enabled").toLowerCase());
    routeTypeSelect.val((route.type || "main").toLowerCase());
    editRouteFields.removeClass("hidden");

    const saveButton = $("#saveDrawnJeepRoute");
    saveButton
        .removeClass("bg-[#35903A] text-white hover:bg-[#2f7a33]")
        .addClass("bg-yellow-400 text-black hover:bg-yellow-500 shadow-sm")
        .html('<i class="fas fa-save"></i><span> Save Route</span>');

    $("#cancelEditRoute").removeClass("hidden");
}

function exitEditMode() {
    editingRouteId = null;
    routeNameInput.val("");
    routeParentInput.val("");
    routeStatusSelect.val("enabled");
    routeTypeSelect.val("main");
    editRouteFields.addClass("hidden");

    const saveButton = $("#saveDrawnJeepRoute");
    saveButton
        .removeClass("bg-yellow-400 text-black hover:bg-yellow-500 shadow-sm")
        .addClass("bg-[#35903A] text-white hover:bg-[#2f7a33]")
        .text("+ Add Route");

    $("#cancelEditRoute").addClass("hidden");
}

roadsLayer.on("click", async event => {
    const snapped = snapToRoad(event.latlng);
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

function snapToRoad(latlng) {
    const clicked = turf.point([latlng.lng, latlng.lat]);

    let closestRoad = null;
    let closestSnap = null;
    let minDist = Infinity;

    roadsGeoJSON.features.forEach(road => {
        const snap = turf.nearestPointOnLine(road, clicked);
        const dist = snap.properties.dist;

        if (dist < minDist) {
            minDist = dist;
            closestRoad = road;
            closestSnap = snap;
        }
    });

    if (!closestRoad) return null;

    const coords = closestRoad.geometry.coordinates;
    const segmentIndex = closestSnap.properties.index;

    // Prevent overflow
    if (segmentIndex >= coords.length - 1) segmentIndex = coords.length - 2;

    return {
        coordinates: closestSnap.geometry.coordinates,
        roadId: closestRoad.properties.id,
        segmentA: coords[segmentIndex],
        segmentB: coords[segmentIndex + 1]
    };
}

// TODO: Currently does NOT check if changes have been made before actually saving, wasting resources.
// Takes around 6.7s to save
// six sevennnnnnn
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

function clearDrawnJeepRoute() {
    routeEditor.clear();
    routeNameInput.val("");
    routeParentInput.val("");
    routeStatusSelect.val("enabled");
    routeTypeSelect.val("main");
    $("#startNodeText, #endNodeText").text("");
    exitEditMode();
}

$("#clearDrawnJeepRoute").on("click", () => {
    clearDrawnJeepRoute();
});

$("#saveDrawnJeepRoute").on("click", async () => {
    const routeName = routeNameInput.val().trim();
    if (!routeName) {
        alert("Route name is required.");
        return;
    }

    try {
        if (editingRouteId) {
            const updatedRoute = {
                id: editingRouteId,
                name: routeName,
                parent_route_id: routeParentInput.val().trim() || null,
                status: routeStatusSelect.val(),
                type: routeTypeSelect.val()
            };

            const index = jeepRoutes.findIndex(route => route.id === editingRouteId);
            if (index !== -1) {
                jeepRoutes[index] = {
                    ...jeepRoutes[index],
                    ...updatedRoute
                };
                renderRoutesTable(jeepRoutes);
            }

            clearDrawnJeepRoute();
            alert("Route changes have been applied locally. Save changes with the backend update endpoint when available.");
            return;
        }

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

        clearDrawnJeepRoute();
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
    const routeId = $(this).data("route-id");
    const route = jeepRoutes.find(route => route.id === routeId);
    if (!route) return;

    enterEditMode(route);
});

try {
    const jeepRoutesData = await apiFetch("/getJeepRoutes", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });

    jeepRoutes = jeepRoutesData.queryData || [];
    renderRoutesTable(jeepRoutes);
} catch (err) {
    console.error(err);
}

// Dynamically renders the table of jeep routes based on the provided data + adds edit/delete button functionality (to be implemented)
function renderRoutesTable(routes) {
    const tableBody = $("#routesTableBody");
    tableBody.empty();

    routes.forEach(route => {
        const statusStyle = getStatusStyle(route.status);
        const routeTypeStyle = getRouteTypeStyle(route.type);

        const row = $(`
            <tr class="border-b hover:bg-gray-50">
                <td class="py-3">${route.id}</td>
                <td class="py-3">${route.name}</td>
                <td class="py-3">${route.parent_route_id ?? "—"}</td>
                <td class="py-3">
                    <span class="${statusStyle.class}">${route.status}</span>
                </td>
                <td class="py-3">
                    <span class="${routeTypeStyle.class}">${route.type}</span>
                </td>
                <td class="py-3 text-center space-x-2">
                    <button class="text-blue-500 hover:underline cursor-pointer edit-route-btn" data-route-id="${route.id}">Edit</button>
                    <button class="text-red-500 hover:underline cursor-pointer delete-route-btn" data-route-id="${route.id}">Delete</button>
                </td>
            </tr>
        `);
        tableBody.append(row);
    });
}

function getStatusStyle(status) {
    const formattedStatus = status.toLowerCase();

    switch (formattedStatus) {
        case "enabled":
            return { class: "bg-green-100 text-green-600 px-2 py-1 rounded-full text-xs" };
        case "disabled":
            return { class: "bg-red-100 text-red-600 px-2 py-1 rounded-full text-xs" };
        default:
            return { class: "bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs" };
    }
}

function getRouteTypeStyle(type) {
    const formattedType = type.toLowerCase();

    switch (formattedType) {
        case "main":
            return { class: "bg-blue-100 text-blue-600 px-2 py-1 rounded-full text-xs" };
        case "temporary":
            return { class: "bg-orange-100 text-orange-600 px-2 py-1 rounded-full text-xs" };
        default:
            return { class: "bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs" };
    }
}