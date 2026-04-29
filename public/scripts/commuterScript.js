import { GraphHelper } from "./core/graphHelper.js";
import { CommuterRouter } from "./core/commuterRouter.js";
import { SavedRouteRenderer } from "./core/savedRouteRenderer.js";
import { TerminalRenderer } from "./core/terminalRenderer.js";
import { setupLocationSearch, setupNamedLocations, getCurrentLocation } from "./core/search/locationSearchAutocomplete.js";
import { apiFetch } from "./core/jeeplinkApiFetcher.js";
import { snapToRoad } from "./helper/snapToRoadFunction.js";
import { createRouteInformationCard, createRouteTotalPrices, createRouteStepRow, updateHighlightedRouteStepRow } from "./ui/routeInformationElements.js"
import { updateControlsPosition, closeRoutesPanel, showPageLoader, hidePageLoader } from "./ui/commuterStylingScript.js"
import { watchUserPosition, simulateUserPosition } from "./commuterFollowRouteScript.js"
import { invokeLoadingState } from "./ui/commuterStylingScript.js"

showPageLoader([
    "Loading map data...",
    "Checking jeepney routes...",
    "Mapping out terminal locations...",
    "Starting your journey..."
]);

// TODO: Put into class since most scripts are just using the same shit for these
const map = L.map("map", {
    renderer: L.canvas(),
    minZoom: 12,
    maxZoom: 18,
    zoomControl: false
}).setView([14.3202, 120.9404], 13);

map.createPane("routePane");
map.createPane("nodePane");
map.createPane("userPositionPane")
map.getPane("routePane").style.zIndex = 400;
map.getPane("nodePane").style.zIndex = 500;
map.getPane("userPositionPane").style.zIndex = 600;

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: 'Map data from <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
}).addTo(map);

// Map Controls
$("#zoomInBtn").on("click", () => {
    map.zoomIn();
}) 
$("#zoomOutBtn").on("click", () => {
    map.zoomOut();
})

// TODO: Tentative way of handling positions for user marker and for tracking user in route below. May be optimized in the future.
// For now, this should work.
let userMarker;
let userMarker_watchLocation;
let userMarker_stopSimulationFunction;
let currentUserMarkerPosition = null;

function handleUserMarkerUpdate(location) {
    currentUserMarkerPosition = [location.coords[1], location.coords[0]]

    if (!userMarker) {
        userMarker = L.circleMarker(currentUserMarkerPosition, {
            radius: 8,
            color: "#120eff",
            fillColor: "#64e8ff",
            fillOpacity: 1,
            weight: 3,
            pane: "userPositionPane"
        }).addTo(map);
    } else {
        userMarker.setLatLng(currentUserMarkerPosition);
    }
}

// Uncomment either one, but not both
// Uncomment userMarker_watchLocation for actual user position tracking
// Uncomment userMarker_stopSimulationFunction to simulate user position tracking. The cursor position on the map will then be used to simulate the user's position.

userMarker_watchLocation = watchUserPosition(handleUserMarkerUpdate);
//userMarker_stopSimulationFunction = simulateUserPosition(map, handleUserMarkerUpdate);

$("#locateBtn").on("click", () => {
    map.flyTo(currentUserMarkerPosition, 16);
});

// Fetch and setup required JSON files
const roadsPromise = fetch("../api/getBlobFile?filename=Dasma_LineStrings-AllRoads.geojson")
    .then(r => r.json());

const pointsPromise = fetch("../api/getBlobFile?filename=Dasma_Points.geojson")
    .then(r => r.json());

const fareMatrixPromise = apiFetch("/getFareMatrix", {
    method: "GET",
    headers: { "Content-Type": "application/json" }
});

