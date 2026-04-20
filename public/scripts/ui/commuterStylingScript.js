// ---------- MAP CONTROLS POSITION SYNC ----------
function isMobile() {
    return window.innerWidth < 768; 
}

const controls = $("#mapControls");
const routePanel = $("#routePanel");

export function updateControlsPosition() {
    if (isMobile()) {
        // ONLY apply on mobile
        if (!routePanel.hasClass("hidden")) {
            controls.css("bottom", "220px");
        } else {
            controls.css("bottom", "16px"); 
        }
    } else {
        controls.css("bottom", "");
    }
}

$(document).ready(function () {
    // ---------- NAVBAR ----------
    $("#menuBtn").on("click", function () {
        $("#mobileMenu").toggleClass("max-h-0 max-h-96");
    });

    // ---------- COMMUTE PANEL ----------
    function isMobile() {
        return window.innerWidth < 768;
    }

   $("#toggleCommute").on("click", function () {
        const isHidden = $("#commuteContent").is(":hidden");
        $("#commuteContent").stop().slideToggle(250);
        $("#arrow").toggleClass("rotate-180");

        if (isHidden) {
            closeAllRoutes();
            isOpen = false;
            if ($("#routeSlider .route-card").length || $("#routeLoading").length) {
                $("#routeSliderWrapper").stop(true, true).slideDown(250);
            }
        }

        updateControlsPosition();
    });

    function autoCloseCommute() {
        if (isMobile()) {
            if ($("#commuteContent").is(":visible")) return; 
            $("#commuteContent").hide();
            $("#arrow").removeClass("rotate-180"); 
        } else {
            $("#commuteContent").show();
            $("#arrow").removeClass("rotate-180");
        }
    }

    autoCloseCommute();
    //$(window).on("resize", autoCloseCommute);

    // ---------- GLOBAL ROUTE SYNC SYSTEM ----------
    let isOpen = false;

    function closeAllRoutes() {
        $(".route-content").stop(true, true).slideUp(250);
        $(".arrow").removeClass("rotate-180");
    }

    function openAllRoutes() {
        $(".route-content").stop(true, true).slideDown(300);
        $(".arrow").addClass("rotate-180");
    }

    // CLICK HEADER (SYNC ALL)
    $(document).on("click", ".summary", function () {
        if (isOpen) {
            closeAllRoutes();
            isOpen = false;
        } else {
            $("#commuteContent").stop(true, true).slideUp(250);
            $("#arrow").removeClass("rotate-180");
            openAllRoutes();
            isOpen = true;
        }

    });

    // DRAG HANDLE
    $("#dragToggle").on("click", function () {
        if (isOpen) {
            closeAllRoutes();
            isOpen = false;
        } else {
            $("#commuteContent").stop(true, true).slideUp(250);
            $("#arrow").removeClass("rotate-180");
            openAllRoutes();
            isOpen = true;

            const active = $(".route-details").get(currentRoute);
            setTimeout(() => {
                active?.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 150);
        }

    });

    // ---------- CALCULATE ROUTE BUTTON (LOADING STATE) ----------
    $("#calculateRouteButton").on("click", function () {
        $("#routePanel").removeClass("hidden");
        $("#commuteContent").stop(true, true).slideUp(250);
        $("#arrow").removeClass("rotate-180");
        
        $("#arrow").removeClass("rotate-180");

        // show loading spinner
        $("#routeSlider").html(`
            <div id="routeLoading" class="w-full flex flex-col items-center justify-center py-10 gap-3">
                <div class="w-10 h-10 border-4 border-[#004F11]/20 border-t-[#004F11] rounded-full animate-spin"></div>
                <p class="text-sm text-gray-600 font-medium">
                    Finding the best routes...
                </p>
            </div>
        `);

        updateControlsPosition();
    });

    // ---------- REPORT MODAL ----------

    // OPEN
    function openReportModal() {
        $("#reportModal").removeClass("hidden");
    }

    // CLOSE
    function closeReportModal() {
        $("#reportModal").addClass("hidden");
    }

    // Open button
    $("#openReportModalBtn").on("click", openReportModal);

    // Cancel button
    $("#cancelBtn").on("click", closeReportModal);

    // Click outside to close
    $("#reportModal").on("click", function () {
        closeReportModal();
    });

    // ESC key
    $(document).on("keydown", function (e) {
        if (e.key === "Escape") {
            closeReportModal();
        }
    });

    // ---------- ISSUE TYPE TOGGLE ----------

    let selectedIssue = "jeep";

    $("#titleField").hide();

    $("#issueJeep").on("click", function () {
        selectedIssue = "jeep";

        // UI toggle
        $(this)
            .removeClass("border text-[#004F11] hover:bg-[#004F11]/5")
            .addClass("bg-[#2E7D32] text-white hover:bg-[#004F11]");

        $("#issueOther")
            .removeClass("bg-[#2E7D32] text-white hover:bg-[#004F11]")
            .addClass("border text-[#004F11] hover:bg-[#2E7D32]/5");

        $("#titleField").slideUp(150);

        $("#descLabel").text("Description (Optional)");
    });

    $("#issueOther").on("click", function () {
        selectedIssue = "other";

        $(this)
            .removeClass("border text-[#004F11] hover:bg-[#004F11]/5")
            .addClass("bg-[#2E7D32] text-white hover:bg-[#004F11]");

        $("#issueJeep")
            .removeClass("bg-[#2E7D32] text-white hover:bg-[#004F11]")
            .addClass("border text-[#004F11] hover:bg-[#004F11]/5");

        $("#titleField").slideDown(150);

        $("#descLabel").text("Description");
    });

    // TODO: use selectedIssue variable when submitting report form to backend

    // ---------- TERMS MODAL ----------
    const accepted = localStorage.getItem("jeepLink_termsAccepted");

    if (!accepted) {
        $("#termsModal").removeClass("hidden");
    }

    $("#acceptTermsBtn").on("click", function () {
        localStorage.setItem("jeepLink_termsAccepted", "true");
        $("#termsModal").fadeOut(200);
    });

    // Close location suggestion when clicking outside location dropbox
    $(this).on("click", e => {
        ["starting", "destination"].forEach(type => {
            if (!$(e.target).closest(`#${type}PointField, #${type}Suggestions`).length) {
                $(`#${type}Suggestions`).addClass("hidden");
            }
        });
    });
    // ---------- ORIENTATION CHECK (LANDSCAPE MODE OVERLAY) ----------
    function checkOrientation() {
        const overlay = document.getElementById('rotateOverlay');

        if (!overlay) return; 

        if (window.innerWidth > window.innerHeight && window.innerWidth < 1024) {
            overlay.classList.remove('hidden');
        } else {
            overlay.classList.add('hidden');
        }
    }
    // Listen for orientation changes and resize events
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    // Initial check
    checkOrientation();

});