import { apiFetch } from "../core/jeeplinkApiFetcher.js";
import { snapToRoad } from "../helper/snapToRoadFunction.js";

export class CommuterRouter {
    constructor({ map, roadsGeoJSON, graphHelper, fareMatrix, addInteractability = false }) {
        this.map = map;
        this.roadsGeoJSON = roadsGeoJSON;
        this.graphHelper = graphHelper;
        this.fareMatrix = fareMatrix;
        this.addInteractability = addInteractability;

        this.nodes = [];
        this.routeLayers = {
            fastest: null,
            cheapest: null,
            minimalTransfers: null
        };
        this.allNodes = [];
        
        this.nodeLayer = new L.LayerGroup().addTo(this.map);
        this.keyToName = new Map();
    }

    addNode({ node, index = null, type = null, name = null }) {
        if (type === "start") {
            if (this.nodes[0]) {
                this.nodeLayer.removeLayer(this.nodes[0].layer);
                this.nodes[0] = node;
            } else {
                this.nodes.unshift(node);
            }
        } else if (type === "destination") {
            const lastIndex = this.nodes.length;
            if (this.nodes[lastIndex]) {
                this.nodeLayer.removeLayer(this.nodes[lastIndex].layer);
                this.nodes[lastIndex] = node;
            } else {
                this.nodes.push(node);
            }
        } else {
            if (index === null) {
                this.nodes.push(node);
            } else {
                this.nodes.splice(index, 0, node);
            }
        }

        if (name) {
            this.keyToName.set(node.graphKey, name);
        }

        this.drawNode(node);
    }

    drawNode(node) {
        const marker = L.circleMarker(
            [node.coordinates[1], node.coordinates[0]],
            {
                radius: 6,
                color: "green",
                fillColor: "orange",
                fillOpacity: 1,
                weight: 2,
                pane: "nodePane"
            }
        ).addTo(this.nodeLayer);

        node.layer = marker;

        if(this.addInteractability) this.addNodeInteractability(node, marker, this.map);
    }

