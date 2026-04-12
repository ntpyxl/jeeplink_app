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
        this.routeLine = null;
        
        this.nodeLayer = new L.LayerGroup().addTo(this.map);
    }

    addNode({ node, index = null, type = null }) {
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

    async drawRoute() {
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
                // TODO: algorithm variable no longer being read in backend api. double check this for other calculateRoute calls
                algorithm: "a_star",
                nodes: [this.nodes.map(n => n.graphKey)],
                tempNodes: tempNodeDefinitions
            })
        });

        const { paths } = await response;
        console.log(paths.fastestRoute);
        const edges = paths.fastestRoute.routePath;

        if(this.fareMatrix) {
            // TODO: Route instructions to be displayed on the UI
            const routeInstructions = buildRouteInstructions(edges);
            const routeInformation = buildRouteInformation(routeInstructions, this.fareMatrix.fareMatrixData);

            const completeRouteInformation = {
                fastest: {
                    routeInformation: routeInformation,
                    routeInstructions: formatInstructions(routeInstructions)
                }
            }
            console.log(completeRouteInformation);
        }

        if (this.routeLine) this.map.removeLayer(this.routeLine);

        this.routeLine = L.layerGroup().addTo(this.map);
        const keyToLatLng = k => k.split(",").map(Number).reverse();
        for (const edge of edges) {
            const from = keyToLatLng(edge.from);
            const to = keyToLatLng(edge.to);
            
            const style = edge.mode === "jeep"
                ? { color: "#1E90FF", weight: 6 }
                : { color: "#666", weight: 4, dashArray: "6 6" };

            const segment = L.polyline([from, to], {
                color: style.color,
                dashArray: style.dashArray ?? "1",
                weight: style.weight,
                pane: "routePane"
            });

            this.routeLine.addLayer(segment);
        }

        if(this.addInteractability) this.addRouteInteractability(this.routeLine);
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
    let currentRoute = null;
    let start = null;
    let distance = 0;

    for (const edge of edges) {
        if (!currentMode) {
            currentMode = edge.mode;
            currentRoute = edge.route_name || null;
            start = edge.from;
        }

        const modeChanged = edge.mode !== currentMode;
        const routeChanged = edge.route_name !== currentRoute;

        if (modeChanged || routeChanged) {
            instructions.push({
                mode: currentMode,
                route_name: currentRoute,
                start,
                end: edge.from,
                distance
            });

            currentMode = edge.mode;
            currentRoute = edge.route_name || null;
            start = edge.from;
            distance = 0;
        }

        distance += edge.distance;
    }

    if (edges.length) {
        instructions.push({
            mode: currentMode,
            route_name: currentRoute,
            start,
            end: edges[edges.length - 1].to,
            distance
        });
    }

    return instructions;
}

function buildRouteInformation(steps, fareMatrix) {
    const routeDistance = ((steps.reduce((sum, step) => sum + step.distance, 0)) / 1000).toFixed(2); // Convert to kilometer if >= 1000 meters
    const jeepRideCount = steps.filter(step => step.mode === "jeep").length;
    
    // TODO: Very tentative and perhaps inaccurate as it does not consider traffic yet.
    const speeds = {
        walk: 1.2, // m/s
        jeep: 6    // m/s
    };

    const tripDuration = steps.reduce((duration, step) => {
        const speed = speeds[step.mode];
        return speed ? duration + (step.distance / speed) : duration;
    }, 0);

    const routeCost = steps.reduce((totals, step) => {
        if (step.mode === "jeep") {
            const rideDistanceKm = Math.round(step.distance.toFixed(0) / 1000);

            const traditionalFares = fareCalculator(rideDistanceKm, fareMatrix[0]);
            const nonAcModernFares = fareCalculator(rideDistanceKm, fareMatrix[1]);
            const acModernFares = fareCalculator(rideDistanceKm, fareMatrix[2]);

            totals.regular.traditional += traditionalFares.regularPrice;
            totals.regular.nonAcModern += nonAcModernFares.regularPrice;
            totals.regular.acModern += acModernFares.regularPrice;

            totals.discounted.traditional += traditionalFares.discountedPrice;
            totals.discounted.nonAcModern += nonAcModernFares.discountedPrice;
            totals.discounted.acModern += acModernFares.discountedPrice;
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
        }
    });
    
    return {
        routeDistance: routeDistance,
        jeepRideCount: jeepRideCount,
        tripDuration: tripDuration,
        routeCost: routeCost
    }
}

function formatInstructions(steps) {
    const routeinstructions = steps.map(step => {
        const stepDistance = step.distance.toFixed(0);
        if (step.mode === "walk") {
            return `Walk ${stepDistance >= 1000 ? stepDistance / 1000 : stepDistance} ${stepDistance >= 1000 ? "kilometers" : "meters"}`;
        }
        if (step.mode === "jeep") {
            return `Ride jeep (${step.route_name}) for ${stepDistance >= 1000 ? stepDistance / 1000 : stepDistance} ${stepDistance >= 1000 ? "kilometers" : "meters"}`;  
        }
    });

    return routeinstructions
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