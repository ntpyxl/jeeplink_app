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

const terminalRenderer = new TerminalRenderer({ map });
await terminalRenderer.displayTerminals();

const terminalEditor = new TerminalEditor({ map });

let editingTerminalId = null;
const terminalNameInput = $("#drawnJeepTerminalName");
const editTerminalFields = $("#editTerminalFields");
const deleteModal = $("#deleteModal");
const deleteTerminalIdInput = $("#deleteTerminalId");
const deleteTerminalNameLabel = $("#deleteTerminalName");
const cancelDeleteBtn = $("#cancelDelete");
const confirmDeleteBtn = $("#confirmDelete");

async function enterEditMode(terminal) {
    editingTerminalId = terminal.id;
    const terminalData = terminalRenderer.terminals.find(terminal => terminal.id === editingTerminalId);

    terminalNameInput.val(terminal.terminal_name);
    editTerminalFields.removeClass("hidden");
    $("#cancelEditTerminal").removeClass("hidden");

    $("#saveDrawnTerminal")
        .removeClass("bg-[#35903A] text-white hover:bg-[#2f7a33]")
        .addClass("bg-yellow-400 text-black hover:bg-yellow-500 shadow-sm")
        .html('<i class="fas fa-save"></i><span> Save Terminal</span>');

    terminalEditor.clear();
    terminalRenderer.hide();
    terminalRenderer.displayTerminals({exceptTerminalId: editingTerminalId});
    
    const isMobile = window.innerWidth <= 768;
    map.flyTo(
        [terminalData.latitude, terminalData.longitude],
        isMobile ? 14 : 17, { duration: 0.6 }
    );

    terminalEditor.createNode(terminalData.latitude, terminalData.longitude)
}

function exitEditMode(returnToTop = false) {
    editingTerminalId = null;
    terminalNameInput.val("");
    editTerminalFields.addClass("hidden");
    $("#cancelEditTerminal").addClass("hidden");

    terminalRenderer.reload();
    clearDrawnTerminal();

    $("#saveDrawnTerminal")
        .removeClass("bg-yellow-400 text-black hover:bg-yellow-500 shadow-sm")
        .addClass("bg-[#35903A] text-white hover:bg-[#2f7a33]")
        .text("+ Add Terminal");

    if(returnToTop) $("html, body").animate({ scrollTop: 0 }, 500);
}

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

    const terminalNode = terminalEditor.node
    try {       
        if (editingTerminalId) {
            await apiFetch("/updateTerminal", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    terminal_id: editingTerminalId,
                    terminal_name: terminalName || "Unnamed Terminal",
                    coordinates: {
                        latitude: terminalNode.coordinates[1],
                        longitude: terminalNode.coordinates[0]
                    }
                })
            });
        } else {
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
        terminalRenderer.reload();
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

$("#cancelEditTerminal").on("click", () => {
    exitEditMode(true);
});

$("#terminalsTableBody").on("click", ".edit-terminal-btn", function() {
    const terminalId = parseInt($(this).data("terminal-id"));
    const terminalData = terminalRenderer.terminals.find(terminal => terminal.id === terminalId);
    if (!terminalData) return;

    const offset = 175;
    $("html, body").animate({ scrollTop: Math.max(0, $("#map").offset().top - offset) }, 500);

    enterEditMode(terminalData);
});

$("#terminalsTableBody").on("click", ".delete-terminal-btn", function() {
    const terminalId = $(this).data("terminal-id");
    const terminalData = terminalRenderer.terminals.find(terminal => terminal.id === terminalId);
    if (!terminalData) return;

    deleteTerminalIdInput.val(terminalId);
    deleteTerminalNameLabel.text(terminalData.name);
    deleteModal.removeClass("hidden").addClass("flex");
});

cancelDeleteBtn.on("click", () => {
    deleteModal.removeClass("flex").addClass("hidden");
});

confirmDeleteBtn.on("click", async () => {
    const terminalId = deleteTerminalIdInput.val();

    try {
        await apiFetch("/deleteTerminal", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                terminal_id: terminalId
            })
        });

        deleteModal.removeClass("flex").addClass("hidden");
        clearDrawnTerminal();
        terminalRenderer.reload();
        reloadTerminalsTableData(1)
        showSuccess("Successfully deleted Terminal!");
    } catch (err) {
        console.error(err);
        showError("Failed to delete Terminal.");
    }
});

let terminalDataSearchQuery = null;
let searchTimeout = null;

$("#terminalSearch").on("input", function () {
    clearTimeout(searchTimeout);

    searchTimeout = setTimeout(() => {
        terminalDataSearchQuery = $(this).val().trim() || null;
        reloadTerminalsTableData(1, terminalDataSearchQuery);
    }, 500);
});

async function reloadTerminalsTableData(pageNumber = 1, searchQuery = null) {
    $("#tableLoading").removeClass("hidden");

    try {
        let url = `/getTerminals/${pageNumber}`;

        if (searchQuery) {
            url += `?search_query=${encodeURIComponent(searchQuery.trim())}`;
        } else {
            $("#routeSearch").val("");
        }

        const { terminals_data, row_count, total_pages } = await apiFetch(url, {
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

        btn.on("click", () => reloadTerminalsTableData(i, terminalDataSearchQuery));

        pageContainer.append(btn);
    }
}