$(document).ready(function () {

    function checkOrientation() {
        const $overlay = $("#rotateOverlay");

        const isMobile = window.innerWidth < 768;
        const isPortrait = window.matchMedia("(orientation: portrait)").matches;

        if (isMobile && isPortrait) {
            $overlay.removeClass("hidden");
            $("body").css("height", "100vh");
            $("html").css("overflow", "hidden");
        } else {
            $overlay.addClass("hidden");
            $("body").css({ overflow: "", height: "" });
            $("html").css("overflow", "");
        }
    }

    // Orientation events
    $(window).on("load resize orientationchange", function () {
        setTimeout(checkOrientation, 100);
    });

    // Sidebar
    function openSidebar() {
        $("#sidebar").removeClass("-translate-x-full");
        $("#sidebarOverlay").removeClass("hidden");
        $("body").css("overflow", "hidden");
    }

    function closeSidebar() {
        $("#sidebar").addClass("-translate-x-full");
        $("#sidebarOverlay").addClass("hidden");
        $("body").css("overflow", "");
    }

    $("#menuBtn").on("click", openSidebar);
    $("#sidebarOverlay").on("click", closeSidebar);
    $("#sidebar nav a").on("click", closeSidebar);

});