import { apiFetch } from "./core/jeeplinkApiFetcher.js";
import { GraphHelper } from "./core/graphHelper.js";
import { RouteEditor } from "./core/routeEditor.js";
import { snapToRoad } from "./helper/snapToRoadFunction.js";
import { SavedRouteRenderer } from "./core/savedRouteRenderer.js";
import { renderRoutesTable } from "./ui/routeTableRowScript.js";
import { adminShowLoader, adminHideLoader } from "./ui/adminStylingScript.js";

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

let currentPage = 1;
let totalPages = 1;
let totalRows = 0;
const rowsPerPage = 10;

reloadJeepRouteData(1);

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
let tempRouteParentId = null;

let editingRouteStatus = null;
let editingRoutetype = null;
let editingRouteParentRouteId = null;

const routeNameInput = $("#drawnJeepRouteName");
const editRouteFields = $("#editRouteFields");
const deleteModal = $("#deleteModal");

async function enterEditMode(route) {
    editingRouteId = route.id;
    editingRouteStatus = route.status;
    editingRoutetype = route.type;
    editingRouteParentRouteId = route.parent_route_id;

    const jeepRouteData = await apiFetch(`/getJeepRoutesWithNodes?route_id=${editingRouteId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
    });

    routeNameInput.val(route.name);
    editRouteFields.removeClass("hidden");
    $("#cancelEditRoute").removeClass("hidden");
    $("#rebuildPublicRoadsGraph, #clearDrawnJeepRoute").addClass("hidden");

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

    const latLngs = routeEditor.nodes.map(n => {
        const [lng, lat] = n.coordinates;
        return [lat, lng];
    });
    
    if (latLngs.length) {
        const isMobile = window.innerWidth <= 768;
        map.fitBounds(L.latLngBounds(latLngs), {
            paddingTopLeft: isMobile ? [60, 100] : [200, 120],
            paddingBottomRight: isMobile ? [60, 180] : [50, 120],
            animate: true,
            duration: 0.6,
            maxZoom: isMobile ? 14 : 17,
            max: isMobile ? 14 : 17
        });
    }
    await routeEditor.drawRoute();
}

async function enterAddTempRouteMode(route) {
    tempRouteParentId = route.id;
    editingRouteStatus = route.status;
    editingRoutetype = route.type;
    editingRouteParentRouteId = route.parent_route_id;

    const jeepRouteData = await apiFetch(`/getJeepRoutesWithNodes?route_id=${tempRouteParentId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
    });

    routeNameInput.val(route.name);
    editRouteFields.removeClass("hidden");
    $("#cancelEditRoute").removeClass("hidden");
    $("#rebuildPublicRoadsGraph, #clearDrawnJeepRoute").addClass("hidden");

    $("#saveDrawnJeepRoute")
        .removeClass("bg-[#35903A] text-white hover:bg-[#2f7a33]")
        .addClass("bg-yellow-400 text-black hover:bg-yellow-500 shadow-sm")
        .html('<i class="fas fa-save"></i><span> Add Temp Route</span>');

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

function resetEditMode(returnToTop = false) {
    editingRouteId = null;
    tempRouteParentId = null;
    editingRouteStatus = null;
    editingRoutetype = null;
    editingRouteParentRouteId = null;

    editRouteFields.addClass("hidden");
    $("#cancelEditRoute").addClass("hidden");
    $("#rebuildPublicRoadsGraph, #clearDrawnJeepRoute").removeClass("hidden");
    clearDrawnJeepRoute();

    $("#saveDrawnJeepRoute")
        .removeClass("bg-yellow-400 text-black hover:bg-yellow-500 shadow-sm")
        .addClass("bg-[#35903A] text-white hover:bg-[#2f7a33]")
        .text("+ Add Route");

    if(returnToTop) $("html, body").animate({ scrollTop: 0 }, 500);
}

roadsLayer.on("click", async e => {
    const snapped = snapToRoad(e.latlng, roadsGeoJSON);
    if (!snapped) return;

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

        showSuccess("Successfully saved new Public Roads Graph Data!");
    } catch (err) {
        console.error(err);
        showError("Failed to save Public Roads Graph Data.");
    }
});

