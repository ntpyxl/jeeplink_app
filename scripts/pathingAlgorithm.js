export function dijkstra(graph, startKey, endKey) {
    const distances = new Map();
    const previous = new Map();
    const queue = new Set(graph.keys());

    for (const key of queue) distances.set(key, Infinity);
    distances.set(startKey, 0);

    while (queue.size) {
        let current = null;

        for (const k of queue) {
            if (current === null || distances.get(k) < distances.get(current)) {
                current = k;
            }
        }

        if (current === endKey) break;

        queue.delete(current);

        for (const edge of graph.get(current)) {
        const alt = distances.get(current) + edge.weight;
            if (alt < distances.get(edge.to)) {
                distances.set(edge.to, alt);
                previous.set(edge.to, current);
            }
        }
    }

    // Reconstruct path
    const path = [];
    let cur = endKey;

    while (cur) {
        path.unshift(cur);
        cur = previous.get(cur);
    }

    return path;
}