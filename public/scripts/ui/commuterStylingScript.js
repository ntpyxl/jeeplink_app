// ---------- CALCULATE ROUTE BUTTON (LOADING STATE) ----------
export function invokeLoadingState() {
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
}

// ---------- PAGE LOADER ----------
export function showPageLoader(message) {
    const navbarHeight = $("#mainNavbar").outerHeight() || 64;
    if ($("#pageLoader").length === 0) {
        $("body").append(`
            <div id="pageLoader"
                class="fixed inset-0 bg-[#004F11] flex flex-col items-center justify-center backdrop-blur-sm bg-[#004F11]/60 z-[999]">

                <div class="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>

                <p id="pageLoaderMessage" class="text-white mt-4 font-semibold text-lg drop-shadow-lg">
                    ${message[0]}
                </p>
            </div>
        `);
    }

    $("body").addClass("overflow-hidden");

    clearInterval(window.__loaderInterval);

    let i = 0;

    window.__loaderInterval = setInterval(() => {
        i = (i + 1) % message.length;
        $("#pageLoaderMessage").text(message[i]);
    }, 1500);
}

// HIDE LOADER
export function hidePageLoader() {
    clearInterval(window.__loaderInterval);
    window.__loaderInterval = null;

    $("#pageLoader").fadeOut(200, function () {
        $(this).remove();
    });

    $("body").removeClass("overflow-hidden");
}

// ---------- CLOSE ROUTES WITH STATE SYNC ----------
export function closeRoutesPanel() {
    $(".route-content").stop(true, true).slideUp(250);
    $(".arrow").removeClass("rotate-180");
    isOpen = false;
}

// ---------- MAP CONTROLS POSITION SYNC ----------
function isMobile() {
    return window.innerWidth < 768; 
}

const controls = $("#mapControls");
const routePanel = $("#routePanel");

// ---------- GLOBAL ROUTE STATE ----------
let isOpen = false;

export function updateControlsPosition() {
    if (isMobile()) {
        if (!routePanel.hasClass("hidden")) {

            const goNowText = $("#goNow span").text().trim();

            if (goNowText === "End Navigation") {
                controls.css("bottom", "160px"); 
            } else {
                controls.css("bottom", "220px"); 
            }

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
    //FARE INFO MODAL
    $(document).on('click', '.fare-info-icon', function () {
        showFareInfo();
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

    // ---------- REPORT MODAL ----------

    // OPEN
    function openReportModal() {
        const modal = $("#reportModal");
        const content = $("#reportModalContent");

        modal.removeClass("hidden");

        modal[0].offsetHeight;

        modal.removeClass("opacity-0").addClass("opacity-100");

        content
            .removeClass("scale-95 opacity-0 -translate-y-3")
            .addClass("scale-100 opacity-100 translate-y-0");   
    }

    // CLOSE
    function closeReportModal() {
        const modal = $("#reportModal");
        const content = $("#reportModalContent");


        modal.removeClass("opacity-100").addClass("opacity-0");

        content
            .removeClass("scale-100 opacity-100 translate-y-0")
            .addClass("scale-95 opacity-0 -translate-y-3");


        setTimeout(() => {
            modal.addClass("hidden");
        }, 320);
    }

    // Open button
    $("#openReportModalBtn").on("click", openReportModal);

    // Cancel button
    $("#cancelReportBtn").on("click", closeReportModal);

    // Click outside to close
    $("#reportModal").on("click", function (e) {
        if (e.target === this) {
            closeReportModal();
        }
    });

    // ESC key
    $(document).on("keydown", function (e) {
        if (e.key === "Escape") {
            closeReportModal();
        }
    });

    // ---------- MAP LEGEND MODAL ----------

    // OPEN
    function openLegendModal() {
        const modal = $("#legendModal");
        const content = $("#legendModalContent");

        modal.removeClass("hidden");

        modal[0].offsetHeight;

        modal.removeClass("opacity-0").addClass("opacity-100");

        content
            .removeClass("scale-95 opacity-0 -translate-y-3")
            .addClass("scale-100 opacity-100 translate-y-0");   
    }

    // CLOSE
    function closeLegendModal() {
        const modal = $("#legendModal");
        const content = $("#legendModalContent");

        modal.removeClass("opacity-100").addClass("opacity-0");

        content
            .removeClass("scale-100 opacity-100 translate-y-0")
            .addClass("scale-95 opacity-0 -translate-y-3");


        setTimeout(() => {
            modal.addClass("hidden");
        }, 320);
    }

    // Open button
    $("#openLegendModalBtn").on("click", openLegendModal);

    // Close button
    $("#closeLegendBtn").on("click", closeLegendModal);

    // Click outside to close
    $("#legendModal").on("click", function (e) {
        if (e.target === this) {
            closeLegendModal();
        }
    });

    // ---------- ISSUE TYPE TOGGLE ----------
    $("#titleField").hide();

    $(".issue-category-btn").on("click", function () {
        // Reset all buttons
        $(".issue-category-btn")
            .removeClass("bg-[#2E7D32] text-white hover:bg-[#004F11]")
            .addClass("border text-[#004F11] hover:bg-[#2E7D32]/5");

        // Activate clicked button
        $(this)
            .removeClass("border text-[#004F11] hover:bg-[#2E7D32]/5")
            .addClass("bg-[#2E7D32] text-white hover:bg-[#004F11]");

        // Show title only for Other Issues
        if ($(this).attr("id") === "issueOther") {
            $("#titleField").slideDown(150);
        } else {
            $("#titleField").slideUp(150);
        }

        $("#descLabel").text("Description");
    });

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

// FARE MATRIX TOGGLE
window.showFare = function (type, btn) {

    // hide all PDFs
    document.querySelectorAll('iframe').forEach(frame => {
        frame.classList.add('hidden');
    });

    // show selected PDF
    document.getElementById(type).classList.remove('hidden');

    // reset buttons
    document.querySelectorAll('.fare-btn').forEach(button => {
        button.classList.remove('bg-[#2E7D32]', 'text-white');
        button.classList.add('text-[#2E7D32]');
    });

    // activate clicked button
    btn.classList.add('bg-[#2E7D32]', 'text-white');
};

$(document).ready(function () {

    $(".fare-btn").on("click", function () {
        const idMap = {
            "btn-traditional": "traditional",
            "btn-modern-ac": "modern_ac",
            "btn-modern-nac": "modern_nac"
        };

        const type = idMap[this.id];

        window.showFare(type, this); 
    });

    // DEFAULT CLICK
    $("#btn-traditional").trigger("click");
});