    async getAndDisplayRoutes() {
        if (this.nodes.length < 2) return;

        // Collect definitions for any "temporary" nodes (clicked points in middle of roads)
        const tempNodeDefinitions = this.nodes.map(node => ({
            id: node.graphKey,
            neighbors: this.graphHelper.graph.get(node.graphKey) || [] // This includes the distances to segment A and segment B
        }));
        
        const response = await apiFetch("/calculateRoute", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                nodes: [this.nodes.map(n => n.graphKey)],
                tempNodes: tempNodeDefinitions
            })
        });

        const { paths } = await response;

        this.allNodes = [];

        const fastestStepCoords = this.drawSingleRoute(paths.fastestRoute.routePath, "fastest", "#1E90Ff", 6);
        const cheapestStepCoords = this.drawSingleRoute(paths.cheapestRoute.routePath, "cheapest", "#303030", 6);
        const minimalTransferStepCoords = this.drawSingleRoute(paths.minimalTransferRoute.routePath, "minimalTransfers", "#303030", 6);

        const isMobile = window.innerWidth <= 768;
        this.map.fitBounds(L.latLngBounds(this.allNodes), {
            paddingTopLeft: isMobile ? [60, 100] : [200, 120],
            paddingBottomRight: isMobile ? [60, 180] : [50, 120],
            animate: true,
            duration: 0.6,
            maxZoom: isMobile ? 14 : 17,
            max: isMobile ? 14 : 17
        });

        const routeTypes = {
            fastest: paths.fastestRoute,
            cheapest: paths.cheapestRoute,
            minimalTransfer: paths.minimalTransferRoute
        };

        const completeRouteInformation = {};

        for (const [key, route] of Object.entries(routeTypes)) {
            if (!route) continue;

            const instructions = buildRouteInstructions(route.routePath);
            const info = buildRouteInformation(
                route,
                instructions,
                this.fareMatrix.fareMatrixData
            );

            completeRouteInformation[`${key}RouteInformation`] = {
                routeInformation: info,
                [`${key}RouteInstructions`]: formatInstructions(instructions, info.routeCost.individualRides, this.keyToName)
            };
        }
        
        return {
            "completeRouteInformation": completeRouteInformation,
            "routesStepCoords": {
                "fastestStepCoords": fastestStepCoords || null,
                "cheapestStepCoords": cheapestStepCoords || null,
                "minimalTransferStepCoords": minimalTransferStepCoords || null
            }
        };
    }

    drawSingleRoute(edges, type, jeep_color, weight) {
        // Remove existing layer for this route type
        if (this.routeLayers[type]) {
            this.map.removeLayer(this.routeLayers[type]);
        }

        const layerGroup = L.layerGroup().addTo(this.map);
        const keyToLatLng = k => k.split(",").map(Number).reverse();

        let prevMode = null;
        let prevRoute = null;
        let nextStepCoordArray = []
        for (let i = 0; i < edges.length; i++) {
            const edge = edges[i];

            const from = keyToLatLng(edge.from);
            const to = keyToLatLng(edge.to);

            this.allNodes.push(from, to);

            const modeChanged =
                edge.mode !== prevMode ||
                edge.route_name !== prevRoute;

            if (modeChanged && i > 0) {
                nextStepCoordArray.push({
                    "coord": from,
                    "mode": prevMode
                });
            }

            prevMode = edge.mode;
            prevRoute = edge.route_name;

            const style = edge.mode === "jeep"
                ? { color: jeep_color, weight: weight }
                : { color: "#666", weight: 4, dashArray: "6 6" };

            const segment = L.polyline([from, to], {
                color: style.color,
                dashArray: style.dashArray ?? "1",
                weight: style.weight,
                pane: "routePane"
            });
            segment.options.mode = edge.mode;

            layerGroup.addLayer(segment);
        }

        const last = edges[edges.length - 1];
        const lastTo = keyToLatLng(last.to);
        nextStepCoordArray.push({
            "coord": lastTo,
            "mode": prevMode
        });

        this.routeLayers[type] = layerGroup;

        if (this.addInteractability) {
            this.addRouteInteractability(layerGroup);
        }

        return nextStepCoordArray;
    }

    removeNode(nodeId) {
        const index = this.nodes.findIndex(n => n.id === nodeId);
        if (index === -1) return;

        const node = this.nodes[index];

        if (node.layer) {
            this.nodeLayer.removeLayer(node.layer);
        }

        this.nodes.splice(index, 1);
    }

    clear() {
        this.nodeLayer.clearLayers();
        this.nodes = [];

        if (this.routeLine) {
            this.map.removeLayer(this.routeLine);
            this.routeLine = null;
        }
    }

    getStartNode() {
        return this.nodes[0] ?? null;
    }

    getEndNode() {
        return this.nodes[this.nodes.length - 1] ?? null;
    }

    getNodes() {
        return this.nodes;
    }

    addNodeInteractability(node, marker, map) {
        let dragging = false;

        marker.on("mousedown", () => {
            dragging = true;
            this.map.dragging.disable();
        });

        map.on("mousemove", (event) => {
            if (!dragging) return;

            const snapped = snapToRoad(event.latlng, this.roadsGeoJSON);
            if (!snapped) return;

            const graphNodeKey = this.graphHelper.insertTemporaryNode(
                snapped.coordinates,
                snapped.segmentA,
                snapped.segmentB
            );    

            node.coordinates = snapped.coordinates;
            node.graphKey = graphNodeKey;

            marker.setLatLng([snapped.coordinates[1], snapped.coordinates[0]]);
        });

        map.on("mouseup", async () => {
            if (!dragging) return;

            dragging = false;
            map.dragging.enable();

            await this.drawRoute();
        });

        marker.on("mouseover", () => {
            marker.setStyle({
                radius: 8,
                color: "green",
                fillColor: "yellow"
            });
        });

        marker.on("mouseout", () => {
            marker.setStyle({
                radius: 6,
                color: "green",
                fillColor: "orange",
            });
        });

        marker.on("contextmenu", async () => {
            this.removeNode(node.id);
            await this.drawRoute();
        });
    }

    addRouteInteractability(routeLine) {
        routeLine.on("click", (e) => {
            if (this.nodes.length < 2) return;

            const clicked = turf.point([e.latlng.lng, e.latlng.lat]);

            let nearestNodeIndex = null;
            let minDist = Infinity;

            for (let i = 0; i < this.nodes.length - 1; i++) {

                const a = this.nodes[i].coordinates;
                const b = this.nodes[i + 1].coordinates;

                const line = turf.lineString([a, b]);

                const snap = turf.nearestPointOnLine(line, clicked);
                const dist = snap.properties.dist;

                if (dist < minDist) {
                    minDist = dist;
                    nearestNodeIndex = i + 1;
                }
            }

            if (nearestNodeIndex === null) return;

            const snapped = snapToRoad(e.latlng, this.roadsGeoJSON);
            if (!snapped) return;

            const graphNodeKey = this.graphHelper.insertTemporaryNode(
                snapped.coordinates,
                snapped.segmentA,
                snapped.segmentB
            );  

            const node = {
                id: crypto.randomUUID(),
                coordinates: snapped.coordinates,
                graphKey: graphNodeKey
            };

            this.addNode({node: node, index: nearestNodeIndex});
            this.drawRoute();
        })
    }
}

