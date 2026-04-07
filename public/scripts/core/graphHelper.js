export class GraphHelper {
    constructor(roadsGeoJSON, showDisabledRoads = false) {
        this.graph = this.buildGraph(roadsGeoJSON, showDisabledRoads);
    }

    coordKey(coord) {
        return `${coord[0].toFixed(6)},${coord[1].toFixed(6)}`;
    }

    buildGraph(roads, showDisabledRoads) {
        const graph = new Map();

        roads.features.forEach(feature => {
            if (!showDisabledRoads && feature.properties.disabled) return;
            if (feature.geometry.type !== "LineString") return;

            const coords = feature.geometry.coordinates;

            for (let i = 0; i < coords.length - 1; i++) {
                const a = coords[i];
                const b = coords[i + 1];

                const aKey = this.coordKey(a);
                const bKey = this.coordKey(b);

                // Haversine is faster than turf.distance for thousands of iterations. Or could try the function below?
                const dist = turf.distance(
                    turf.point(a),
                    turf.point(b),
                    { units: "meters" }
                );

                function funcDist(a, b) {
                    const dx = a[0] - b[0];
                    const dy = a[1] - b[1];
                    return Math.sqrt(dx*dx + dy*dy) * 111320;
                }

                if (!graph.has(aKey)) graph.set(aKey, []);
                if (!graph.has(bKey)) graph.set(bKey, []);

                graph.get(aKey).push({ to: bKey, weight: dist });
                graph.get(bKey).push({ to: aKey, weight: dist });
            }
        });

        return graph;
    }

    snapToGraphNode(coord) {
        let closestKey = null;
        let minDist = Infinity;

        for (const key of this.graph.keys()) {
            const [lng, lat] = key.split(",").map(Number);

            const d = turf.distance(
                turf.point(coord),
                turf.point([lng, lat]),
                { units: "meters" }
            );

            if (d < minDist) {
                minDist = d;
                closestKey = key;
            }
        }

        return closestKey;
    }

    // TODO: Fix route jumping through roads.
    insertTemporaryNode(coord, a, b) {
        const key = this.coordKey(coord);
        const aKey = this.coordKey(a);
        const bKey = this.coordKey(b);

        if (this.graph.has(key)) return key;

        const distA = turf.distance(turf.point(coord), turf.point(a), { units: "meters" });
        const distB = turf.distance(turf.point(coord), turf.point(b), { units: "meters" });

        // Store the neighbors using the EXACT string keys
        this.graph.set(key, [
            { to: aKey, weight: distA },
            { to: bKey, weight: distB }
        ]);

        return key;
    }
}