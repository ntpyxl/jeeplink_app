import { GraphHelper } from "./core/graphHelper.js";
import { CommuterRouter } from "./core/commuterRouter.js";
import { SavedRouteRenderer } from "./core/savedRouteRenderer.js";
import { setupLocationSearch, setupNamedLocations, getCurrentLocation } from "./core/search/locationSearchAutocomplete.js";
import { apiFetch } from "./core/jeeplinkApiFetcher.js";
import { snapToRoad } from "./helper/snapToRoadFunction.js";
import { createRouteInformationCard, createRouteTotalPrices, createRouteStepRow } from "./ui/routeInformationElements.js"
import { updateControlsPosition } from "./ui/commuterStylingScript.js"
import { watchUserPosition, simulateUserPosition } from "./commuterFollowRouteScript.js"

// TODO: Put into class since most scripts are just using the same shit for these
const map = L.map("map", {
    renderer: L.canvas(),
    minZoom: 12,
    maxZoom: 18,
    zoomControl: false
}).setView([14.3272, 120.9404], 15);
map.createPane("routePane");
map.createPane("nodePane");
map.getPane("routePane").style.zIndex = 400;
map.getPane("nodePane").style.zIndex = 500;

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: 'Map data from <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
}).addTo(map);
// Map Controls
document.getElementById("zoomInBtn").addEventListener("click", () => map.zoomIn());
document.getElementById("zoomOutBtn").addEventListener("click", () => map.zoomOut());
document.getElementById("locateBtn").addEventListener("click", () => {
    map.locate({ setView: true, maxZoom: 16 });
});

map.on("locationfound", (e) => {
    L.circleMarker(e.latlng, {
        radius: 8,
        color: "#004F11",
        fillColor: "#2E7D32",
        fillOpacity: 0.9,
        weight: 2
    }).addTo(map).bindPopup("You are here").openPopup();
});

map.on("locationerror", () => {
    showError("Unable to find your location. Please allow location access.");
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

    routeGenerated.addNode({node: node, type: type});
}

let activeStart = localStorage.getItem("start");
let activeDstination = localStorage.getItem("destination");

async function checkActiveRoute() {
    if(activeStart && activeDstination && localStorage.getItem("activeRoute")) {
        const jeeplinkSwal = Swal.mixin({
            background: "#ffffff",
            color: "black",
            confirmButtonColor: "#2f7a33",
            customClass: {
                popup: " shadow-lg rounded-3",
                title: "fw-bold",
            },
        });

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

if (start && destination) {
    $("#routePanel")
        .hide()
        .removeClass("hidden")
        .fadeIn(200);

    routeGenerated.clear();

    addRouteNode(startingPoint, "start");
    addRouteNode(destinationPoint, "destination");

    ({ completeRouteInformation, routesStepCoords } = await routeGenerated.getAndDisplayRoutes());
    renderRoutes(completeRouteInformation);
}

const startingPointSearch = setupLocationSearch({
    field: $("#startingPointField"),
    map: map,
    suggestionBox: $("#startingSuggestions"),
    onSelect: (location) => {
        startingPoint = location;
        addRouteNode(startingPoint, "start");
        isStartingPointSelectedLocation = true;
    }
});
$("#startingPointField").on("input", () => {
    isStartingPointSelectedLocation = false;
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
    if(!isStartingPointSelectedLocation) {
        startingPoint = await startingPointSearch.flush();
        $("#startingPointField").val(startingPoint.name);
    }
    if(!isDestinationPointSelectedLocation) {
        destinationPoint = await destinationPointSearch.flush();
        $("#destinationPointField").val(destinationPoint.name);
    }
    if(!startingPoint) {
        startingPoint = await getCurrentLocation();
        $("#startingPointField").val(startingPoint.name);
    }
    if(!destinationPoint) return;

    $("#routePanel")
        .hide()
        .removeClass("hidden")
        .fadeIn(200);

    routeGenerated.clear();

    addRouteNode(startingPoint, "start");
    addRouteNode(destinationPoint, "destination");

    ({ completeRouteInformation, routesStepCoords } = await routeGenerated.getAndDisplayRoutes());
    renderRoutes(completeRouteInformation);
})

function renderRoutes(routeInformation) {
    if($("#startingPointField").val() !== "Your Location") {
        $("#goNow").addClass("hidden");
    } else {
        $("#goNow").removeClass("hidden");
    }
    $("#routeSlider").empty(); 
    $("#routePanel").removeClass("hidden");
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

function setActiveRoute(currentRouteIndex) {
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
                    layer.setStyle({ color: "#666666", opacity: 1 });
                } else {
                    layer.setStyle({ color: "#888", opacity: 1 });
                }
            }
        });
    });

    updateSlider();
}

const nearStop_120m_NotificationAudio = new Audio("/audio/commuter_120_meter_near_jeep_stop.mp3");

function playNearStopNotification() {
    nearStop_120m_NotificationAudio.currentTime = 0;
    nearStop_120m_NotificationAudio.play();
}

$("#goNow").on("click", () => {
    localStorage.setItem("activeRoute", currentRoute);
    localStorage.setItem("start", JSON.stringify(startingPoint));
    localStorage.setItem("destination", JSON.stringify(destinationPoint));

    followRoute()
})

if(localStorage.getItem("activeRoute")) {
    followRoute()
}

async function followRoute() {
    $("#commuteContent").stop(true, true).slideUp(250);
    $("#arrow").addClass("rotate-180");

    if (Notification.permission !== "granted") {
        await Notification.requestPermission();
    }

    const finalStepCoordIndex = routesStepCoords.fastestStepCoords.length;
    let stepCoordIndex = localStorage.getItem("activeRoute_currentStep") || 0;
    let isUserNotifiedBeingNearStop = false;

    function handleNavigationUpdate(location) {
        const nextStopCoordinates = routesStepCoords.fastestStepCoords[stepCoordIndex].coord;

        const distance = turf.distance(
            turf.point([location.coords[1], location.coords[0]]),
            turf.point(nextStopCoordinates),
            { units: "meters" }
        );

        if (distance < 120 && !isUserNotifiedBeingNearStop) {
            console.log("User is within 120m of next stop.");
            if(routesStepCoords.fastestStepCoords[stepCoordIndex].mode === "jeep") {
                playNearStopNotification();
                if (Notification.permission === "granted") new Notification("Approaching your stop");
                navigator.vibrate?.([200,100,200]);
            }
            isUserNotifiedBeingNearStop = true;
        }

        if (distance < 5) {
            console.log("Reached step:", stepCoordIndex);
            stepCoordIndex++;
            isUserNotifiedBeingNearStop = false;
            localStorage.setItem("activeRoute_currentStep", stepCoordIndex);
        }

        if (stepCoordIndex >= finalStepCoordIndex) {
            stopAllTracking();
            console.log("User has reached destination");
        }
    }

    let watchId = null;
    let stopSimulationFunction = null;

    function stopAllTracking() {
        if (watchId !== null) {
            navigator.geolocation.clearWatch(watchId);
            watchId = null;
        }

        if (stopSimulationFunction) {
            stopSimulationFunction();
            stopSimulationFunction = null;
        }
    }

    // Uncomment either one, but not both
    // Uncomment watchId for actual user position tracking
    // Uncomment stopSimulationFunction to simulate user position tracking. The cursor position on the map will then be used to simulate the user's position.
    
    watchId = watchUserPosition(handleNavigationUpdate);
    //stopSimulationFunction = simulateUserPosition(map, handleNavigationUpdate);
}