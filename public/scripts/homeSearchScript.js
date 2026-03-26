$("#calculateRouteButton").on("click", async event => {
    sessionStorage.setItem("start", $("#startingPointField").val());
    sessionStorage.setItem("destination", $("#destinationPointField").val());

    window.location.href = "/map.html";
});