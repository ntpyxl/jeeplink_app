import { apiFetch } from "./core/jeeplinkApiFetcher.js";
import { TerminalEditor } from "./core/terminalEditor.js";
import { TerminalRenderer } from "./core/terminalRenderer.js";
import { renderTerminalsTable } from "./ui/terminalTableRowScript.js";

const map = L.map("map", {
    renderer: L.canvas()
}).setView([14.3272, 120.9404], 15);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: 'Map data from <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
}).addTo(map);


let currentPage = 1;
let totalPages = 1;
let totalRows = 0;
const rowsPerPage = 10;

reloadTerminalsTableData(1);

map.on("zoomend", () => {
    const zoom = map.getZoom();
    let weight;

    if (zoom <= 13) weight = 1;
    else if (zoom <= 15) weight = 2;
    else if (zoom <= 17) weight = 3;
    else weight = 4;

    //roadsLayer.setStyle({ weight });
});

const terminalRenderer = new TerminalRenderer({ map });
await terminalRenderer.displayTerminals();

const terminalEditor = new TerminalEditor({ map });

let editingTerminalId = null;
const terminalNameInput = $("#drawnJeepTerminalName");
const editTerminalFields = $("#editTerminalFields");
const parentTerminalSuggestions = $("#parentTerminalSuggestions");
const deleteModal = $("#deleteModal");
const deleteTerminalIdInput = $("#deleteTerminalId");
const deleteTerminalNameLabel = $("#deleteTerminalName");
const cancelDeleteBtn = $("#cancelDelete");
const confirmDeleteBtn = $("#confirmDelete");

$("#clearDrawnTerminal").on("click", () => {
    clearDrawnTerminal();
});

$("#saveDrawnTerminal").on("click", async () => {
    const terminalName = terminalNameInput.val().trim();

    if (!terminalName) {
        showError("Terminal name is required.");
        return;
    }

    if(terminalEditor.node.length <= 1) {
        showError("No terminal have been drawn yet.");
        return;
    }

    try {       
        
        if (editingTerminalId) {
            await apiFetch("/updateTerminal", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    route_id: editingRouteId,
                    route_name: routeName || "Unnamed Jeep Route",
                    route_status: routeStatusSelect.val(),
                    route_type: validParentRoute ? "temporary" : "main",
                    parent_route_id: validParentRoute?.id || null,
                    nodes: nodes
                })
            });
        } else {
            const terminalNode = terminalEditor.node
            await apiFetch("/insertTerminal", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    terminal_name: terminalName || "Unnamed Terminal",
                    coordinates: {
                        latitude: terminalNode.coordinates[1],
                        longitude: terminalNode.coordinates[0]
                    }
                })
            });
        }

        clearDrawnTerminal();
        reloadTerminalsTableData(1)

        if (editingTerminalId) {
            exitEditMode();
        }

        showSuccess("Successfully saved Terminal!");
    } catch (err) {
        console.error(err);
        showError("Failed to save Terminal.");
    }
});

async function reloadTerminalsTableData(pageNumber = 1) {
    $("#tableLoading").removeClass("hidden");

    try {
        const { terminals_data, row_count, total_pages } = await apiFetch(`/getTerminals/${pageNumber}`, {
            method: "GET",
            headers: { "Content-Type": "application/json" }
        });

        const terminals = terminals_data || [];
        currentPage = pageNumber;
        totalPages = total_pages;
        totalRows = row_count;

        renderTerminalsTable(terminals, $("#terminalsTableBody"));
        renderPagination();
    } catch (err) {
        console.error(err);
        // TODO: showError() is not defined
        showError("Failed to load Jeep Terminals into table.");
    } finally {
        $("#tableLoading").addClass("hidden");
    }
}

function clearDrawnTerminal() {
    terminalEditor.clear();
    terminalNameInput.val("");
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

        btn.on("click", () => reloadTerminalsTableData(i));

        pageContainer.append(btn);
    }
}