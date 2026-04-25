import { createCurrentLocationItem, createPlacePinLocationItem, createLocationResultItem, createMessageRow } from "../../ui/dropdownElements.js";

export class LocationSearchAutocomplete {
    constructor(inputSelector, delay = 500, maxResults = 5) {
        this.input = $(inputSelector);
        this.delay = delay;
        this.maxResults = maxResults;
        this.typingTimer = null;

        this.lastQuery = "";
        this.lastResults = [];

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
        if (query.trim() === "") {
            this.lastQuery = "";
            this.lastResults = [];
            this.onResults([]);
            return;
        }

        const results = await searchLocations(query);
        const trimmedResults = results.slice(0, this.maxResults);
        
        this.lastQuery = query;
        this.lastResults = trimmedResults;
        this.onResults(trimmedResults);
    }

    async flush() {
        if (this.typingTimer) {
            clearTimeout(this.typingTimer);
            this.typingTimer = null;
        }

        const query = normalizeText(this.input.val());

        if (query.trim() === "") {
            this.lastQuery = "";
            this.lastResults = [];
            this.onResults([]);
            return null;
        }

        if (query === this.lastQuery) {
            this.onResults(this.lastResults);
            return this.lastResults[0] || null;
        }

        const results = await searchLocations(query);
        const trimmedResults = results.slice(0, this.maxResults);

        this.lastQuery = query;
        this.lastResults = trimmed;
        this.onResults(trimmedResults);

        return trimmed[0] || null;
    }

    onResults(results) {}
}

let namedLocations = [];
export function setupNamedLocations(pointsGeoJSON) {
    namedLocations = pointsGeoJSON.features
        .filter(feature => feature.properties?.name)
        .map(feature => ({
            name: feature.properties.name,
            searchName: normalizeText(feature.properties.name),
            coords: feature.geometry.coordinates
        }));
}

async function searchLocations(query) {
    const normalizedQuery = normalizeText(query);

    try {
        const pointsResults = namedLocations.filter(place =>
            place.searchName.startsWith(normalizedQuery)
        );

        if (pointsResults.length > 0) return pointsResults;

        const nominatimSearchParams = new URLSearchParams({
            format: "jsonv2",
            limit: 5,
            country: "Philippines",
            city: "Dasmarinas",
            amenity: query
        });

        const response = await fetch(`https://nominatim.openstreetmap.org/search?${nominatimSearchParams.toString()}`,
            { 
                headers: {
                    "Accept-Language": "en",
                    "User-Agent": "JeepLink/1.0"
                } 
            }
        );
        
	    const nominatimResults = await response.json();

        return (Array.isArray(nominatimResults) ? nominatimResults : [])
            .filter(loc => loc.lat && loc.lon)
            .map(loc => ({
                name: loc.display_name.split(",")[0],
                searchName: normalizeText(loc.display_name.split(",")[0]),
                coords: [parseFloat(loc.lon), parseFloat(loc.lat)],
                attribution: "© OpenStreetMap (Nominatim)"
            }));
    } catch (err) {
        console.error("Cannot find: " + query, err);
        return [];
    }
}

function normalizeText(text) {
    return text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}

export function setupLocationSearch({ field, map, suggestionBox, onSelect }) {
    const search = new LocationSearchAutocomplete(field);

    function renderSpecialRows() {
        const currentLocationItem = createCurrentLocationItem();
        currentLocationItem.on("click", async () => {
            field.val("Getting your location...");

            try {
                const location = await getCurrentLocation();

                field.val("Your Location");
                suggestionBox.addClass("hidden");

                onSelect(location);
            } catch {
                field.val("");
            }
            
        });

        const PlacePinLocationItem = createPlacePinLocationItem();
        PlacePinLocationItem.on("click", async () => {
            if(!map){
                window.location.href="./map.html";
                return;
            }

            field.val("Place a pin on the map");
            
            const result = await new Promise(resolve => {
                map.getContainer().style.cursor = "crosshair";

                map.once("click", (e) => {
                    map.getContainer().style.cursor = "";
                    resolve({
                        name: `Pinned: ${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`,
                        searchName: "Pinned Location",
                        coords: [e.latlng.lng, e.latlng.lat]
                    });
                });
            });

            field.val(result.name);
            suggestionBox.addClass("hidden");
            onSelect(result);
        });

        suggestionBox.append(currentLocationItem);
        suggestionBox.append(PlacePinLocationItem);
    }

    field.on("focus click", async () => {
        const query = normalizeText(field.val());

        // Reuse saved results
        if (query !== "" && query === search.lastQuery && search.lastResults.length > 0) {
            search.onResults(search.lastResults);
            return;
        }

        suggestionBox.empty();
        renderSpecialRows();
        suggestionBox.removeClass("hidden");
    });

    search.onResults = async function(results) {
        suggestionBox.empty();
        renderSpecialRows();

        if (!results || results.length === 0) {
            const message = createMessageRow("Location can't be found. Pin a location instead!");

            suggestionBox.append(message);
            suggestionBox.removeClass("hidden");
            return;
        }

        results.forEach(result => {
            const item = createLocationResultItem(result.name, result?.attribution);

            item.on("click", () => {
                field.val(result.name);
                suggestionBox.addClass("hidden");
                onSelect(result);
            });

            suggestionBox.append(item);
        });

        suggestionBox.removeClass("hidden");
    };

    return search;
}

export function getCurrentLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            showError("Geolocation not supported.");
            reject();
            return;
        }

        navigator.geolocation.getCurrentPosition(
            pos => resolve({
                name: "Your Location",
                searchName: "Your Location",
                coords: [pos.coords.longitude, pos.coords.latitude]
            }),
            err => {
                console.error(err);
                showError("Failed to get location.");
                reject(err);
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 15000 }
        );
    });
}