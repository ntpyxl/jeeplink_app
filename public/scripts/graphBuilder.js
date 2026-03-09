function coordKey(c) {
    return `${c[0]},${c[1]}`;
}

export function buildGraph(roads, showDisabledRoads) {
    const graph = new Map();

    roads.features.forEach(feature => {
        if (!showDisabledRoads && feature.properties.disabled) return;
        const coords = feature.geometry.coordinates;

        for (let i = 0; i < coords.length - 1; i++) {
            if(feature.geometry.type == "LineString"){
                const a = coords[i];
                const b = coords[i + 1];

                const aKey = coordKey(a);
                const bKey = coordKey(b);

                const dist = turf.distance(
                    turf.point(a),
                    turf.point(b),
                    { units: "meters" }
                );
                
                // TODO: Above function can be slower, test this one instead? Faster but trading some accuracy.
                function funcDist(a, b) {
                    const dx = a[0] - b[0];
                    const dy = a[1] - b[1];
                    return Math.sqrt(dx*dx + dy*dy) * 111320;
                }

                if (!graph.has(aKey)) graph.set(aKey, []);
                if (!graph.has(bKey)) graph.set(bKey, []);

                graph.get(aKey).push({ to: bKey, weight: dist, coords: [a, b] });
                graph.get(bKey).push({ to: aKey, weight: dist, coords: [b, a] });
            }
        }
    });

    return graph;
}
