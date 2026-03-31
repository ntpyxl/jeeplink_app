export class LocationSuggester {
    constructor(inputSelector, delay = 2000, maxResults = 7) {
        this.input = $(inputSelector);
        this.delay = delay;
        this.maxResults = maxResults;
        this.typingTimer = null;

        this.init();
    }

    init() {
        this.input.on("input", () => {
            clearTimeout(this.typingTimer);
            this.typingTimer = null;
            const query = normalizeText(this.input.val());

            this.typingTimer = setTimeout(async () => {
                this.typingTimer = null;
                await this.runSearch(query);
            }, this.delay);
        });
    }

    async runSearch(query) {
        if (query.trim() !== "") {
            const results = (await searchLocations(query)).slice(0, this.maxResults);
            this.onResults(results);
        }
    }

    async flush() {
        if (!this.typingTimer) return;

        clearTimeout(this.typingTimer);
        this.typingTimer = null;
        await this.runSearch(normalizeText(this.input.val()));
    }

    // Override this method to handle results (e.g., show a dropdown)
    onResults(results) {
        sessionStorage.setItem("start", JSON.stringify(results[0]));
    }
}


// TODO: Upload Dasma_Points.geojson to Vercel Blob
const pointsGeoJSON = await fetch("/DasmaMapData/Dasma_Points.geojson").then(r => r.json());

const namedLocations = pointsGeoJSON.features
    .filter(feature => feature.properties?.name)
    .map(feature => {
        const coords = feature.geometry.coordinates;

        // TODO: Doesn't snap to the map grid so it may fuck up?
        return {
            name: feature.properties.name,
            searchName: normalizeText(feature.properties.name),
            coords: coords,
            data: feature // TODO: Just resending all the data here again. Double check this soon.
        };
    });

async function searchLocations(query) {
    const normalizedQuery = normalizeText(query);

    try {
	    // TODO: Maybe try Nominatim if cannot be searched, but otherwise, resort to just placing down a pin on the map.
        let results = namedLocations.filter(place =>
            place.searchName.includes(normalizedQuery)
        );

        if (results.length > 0) return results;

	    // TODO: Add attribution to OSM if results are from OSM
        const nominatimSearchParams = new URLSearchParams({
            format: "jsonv2",
            limit: 5,
            country: "Philippines",
            city: "Dasmarinas",
            amenity: query
        });

        const nominatimURL = `https://nominatim.openstreetmap.org/search?${nominatimSearchParams.toString()}`;
        const response = await fetch(nominatimURL, { headers: { "Accept-Language": "en" } });
        
	    const nominatimResults = await response.json();

        const nominatimMapped = (Array.isArray(nominatimResults) ? nominatimResults : [])
            .filter(loc => loc.lat && loc.lon)
            .map(loc => ({
                name: loc.display_name.split(",")[0],
                searchName: normalizeText(loc.display_name.split(",")[0]),
                coords: [parseFloat(loc.lon), parseFloat(loc.lat)],
                data: loc
            }));
        
        return nominatimMapped;
    } catch (err) {
        console.log("Cannot find: " + query, err);
        return [];
    }
}

function normalizeText(text) {
    return text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}