const [roadsGeoJSON, pointsGeoJSON, fareMatrix] = await Promise.all([
    roadsPromise,
    pointsPromise,
    fareMatrixPromise
]);
setupNamedLocations(pointsGeoJSON);

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
})

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
const savedRouteRenderer = new SavedRouteRenderer({
    map: map,
    roadsGeoJSON: roadsGeoJSON,
    graphHelper: graphHelper
});
const terminalRenderer = new TerminalRenderer({ map: map })
const routeGenerated = new CommuterRouter({
    map: map,
    roadsGeoJSON: roadsGeoJSON,
    graphHelper: graphHelper,
    fareMatrix: fareMatrix,
    addInteractability: false
});

$("#toggleJeepRoutes").on("click", async () => {
    savedRouteRenderer.toggle();
})

$("#toggleJeepTerminals").on("click", async () => {
    terminalRenderer.toggle();
})

function addRouteNode(data, type = null) {
    const latlng = data.coords;
    const snapped = snapToRoad({lat: latlng[1], lng: latlng[0]}, roadsGeoJSON);
    const graphNodeKey = graphHelper.insertTemporaryNode(
        snapped.coordinates,
        snapped.segmentA,
        snapped.segmentB
    );    

    const node = {
        id: crypto.randomUUID(),
        coordinates: data.coords,
        roadId: snapped.roadId,
        graphKey: graphNodeKey
    };

    routeGenerated.addNode({node: node, type: type, name: data.name});
}

let activeStart = localStorage.getItem("start");
let activeDstination = localStorage.getItem("destination");

async function checkActiveRoute() {
    if(activeStart && activeDstination && localStorage.getItem("activeRoute")) {
        $("#goNow").addClass("pointer-events-none opacity-50 cursor-not-allowed");
        
        const result = await jeeplinkSwal.fire({
            icon: "question",
            title: "Active route detected",
            text: "Do you want to continue following this route?",
            showConfirmButton: true,
            showDenyButton: true,
            confirmButtonText: "Yes",
            denyButtonText: "No",

            allowOutsideClick: false, 
            allowEscapeKey: false
        });
            
        if(result.isDenied) {
            localStorage.removeItem("start");
            localStorage.removeItem("destination");
            localStorage.removeItem("activeRoute");
            localStorage.removeItem("activeRoute_currentStep");
            activeStart = null;
            activeDstination = null;

            $("#goNow").removeClass("pointer-events-none opacity-50 cursor-not-allowed");
        }
    }
}
await checkActiveRoute();

const start = sessionStorage.getItem("start") || localStorage.getItem("start");
const destination = sessionStorage.getItem("destination") || localStorage.getItem("destination");

let startingPoint = null;
let destinationPoint = null;
let isStartingPointSelectedLocation = false;
let isDestinationPointSelectedLocation = false;

let completeRouteInformation = null;
let routesStepCoords = null;
let currentRoute = 0;
let totalRoutes = 0;

routeGenerated.clear();

if (start) {
    startingPoint = JSON.parse(start);
    isStartingPointSelectedLocation = true;
    sessionStorage.removeItem("start");
    if(!localStorage.getItem("activeRoute") && sessionStorage.getItem("start")) localStorage.removeItem("start");
    $("#startingPointField").val(startingPoint.name);
    updateGoNowButton();
    addRouteNode(startingPoint, "start");
}

if (destination) {
    destinationPoint = JSON.parse(destination);
    isDestinationPointSelectedLocation = true;
    sessionStorage.removeItem("destination");
    if(!localStorage.getItem("activeRoute") && sessionStorage.getItem("destination")) localStorage.removeItem("start");
    $("#destinationPointField").val(destinationPoint.name);
    addRouteNode(destinationPoint, "destination");
}

if (!(start && destination)) {
    hidePageLoader();
}

if (start && destination) {
    $("#goNow").addClass("pointer-events-none opacity-50 cursor-not-allowed");

    invokeLoadingState();
    $("#routePanel")
        .hide()
        .removeClass("hidden")
        .fadeIn(200);

    routeGenerated.clear();

    addRouteNode(startingPoint, "start");
    addRouteNode(destinationPoint, "destination");

    ({ completeRouteInformation, routesStepCoords } = await routeGenerated.getAndDisplayRoutes());
    setActiveRoute(currentRoute)
    renderRoutes(completeRouteInformation);

    hidePageLoader();
}

