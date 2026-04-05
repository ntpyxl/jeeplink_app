import { logout } from "../core/accountHandler.js";

$(document).ready(function () {
    // Orientation Checker
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

    // Profile Dropdown
    $("#profileBtn").click(function (e) {
        e.stopPropagation();

        const dropdown = $("#profileDropdown");

        if (dropdown.hasClass("opacity-0")) { // OPEN
            dropdown.removeClass("opacity-0 scale-95 translate-y-2 pointer-events-none")
                    .addClass("opacity-100 scale-100 translate-y-0");
        } else { // CLOSE
            dropdown.addClass("opacity-0 scale-95 translate-y-2 pointer-events-none")
                    .removeClass("opacity-100 scale-100 translate-y-0");
        }
    });

    // Click outside close
    $(document).click(function (e) {
        if (!$(e.target).closest("#profileBtn, #profileDropdown").length) {
            $("#profileDropdown")
                .addClass("opacity-0 scale-95 translate-y-2 pointer-events-none")
                .removeClass("opacity-100 scale-100 translate-y-0");
        }
    });

    $("#logoutBtn").click(function () { logout(); });
});