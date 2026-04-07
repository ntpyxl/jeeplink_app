import { createCurrentLocationItem, createPlacePinLocationItem, createLocationResultItem } from "../../ui/dropdownElements.js";

export class LocationSearchAutocomplete {
    constructor(inputSelector, delay = 500, maxResults = 5) {
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
        if (this.typingTimer) {
            clearTimeout(this.typingTimer);
            this.typingTimer = null;
        }

        const query = normalizeText(this.input.val());
        if (query.trim() !== "") {
            const results = (await searchLocations(query)).slice(0, this.maxResults);
            if (results.length > 0) {
                this.onResults(results);
                return results[0];
            }
        }
        return null;
    }

    onResults(results) {}
}

let namedLocations = null;
export function setupNamedLocations(pointsGeoJSON) {
    console.log("setup named locations")
    namedLocations = pointsGeoJSON.features
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
}

async function searchLocations(query) {
    const normalizedQuery = normalizeText(query);

    try {
	    // TODO: Maybe try Nominatim if cannot be searched, but otherwise, resort to just placing down a pin on the map.
        let results = namedLocations.filter(place =>
            place.searchName.startsWith(normalizedQuery)
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
        const response = await fetch(nominatimURL, { headers: { "Accept-Language": "en", "User-Agent": "JeepLink/1.0" } });
        
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

    field.on("focus click", async () => {
        suggestionBox.empty();

        const currentLocationItem = createCurrentLocationItem();
        currentLocationItem.on("click", async () => {
            field.val("Getting your location...");
            const location = await getCurrentLocation();

            field.val("Your Location");
            suggestionBox.addClass("hidden");

            onSelect(location);
        });

        const PlacePinLocationItem = createPlacePinLocationItem();
        PlacePinLocationItem.on("click", async () => {
            field.val("Place a pin on the map");
            
            const result = await new Promise(resolve => {
                map.getContainer().style.cursor = "crosshair";

                map.once("click", (e) => {
                    map.getContainer().style.cursor = "";
                    resolve({
                        name: [e.latlng.lng, e.latlng.lat],
                        searchName: "Pinned Location",
                        coords: [e.latlng.lng, e.latlng.lat]
                    });
                });
            });

            field.val(result.name);
            onSelect(result);
        });

        suggestionBox.append(currentLocationItem);
        suggestionBox.append(PlacePinLocationItem);
        suggestionBox.removeClass("hidden");
    });

    search.onResults = async function(results) {
        suggestionBox.empty();

        const currentLocationItem = createCurrentLocationItem();
        currentLocationItem.on("click", async () => {
            field.val("Getting your location...");
            const location = await getCurrentLocation();

            field.val("Your Location");
            suggestionBox.addClass("hidden");

            onSelect(location);
        });

        const PlacePinLocationItem = createPlacePinLocationItem();
        PlacePinLocationItem.on("click", async () => {
            field.val("Place a pin on the map");
            
            const result = await new Promise(resolve => {
                map.getContainer().style.cursor = "crosshair";

                map.once("click", (e) => {
                    map.getContainer().style.cursor = "";
                    resolve({
                        name: [e.latlng.lng, e.latlng.lat],
                        searchName: "Pinned Location",
                        coords: [e.latlng.lng, e.latlng.lat]
                    });
                });
            });

            field.val(result.name);
            onSelect(result);
        });

        suggestionBox.append(currentLocationItem);
        suggestionBox.append(PlacePinLocationItem);
        if (!results || results.length === 0) {
            suggestionBox.addClass("hidden");
            return;
        }

        results.forEach(result => {
            const item = createLocationResultItem(result.name);

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
            alert("Geolocation not supported.");
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
                alert("Failed to get location.");
                reject(err);
            },
            { enableHighAccuracy: true, timeout: 5000 }
        );
    });
}