const startingPointSearch = setupLocationSearch({
    field: $("#startingPointField"),
    map: map,
    suggestionBox: $("#startingSuggestions"),
    onSelect: (location) => {
        startingPoint = location;
        addRouteNode(startingPoint, "start");
        isStartingPointSelectedLocation = true;
        updateGoNowButton();
    }
});
$("#startingPointField").on("input", () => {
    isStartingPointSelectedLocation = false;
    updateGoNowButton();
})

const destinationPointSearch = setupLocationSearch({
    field: $("#destinationPointField"),
    map: map,
    suggestionBox: $("#destinationSuggestions"),
    onSelect: (location) => {
        destinationPoint = location;
        addRouteNode(destinationPoint, "destination");
        isDestinationPointSelectedLocation = true;
    }
});
$("#destinationPointField").on("input", () => {
    isDestinationPointSelectedLocation = false;
})

$("#calculateRouteButton").on("click", async () => {
    if(!destinationPoint) return;
    if(!startingPoint) {
        startingPoint = await getCurrentLocation();
        $("#startingPointField").val(startingPoint.name);
        isStartingPointSelectedLocation = true;
    }

    updateGoNowButton();

    if(!isStartingPointSelectedLocation) {
        startingPoint = await startingPointSearch.flush();
        $("#startingPointField").val(startingPoint.name);
    }
    if(!isDestinationPointSelectedLocation) {
        destinationPoint = await destinationPointSearch.flush();
        $("#destinationPointField").val(destinationPoint.name);
    }

    $("#goNow").addClass("pointer-events-none opacity-50 cursor-not-allowed");

    invokeLoadingState();
    $("#routePanel")
        .hide()
        .removeClass("hidden")
        .fadeIn(200);

    routeGenerated.clear();

    addRouteNode(startingPoint, "start");
    addRouteNode(destinationPoint, "destination");

    ({ completeRouteInformation, routesStepCoords } = await routeGenerated.getAndDisplayRoutes());
    console.log(completeRouteInformation); // TODO: Remove later
    setActiveRoute(currentRoute)
    renderRoutes(completeRouteInformation);
})

function updateGoNowButton() {
    if($("#startingPointField").val() !== "Your Location") {
        $("#goNow").addClass("pointer-events-none opacity-50 cursor-not-allowed");
    } else {
        $("#goNow").removeClass("pointer-events-none opacity-50 cursor-not-allowed");
    }
}

function renderRoutes(routeInformation) {
    updateGoNowButton();
    $("#routeSlider").empty(); 
    $("#routePanel").removeClass("hidden");
    
    // Show the plan your route toggle header again after calculation is done
    $("#toggleCommute").stop(true, true).slideDown(250);
    
    updateControlsPosition();

    const routes = [
        routeInformation.fastestRouteInformation,
        routeInformation.cheapestRouteInformation,
        routeInformation.minimalTransferRouteInformation
    ];

    totalRoutes = routes.length;

    routes.forEach(route => {
        const instructions =
            route.fastestRouteInstructions ||
            route.cheapestRouteInstructions ||
            route.minimalTransferRouteInstructions ||
            [];
            
        const routeSteps = instructions
            .map((step, i) => createRouteStepRow(step, i)[0].outerHTML)
            .join("");
        const routePrices = createRouteTotalPrices(route.routeInformation.routeCost)[0].outerHTML;
        $("#routeSlider").append(createRouteInformationCard(route.routeInformation.title, route.routeInformation, routeSteps, routePrices));
    });

    updateSlider();

    if (!localStorage.getItem("activeRoute")) {
        $("#routeNav").removeClass("hidden");
        $("#routeIndicator").removeClass("mx-auto");
    } else {
        $("#routeNav").addClass("hidden");
        $("#routeIndicator").addClass("mx-auto");
    }
    
    // Animate cards after render
    setTimeout(() => {
        $(".route-card").each(function (i) {
            $(this).delay(i * 120).queue(function (next) {
                $(this).removeClass("opacity-0 translate-y-4")
                    .addClass("opacity-100 translate-y-0 transition-all duration-500 ease-out");
                next();
            });
        });
    }, 50);
}