function buildRouteInstructions(edges) {
    const instructions = [];

    let currentMode = null;
    let currentRouteId = null;
    let currentRoute = null;
    let start = null;
    let distance = 0;

    for (const edge of edges) {
        if (!currentMode) {
            currentMode = edge.mode;
            currentRouteId = edge.route_id || null;
            currentRoute = edge.route_name || null;
            start = edge.from;
        }

        const modeChanged = edge.mode !== currentMode;
        const routeIdChanged = edge.route_id !== currentRouteId;
        const routeChanged = edge.route_name !== currentRoute;

        if (modeChanged || routeChanged) {
            instructions.push({
                mode: currentMode,
                route_id: currentRouteId,
                route_name: currentRoute,
                start,
                end: edge.from,
                distance
            });

            currentMode = edge.mode;
            currentRouteId = edge.route_id || null;
            currentRoute = edge.route_name || null;
            start = edge.from;
            distance = 0;
        }

        distance += edge.distance;
    }

    if (edges.length) {
        instructions.push({
            mode: currentMode,
            route_id: currentRouteId,
            route_name: currentRoute,
            start,
            end: edges[edges.length - 1].to,
            distance
        });
    }

    return instructions;
}

function buildRouteInformation(routeInformation, steps, fareMatrix) {
    const routeDistance = `${(routeInformation.totalDistanceMeters / 1000).toFixed(2)} km`;
    const jeepRidesCount = `${routeInformation.jeepRidesCount} jeep rides`;
    const tripDurationSeconds = routeInformation.routeDurationSeconds;

    const hours = Math.floor(tripDurationSeconds / 3600);
    const minutes = Math.floor((tripDurationSeconds % 3600) / 60);
    const seconds = Math.floor(tripDurationSeconds % 60);

    const parts = [];

    if (hours > 0) parts.push(`${hours} hr`);
    if (minutes > 0 || hours > 0) parts.push(`${minutes} min`);
    parts.push(`${seconds.toString().padStart(2, "0")} sec`);

    const tripDurationFormatted = parts.join(" ");

    const jeepRidesIdList = steps
        .map(step => step.route_id || null);

    const routeCost = steps.reduce((totals, step) => {
        if (step.mode === "jeep") {
            const rideDistanceKm = Math.round(step.distance / 1000);

            const traditionalFares = fareCalculator(rideDistanceKm, fareMatrix[0]);
            const nonAcModernFares = fareCalculator(rideDistanceKm, fareMatrix[1]);
            const acModernFares = fareCalculator(rideDistanceKm, fareMatrix[2]);

            // Add to totals
            totals.regular.traditional += traditionalFares.regularPrice;
            totals.regular.nonAcModern += nonAcModernFares.regularPrice;
            totals.regular.acModern += acModernFares.regularPrice;

            totals.discounted.traditional += traditionalFares.discountedPrice;
            totals.discounted.nonAcModern += nonAcModernFares.discountedPrice;
            totals.discounted.acModern += acModernFares.discountedPrice;

            // Store individual ride costs
            totals.individualRides.push({
                route: step.route || null,
                distanceKm: rideDistanceKm,

                regular: {
                    traditional: traditionalFares.regularPrice,
                    nonAcModern: nonAcModernFares.regularPrice,
                    acModern: acModernFares.regularPrice
                },

                discounted: {
                    traditional: traditionalFares.discountedPrice,
                    nonAcModern: nonAcModernFares.discountedPrice,
                    acModern: acModernFares.discountedPrice
                }
            });
        }

        return totals;
    }, {
        regular: {
            traditional: 0,
            nonAcModern: 0,
            acModern: 0
        },
        discounted: {
            traditional: 0,
            nonAcModern: 0,
            acModern: 0
        },
        individualRides: []
    });

    return {
        title: routeInformation?.title || "Route",
        routeDistance,
        jeepRidesCount,
        jeepRidesIdList,
        tripDurationSeconds,
        tripDurationFormatted,
        routeCost
    };
}