$("#clearDrawnJeepRoute").on("click", () => {
    clearDrawnJeepRoute();
});

$("#toggleJeepRoutes").on("click", async () => {
    savedRouteRenderer.toggle();
});

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

$("#saveDrawnJeepRoute").on("click", async () => {
    const routeName = routeNameInput.val().trim();
    if (!routeName) {
        showError("Route name is required.");
        return;
    }

    if(routeEditor.nodes.length <= 1) {
        showError("No routes have been drawn yet.");
        return;
    }

    const MIN_LOADER_TIME = 800;

    adminShowLoader(["Saving Jeep Route...", "Please wait...", "This may take a few seconds..."]);

    const start = Date.now();

    try {       
        const nodes = routeEditor.nodes.map(node => ({
            id: node.id,
            roadId: node.roadId,
            graphKey: node.graphKey,
            coordinates: node.coordinates
        }));

        if (editingRouteId) {
            await apiFetch("/updateJeepRoute", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    route_id: editingRouteId,
                    route_name: routeName || "Unnamed Jeep Route",
                    route_status: editingRouteStatus,
                    route_type: editingRoutetype,
                    parent_route_id: editingRouteParentRouteId,
                    nodes: nodes
                })
            });
        } else if (tempRouteParentId) {
            await apiFetch("/insertJeepRoute", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    route_name: routeName || "Unnamed Temp Jeep Route",
                    route_type: "temporary",
                    parent_route_id: tempRouteParentId,
                    nodes: nodes
                })
            });
        } else {
            await apiFetch("/insertJeepRoute", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    route_name: routeName || "Unnamed Jeep Route",
                    route_type: "main",
                    nodes: nodes
                })
            });
        }

        clearDrawnJeepRoute();
        await reloadJeepRouteData();
        
        const elapsed = Date.now() - start;
        if (elapsed < MIN_LOADER_TIME) await delay(MIN_LOADER_TIME - elapsed);
        if (editingRouteId || tempRouteParentId) resetEditMode(true);
        
        adminHideLoader();
        showSuccess("Successfully saved Jeepney Route!");
    } catch (err) {
        console.error(err);
        adminHideLoader();
        showError("Failed to save Jeepney Route.");
    }
});

$("#cancelEditRoute").on("click", () => {
    resetEditMode(true);
});

$("#routesTableBody").on("click", ".edit-route-btn", function() {
    resetEditMode();

    const routeId = parseInt($(this).data("route-id"));
    const routeData = jeepRoutes.find(route => route.id === routeId);
    if (!routeData) return;

    const offset = 175;
    $("html, body").animate({ scrollTop: Math.max(0, $("#map").offset().top - offset) }, 500);
    enterEditMode(routeData);
});

$("#routesTableBody").on("click", ".add-temporary-route-btn", function() {
    const routeId = $(this).data("route-id");
    const routeData = jeepRoutes.find(route => route.id === routeId);
    if (!routeData) return;

    const offset = 175;
    $("html, body").animate({ scrollTop: Math.max(0, $("#map").offset().top - offset) }, 500);
    enterAddTempRouteMode(routeData);
});

$("#routesTableBody").on("click", ".delete-route-btn", function() {
    const routeId = $(this).data("route-id");
    const routeData = jeepRoutes.find(route => route.id === routeId);
    if (!routeData) return;

    let modalText = null;
    if(routeData.temp_route_id) {
        modalText = "Are you sure you want to delete this route and its temporary route?";
    } else if(routeData.parent_route_id) {
        modalText = "Are you sure you want to delete this temporary route? Its parent route will be re-renabled.";
    } else {
        modalText = "Are you sure you want to delete this route?";
    }

    $("#deleteRouteId").val(routeId);
    $("#deleteRouteParentId").val(routeData.parent_route_id);
    $("#deleteRouteChildId").val(routeData.temp_route_id);

    $("#deleteModalText").text(modalText);
    $("#deleteRouteName").text(routeData.name);
    deleteModal.removeClass("hidden").addClass("flex");
});

$("#cancelDelete").on("click", () => {
    $("#deleteRouteId").val(null);
    $("#deleteRouteParentId").val(null);
    $("#deleteRouteChildId").val(null);
    deleteModal.removeClass("flex").addClass("hidden");
});

