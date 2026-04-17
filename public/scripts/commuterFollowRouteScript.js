export function watchUserPosition(onUpdate, onError) {
    if (!navigator.geolocation) {
        alert("Geolocation not supported.");
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
            maximumAge: 1000,
            timeout: 5000
        }
    );

    return watchId;
}