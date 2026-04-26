import { apiFetch } from "./core/jeeplinkApiFetcher.js";
import { GraphHelper } from "./core/graphHelper.js";
import { RouteEditor } from "./core/routeEditor.js";
import { snapToRoad } from "./helper/snapToRoadFunction.js";
import { SavedRouteRenderer } from "./core/savedRouteRenderer.js";
import { renderTerminalsTable } from "./ui/terminalTableRowScript.js";

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
let terminals = null;

let currentPage = 1;
let totalPages = 1;
let totalRows = 0;
const rowsPerPage = 10;

reloadTerminalsData(1);

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

async function reloadTerminalsData(pageNumber = 1) {
    $("#tableLoading").removeClass("hidden");

    try {
        const { terminals_data, row_count, total_pages } = await apiFetch(`/getTerminals/${pageNumber}`, {
            method: "GET",
            headers: { "Content-Type": "application/json" }
        });

        terminals = terminals_data || [];
        currentPage = pageNumber;
        totalPages = total_pages;
        totalRows = row_count;

        renderTerminalsTable(terminals, $("#terminalsTableBody"));
        renderPagination();
    } catch (err) {
        console.error(err);
        // TODO: showError() is not defined
        showError("Failed to load Jeep Terminals.");
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

        btn.on("click", () => reloadTerminalsData(i));

        pageContainer.append(btn);
    }
}