// Toggle fare display between regular and discounted prices
$(document).on("click", ".price-toggle-btn", function () {
    const button = $(this);
    const mode = button.data("mode");
    const card = button.closest(".route-card");

    card.find(".price-toggle-btn").removeClass("active text-[#004F11] bg-[#E9CD2D]/20").addClass("text-gray-500 bg-transparent");
    button.addClass("active text-[#004F11] bg-[#E9CD2D]/20").removeClass("text-gray-500 bg-transparent");

    card.find(".fare-value").addClass("hidden");
    card.find(`.fare-value-${mode}`).removeClass("hidden");
    card.find(".fare-mode-regular, .fare-mode-discounted").addClass("hidden");
    card.find(`.fare-mode-${mode}`).removeClass("hidden");

    const label = mode === "regular" ? "Regular:" : "Discounted:";
    card.find(".fare-label").text(label);
});

// ---------- ROUTE SLIDER ----------
function updateSlider() {
    $("#routeSlider").css("transform", `translateX(-${currentRoute * 100}%)`);
    $("#routeIndicator").text(`${currentRoute + 1} / ${totalRoutes}`);
}

$("#nextRoute").on("click", function () {
    if (currentRoute < totalRoutes - 1) {
        currentRoute++;
        updateSlider();
        setActiveRoute(currentRoute);
    }
});

$("#prevRoute").on("click", function () {
    if (currentRoute > 0) {
        currentRoute--;
        updateSlider();
        setActiveRoute(currentRoute);
    }
});

function setActiveRoute(currentRouteIndex, hideInactiveRoute = false) {
    const routeKeys = ["fastest", "cheapest", "minimalTransfers"];
    const activeKey = routeKeys[currentRouteIndex];

    Object.entries(routeGenerated.routeLayers).forEach(([key, layerGroup]) => {
        if (!layerGroup) return;

        layerGroup.eachLayer(layer => {
            const mode = layer.options.mode;

            if (key === activeKey) {
                if (mode === "jeep") {
                    layer.setStyle({ color: "#1E90FF", opacity: 1 });
                } else {
                    layer.setStyle({ color: "#666", opacity: 1 });
                }

                layer.bringToFront();
            } else {
                if (mode === "jeep") {
                    layer.setStyle({ color: "#888", opacity: hideInactiveRoute ? 0 : 1 });
                } else {
                    layer.setStyle({ color: "#888", opacity: hideInactiveRoute ? 0 : 1 });
                }
            }
        });
    });

    updateSlider();
}

const nearStopNotificationAudio = new Audio("/audio/commuter_near_stop_notification.mp3");
const arrivedNotificationAudio = new Audio("/audio/commuter_arrived_destination_notification.mp3");

function playNearStopNotification() {
    nearStopNotificationAudio.currentTime = 0;
    nearStopNotificationAudio.play();
}

function playArrivedNotification() {
    arrivedNotificationAudio.currentTime = 0;
    arrivedNotificationAudio.play();
}