function formatInstructions(steps, individualRidesCost, keyToName) {
    const routeinstructions = steps.map(step => {
        let rideIndex = 0;
        const stepDistance = step.distance.toFixed(0);
        if (step.mode === "walk") {
            return `Walk ${stepDistance >= 1000 ? stepDistance / 1000 : stepDistance} ${stepDistance >= 1000 ? "kilometers" : "meters"}`;
        }
        if (step.mode === "jeep") {
            const regularTraditionalFee = individualRidesCost[rideIndex].regular.traditional;
            const discountedTraditionalFee = individualRidesCost[rideIndex].discounted.traditional;
            const regularNonAcModernFee = individualRidesCost[rideIndex].regular.nonAcModern;
            const discountedNonAcModernFee = individualRidesCost[rideIndex].discounted.nonAcModern;
            const regularAcModernFee = individualRidesCost[rideIndex].regular.acModern;
            const discountedAcModernFee = individualRidesCost[rideIndex].discounted.acModern;
            rideIndex++;
            return `
                Ride jeep (${step.route_name}) for ${stepDistance >= 1000 ? stepDistance / 1000 : stepDistance} ${stepDistance >= 1000 ? "kilometers" : "meters"}. <br>
                <span class="step-fare-text block text-xs text-gray-500 leading-relaxed">
                    <span class="fare-mode-regular">
                        <span class="font-semibold">Regular:</span>
                        Traditional: ₱${regularTraditionalFee} | Non-AC: ₱${regularNonAcModernFee} | AC: ₱${regularAcModernFee}
                    </span>
                    <span class="fare-mode-discounted hidden">
                        <span class="font-semibold">Discounted:</span>
                        Traditional: ₱${discountedTraditionalFee} | Non-AC: ₱${discountedNonAcModernFee} | AC: ₱${discountedAcModernFee}
                    </span>
                </span>
            `;  
        }
    });

    const startName = keyToName.get(steps[0].start) || steps[0].start;
    const endName = keyToName.get(steps[steps.length - 1].end) || steps[steps.length - 1].end;
    return [`Started at ${startName}`, ...routeinstructions, `Arrived at ${endName}`];
}

function fareCalculator(distanceKm, fareMatrix) {
    const regular = distanceKm <= fareMatrix.base_distance_km
                        ? Math.round(fareMatrix.regular_base_fare / fareMatrix.rounding) * fareMatrix.rounding
                        : Math.round(
                            (fareMatrix.regular_base_fare + (
                                (Math.round(distanceKm) - fareMatrix.base_distance_km) * fareMatrix.regular_per_km)
                            ) / fareMatrix.rounding
                        ) * fareMatrix.rounding

    const discounted = distanceKm <= fareMatrix.base_distance_km
                        ? Math.round(fareMatrix.discount_base_fare / fareMatrix.rounding) * fareMatrix.rounding
                        : Math.round(
                            (fareMatrix.discount_base_fare + (
                                (Math.round(distanceKm) - fareMatrix.base_distance_km) * fareMatrix.discount_per_km)
                            ) / fareMatrix.rounding
                        ) * fareMatrix.rounding

    return {
        regularPrice: regular,
        discountedPrice: discounted
    }
}