$("#confirmDelete").on("click", async () => {
    const routeId = $("#deleteRouteId").val();
    const routeParentId = $("#deleteRouteParentId").val();
    const routeChildId = $("#deleteRouteChildId").val();

    const MIN_LOADER_TIME = 800;
    adminShowLoader(["Deleting Jeep Route...", "Please wait...", "This may take a few seconds..."]);
    const start = Date.now();

    try {
        await apiFetch("/deleteJeepRoute", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                route_id: routeId,
                route_parent_id: routeParentId,
                route_child_id: routeChildId
            })
        });

        deleteModal.removeClass("flex").addClass("hidden");
        clearDrawnJeepRoute();
        resetEditMode(true);
        await reloadJeepRouteData();

        const elapsed = Date.now() - start;
        if (elapsed < MIN_LOADER_TIME) {
            await delay(MIN_LOADER_TIME - elapsed);
        }

        $("#deleteRouteId").val(null);
        $("#deleteRouteParentId").val(null);
        $("#deleteRouteChildId").val(null);

        adminHideLoader();
        showSuccess("Successfully deleted Jeepney Route!");
    } catch (err) {
        console.error(err);
        adminHideLoader();
        showError("Failed to delete Jeepney Route.");
    }
});

let jeepRouteDataSearchQuery = null;
let searchTimeout = null;

$("#routeSearch").on("input", function () {
    clearTimeout(searchTimeout);

    searchTimeout = setTimeout(() => {
        jeepRouteDataSearchQuery = $(this).val().trim() || null;
        reloadJeepRouteData(1, jeepRouteDataSearchQuery);
    }, 500);
});

// PAGINATION CONTROLS
$("#prevBtn").on("click", () => {
    if (currentPage > 1) {
        reloadJeepRouteData(currentPage - 1, jeepRouteDataSearchQuery);
    }
});

$("#nextBtn").on("click", () => {
    if (currentPage < totalPages) {
        reloadJeepRouteData(currentPage + 1, jeepRouteDataSearchQuery);
    }
});

function clearDrawnJeepRoute() {
    routeEditor.clear();
    routeNameInput.val("");
    $("#startNodeText, #endNodeText").text("");
}

async function reloadJeepRouteData(pageNumber = 1, searchQuery = null) {
    $("#tableLoading").removeClass("hidden");

    try {
        let url = `/getJeepRoutes?page_number=${pageNumber}`;

        if (searchQuery) {
            url += `?search_query=${encodeURIComponent(searchQuery.trim())}`;
        } else {
            $("#routeSearch").val("");
        }

        const { route_data, row_count, total_pages } = await apiFetch(url, {
            method: "GET",
            headers: { "Content-Type": "application/json" }
        });

        jeepRoutes = route_data || [];
        currentPage = pageNumber;
        totalPages = total_pages;
        totalRows = row_count;

        renderRoutesTable(jeepRoutes, $("#routesTableBody"));
        renderPagination();

        return true;
    } catch (err) {
        console.error(err);
        showError("Failed to load Jeep Routes into table.");
        return false;
    } finally {
        $("#tableLoading").addClass("hidden");
    }
}

function renderPagination() {
    // INFO TEXT
    const start = (currentPage - 1) * rowsPerPage + 1;
    const end = Math.min(currentPage * rowsPerPage, totalRows);

    $("#paginationInfo").text(
        `Showing ${start} to ${end} of ${totalRows} entries`
    );

    // BUTTON STATES
    $("#prevBtn").prop("disabled", currentPage === 1);
    $("#nextBtn").prop("disabled", currentPage === totalPages);

    // PAGE NUMBERS
    const pageContainer = $("#pageNumbers");
    pageContainer.empty();

    for (let i = 1; i <= totalPages; i++) {
        const btn = $(`
            <button class="px-3 py-1 border rounded-lg cursor-pointer ${
                i === currentPage ? "bg-[#35903A] text-white " : "text-gray-600 hover:bg-gray-100 hover:text-gray-800"
            }">
                ${i}
            </button>
        `);

        btn.on("click", () => reloadJeepRouteData(i, jeepRouteDataSearchQuery));

        pageContainer.append(btn);
    }
}