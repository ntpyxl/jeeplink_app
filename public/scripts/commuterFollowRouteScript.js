export function watchUserPosition(onUpdate, onError) {
    if (!navigator.geolocation) {
        showError("Geolocation not supported.");
        return;
    }

    const watchId = navigator.geolocation.watchPosition(
        pos => {
            onUpdate({
                coords: [pos.coords.longitude, pos.coords.latitude]
            });
        },
        err => {
            console.error(err);
            if (onError) onError(err);
        },
        {
            enableHighAccuracy: true,
            maximumAge: 15000
        }
    );

    return watchId;
}

export function simulateUserPosition(map, onUpdate, onError) {
    if (!map) {
        if (onError) onError(new Error("Map instance is required"));
        return;
    }

    const handler = (e) => {
        onUpdate({
            coords: [e.latlng.lng, e.latlng.lat]
        });
    };

    map.on("click", handler);
    map.getContainer().addEventListener("touchend", handler); // mobile reliable

    // return "watchId" as cleanup function
    return () => {
        map.off("click", handler);
        map.getContainer().removeEventListener("touchend", handler);
    };
}