function resetNavigationState() {
    localStorage.removeItem("start");
    localStorage.removeItem("destination");
    localStorage.removeItem("activeRoute");
    localStorage.removeItem("activeRoute_currentStep");
    
    // Reset button state
    $("#goNow")
        .html('<i class="fa fa-location-arrow pe-2"></i><span>Go Now!</span>')
        .removeClass("from-[#dc2626] to-[#ef4444] hover:from-[#e11d48] hover:to-[#f43f5e] active:from-[#b91c1c] active:to-[#dc2626]")
        .addClass("from-[#004F11] to-[#1f7a3a] hover:from-[#006b1c] hover:to-[#2e8b4a] active:from-[#00380c] active:to-[#145a2a]");
        
    $("#routeTitle").text("Suggested Routes");
    closeRoutesPanel();
    
    $("#commuteContent").stop(true, true).slideDown(250);
    $("#toggleCommute").show();
    $("#arrow").removeClass("rotate-180");
    
    // Show route navigation controls again
    $("#routeNav").removeClass("hidden");
    $("#routeIndicator").removeClass("mx-auto");
}

$("#goNow").on("click", async (e) => {
    // Prevent click if button is disabled
    if ($("#goNow").hasClass("pointer-events-none")) {
        e.preventDefault();
        return;
    }
    
    // Check if currently following a route (ending navigation)
    if (localStorage.getItem("activeRoute")) {
        const isConfirmed = await confirmAction("Do you want to end navigation?");
        
        if (isConfirmed) {
            // Stop tracking and clear route data
            stopAllTracking();
            resetNavigationState();
        }
        return;
    }
    
    // Starting navigation (normal flow)
    // Hide Pagination
    $("#routeNav").addClass("hidden");
    $("#routeIndicator").addClass("mx-auto");

    localStorage.setItem("activeRoute", currentRoute);
    localStorage.setItem("start", JSON.stringify(startingPoint));
    localStorage.setItem("destination", JSON.stringify(destinationPoint));

    followRoute()
})

let followRoute_watchLocation = null;
let followRoute_stopSimulationFunction = null;

let deviationChecker = null;

if(localStorage.getItem("activeRoute")) {
    currentRoute = parseInt(localStorage.getItem("activeRoute"));
    followRoute();
    updateSlider();
}

async function followRoute() {
    const routeNames = [
        "fastestStepCoords",
        "cheapestStepCoords",
        "minimalTransferStepCoords"
    ];
    const activeRouteName = routeNames[currentRoute];

    const jeepRidesIdList = completeRouteInformation.fastestRouteInformation.routeInformation.jeepRidesIdList;

    const finalStepCoordIndex = routesStepCoords[activeRouteName].length;
    let stepCoordIndex = parseInt(
        JSON.parse(localStorage.getItem("activeRoute_currentStep"))?.stepCoordIndex
    ) || 0;
    let isUserNotifiedBeingNearStop = false;
    let isUserNotifiedDeviatingFromRoute = false;

    const routeLine = turf.lineString(
        routesStepCoords[activeRouteName].map(s => [s.coord[0], s.coord[1]])
    );

    let latestDistanceFromRoute = 0;
    let latestIsCurrentRouteInJeepney = false;

    let deviationStartTime = null;

    const deviationThreshold = 80;
    const confirmationMs = 10000;

    showNotification({title: "Navigation started!", icon: "info"});

    updateHighlightedRouteStepRow(stepCoordIndex + 1);

    map.flyTo(currentUserMarkerPosition, 16);
    setActiveRoute(currentRoute, true)
    $("#routeTitle").text("Following Route");
    $("#goNow")
        .html('<i class="fa fa-stop-circle pe-2"></i><span> End Navigation</span>')
        .removeClass("from-[#004F11] to-[#1f7a3a] hover:from-[#006b1c] hover:to-[#2e8b4a] active:from-[#00380c] active:to-[#145a2a]")
        .addClass("from-[#dc2626] to-[#ef4444] hover:from-[#e11d48] hover:to-[#f43f5e] active:from-[#b91c1c] active:to-[#dc2626]");      
    $("#commuteContent").stop(true, true).slideUp(250);
    $("#toggleCommute").hide();
    $("#arrow").addClass("rotate-180");

    updateControlsPosition();

    deviationChecker = setInterval(() => {
        if (latestDistanceFromRoute > deviationThreshold && latestIsCurrentRouteInJeepney && !isUserNotifiedDeviatingFromRoute) {
            if (!deviationStartTime) deviationStartTime = Date.now();
            
            const elapsed = Date.now() - deviationStartTime;
            if (elapsed >= confirmationMs) {
                showNotification({
                    title: "Possible jeep route deviation",
                    description: "Feel like your jeepney deviated from its route? Feel free to report it as an issue!",
                    icon: "info"
                });

                isUserNotifiedDeviatingFromRoute = true;
                deviationStartTime = null;
            }
        } else {
            deviationStartTime = null;
        }

        // Reset when back near route
        if (latestDistanceFromRoute <= deviationThreshold - 15 && isUserNotifiedDeviatingFromRoute) isUserNotifiedDeviatingFromRoute = false;
    }, 1000);

    if (stepCoordIndex >= finalStepCoordIndex) return;
    function handleNavigationUpdate(location) {
        const nextStopCoordinates = routesStepCoords[activeRouteName][stepCoordIndex].coord;
        const isCurrentRouteInJeepney = routesStepCoords[activeRouteName][stepCoordIndex].mode === "jeep";

        const distance = turf.distance(
            turf.point([location.coords[1], location.coords[0]]),
            turf.point(nextStopCoordinates),
            { units: "meters" }
        );

        const userPoint = turf.point([location.coords[1], location.coords[0]]);
        const distanceFromRoute = turf.pointToLineDistance(userPoint, routeLine, {
            units: "meters"
        });

        latestDistanceFromRoute = distanceFromRoute;
        latestIsCurrentRouteInJeepney = isCurrentRouteInJeepney;

        if (distance < 120 && !isUserNotifiedBeingNearStop) {
            console.log("User is within 120m of next stop.");
            if(isCurrentRouteInJeepney) {
                playNearStopNotification();
                showNotification({
                    title: "Approaching stop",
                    description: "You are ~100m near your stop!",
                    icon: "info"
                });
            }
            isUserNotifiedBeingNearStop = true;
        }

        if (distance < 20) {
            console.log("Reached step:", stepCoordIndex);
            stepCoordIndex++;
            isUserNotifiedBeingNearStop = false;
            updateHighlightedRouteStepRow(stepCoordIndex + 1);
            localStorage.setItem("activeRoute_currentStep", JSON.stringify({
                stepCoordIndex: stepCoordIndex,
                currentJeepRouteId: jeepRidesIdList[stepCoordIndex]
            }));
        }

        if (stepCoordIndex >= finalStepCoordIndex) {
            console.log("User has reached destination");
            updateHighlightedRouteStepRow();
            playArrivedNotification();
            showNotification({
                title: "You have arrived at your destination!",
                icon: "success"
            });

            stopAllTracking();
            resetNavigationState();
            
            localStorage.removeItem("start");
            localStorage.removeItem("destination");
            localStorage.removeItem("activeRoute");
            localStorage.removeItem("activeRoute_currentStep");
        }
    }

    // Uncomment either one, but not both
    // Uncomment followRoute_watchLocation for actual user position tracking
    // Uncomment followRoute_stopSimulationFunction to simulate user position tracking. The cursor position on the map will then be used to simulate the user's position.
    
    //followRoute_watchLocation = watchUserPosition(handleNavigationUpdate);
    followRoute_stopSimulationFunction = simulateUserPosition(map, handleNavigationUpdate);
}

function stopAllTracking() {
    clearInterval(deviationChecker);

    if (followRoute_watchLocation !== null) {
        navigator.geolocation.clearWatch(followRoute_watchLocation);
        followRoute_watchLocation = null;
    }

    if (followRoute_stopSimulationFunction) {
        followRoute_stopSimulationFunction();
        followRoute_stopSimulationFunction = null;
    }
}