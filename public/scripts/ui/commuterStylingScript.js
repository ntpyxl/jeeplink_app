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
        $("#commuteContent").stop().slideToggle(250);
        $("#arrow").toggleClass("rotate-180");
    });

    function autoCloseCommute() {
        if (isMobile()) {
            $("#commuteContent").hide();
            $("#arrow").addClass("rotate-180");
        } else {
            $("#commuteContent").show();
            $("#arrow").removeClass("rotate-180");
        }
    }

    autoCloseCommute();
    $(window).on("resize", autoCloseCommute);

    // ---------- ROUTE SLIDER ----------
    let currentRoute = 0;
    let totalRoutes = 0;

    const $slider = $("#routeSlider");

    function updateSlider() {
        $slider.css("transform", `translateX(-${currentRoute * 100}%)`);
        $("#routeIndicator").text(`${currentRoute + 1} / ${totalRoutes}`);
    }

    $("#nextRoute").on("click", function () {
        if (currentRoute < totalRoutes - 1) {
            currentRoute++;
            updateSlider();
        }
    });

    $("#prevRoute").on("click", function () {
        if (currentRoute > 0) {
            currentRoute--;
            updateSlider();
        }
    });

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
            openAllRoutes();
            isOpen = true;

            const active = $(".route-details").get(currentRoute);
            setTimeout(() => {
                active?.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 150);
        }

    });

    // ---------- ROUTE RENDERER ----------
    window.renderRoutes = function (routeData) {
        $slider.empty(); 

        const routes = [
            {
                title: "Fastest Route",
                info: routeData.fastestRouteInformation,
                path: routeData.paths?.fastestRoute
            },
            {
                title: "Cheapest Route",
                info: routeData.cheapestRouteInformation,
                path: routeData.paths?.cheapestRoute
            },
            {
                title: "Minimal Transfer Route",
                info: routeData.minimalTransferRouteInformation,
                path: routeData.paths?.minimalTransferRoute
            }
        ];

        $("#routePanel").removeClass("hidden");
        updateControlsPosition();

        $slider.empty();
        currentRoute = 0;
        totalRoutes = routes.length;

        routes.forEach(route => {

            let instructions = [];

            if (route.title === "Fastest Route") {
                instructions = route.info?.fastestRouteInstructions || [];
            } else if (route.title === "Cheapest Route") {
                instructions = route.info?.cheapestRouteInstructions || [];
            } else {
                instructions = route.info?.minimalTransferRouteInstructions || [];
            }

            const routeInfo = route.info?.routeInformation || {};

            const regular = routeInfo.routeCost?.regular || {};
            const discounted = routeInfo.routeCost?.discounted || {};

            const ridesCount = routeInfo.jeepRidesCount || "0 rides";
            const duration = routeInfo.tripDurationFormatted || "N/A";
            const distance = routeInfo.routeDistance || "";

            // Limited to 5 instructions
            const limited = instructions.slice(0, 5);

            const stepsHtml = limited.map((step, i) => `
                <div class="flex gap-3 md:gap-4 items-start py-1.5 md:py-2">

                    <!-- STEP NUMBER -->
                    <div class="flex-shrink-0 w-6 h-6 md:w-7 md:h-7
                                rounded-full bg-[#004F11]
                                text-[#E9CD2D] font-bold
                                flex items-center justify-center
                                text-xs md:text-sm shadow-md ring-2 ring-white/10">

                        ${i + 1}

                    </div>

                    <!-- STEP TEXT -->
                    <p class="text-sm md:text-base leading-relaxed text-gray-800
                            pt-[2px] md:pt-0 tracking-[0.1px]">

                        ${step}

                    </p>

                </div>
            `).join("");

            const pricingHtml = `
            <div class="mt-3 pt-3 border-t border-gray-200 space-y-3 text-sm">

                <!-- Traditional -->
                <div class="flex items-center justify-between">
                    <span class="text-gray-700 font-medium">Traditional</span>
                    <div class="text-right">
                        <div class="text-[#004F11] font-semibold text-base">₱${regular.traditional}</div>
                        <div class="text-xs text-gray-500">₱${discounted.traditional} discounted</div>
                    </div>
                </div>

                <!-- Non-AC Modern -->
                <div class="flex items-center justify-between">
                    <span class="text-gray-700 font-medium">Non-AC Modern</span>
                    <div class="text-right">
                        <div class="text-[#004F11] font-semibold text-base">₱${regular.nonAcModern}</div>
                        <div class="text-xs text-gray-500">₱${discounted.nonAcModern} discounted</div>
                    </div>
                </div>

                <!-- AC Modern -->
                <div class="flex items-center justify-between">
                    <span class="text-gray-700 font-medium">AC Modern</span>
                    <div class="text-right">
                        <div class="text-[#004F11] font-semibold text-base">₱${regular.acModern}</div>
                        <div class="text-xs text-gray-500">₱${discounted.acModern} discounted</div>
                    </div>
                </div>

            </div>
            `;

            const html = `
            <div class="min-w-full px-1 sm:px-2 route-card opacity-0 translate-y-4">

                <div class="bg-gradient-to-br from-[#004F11] to-[#1f7a3a]
                            rounded-xl sm:rounded-2xl shadow-xl overflow-hidden
                            border border-white/10 backdrop-blur-md">

                    <div class="route-details">

                        <!-- HEADER -->
                        <div class="summary flex items-center justify-between gap-2 sm:gap-3
                                    px-3 sm:px-4 py-3 sm:py-4 cursor-pointer
                                    hover:bg-white/5 transition-colors duration-200">

                            <div class="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">

                                <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#E9CD2D]
                                            flex items-center justify-center shrink-0 shadow-sm">
                                    <i class="fa-solid fa-route text-[#004F11] text-sm"></i>
                                </div>

                                <div class="flex flex-col min-w-0">
                                    <span class="text-[#E9CD2D] font-semibold text-sm sm:text-base truncate tracking-wide">
                                        ${route.title}
                                    </span>
                                    <span class="text-white/70 text-[11px] sm:text-sm truncate">
                                        ${ridesCount} • ${duration}
                                    </span>
                                </div>

                            </div>

                            <span class="text-[#E9CD2D] text-sm transition-transform duration-300 arrow opacity-80">
                                ▲
                            </span>

                        </div>

                        <!-- CONTENT -->
                        <div class="route-content hidden bg-white/95 text-gray-800
                                    px-3 sm:px-4 py-3 sm:py-4">

                            <div class="max-h-44 sm:max-h-52 overflow-y-auto space-y-2 pr-1
                                        scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                                ${stepsHtml}
                            </div>

                            <div class="mt-3">
                                ${pricingHtml}
                            </div>

                        </div>

                    </div>

                </div>

            </div>
            `;
            
            $slider.append(html);
        });

        updateSlider();

        // Animate cards after render
        setTimeout(() => {
            $(".route-card").each(function (i) {
                $(this).delay(i * 120).queue(function (next) {
                    $(this).removeClass("opacity-0 translate-y-4")
                        .addClass("opacity-100 translate-y-0 transition-all duration-500 ease-out");
                    next();
                });
            });
        }, 50);
    };

// ---------- CALCULATE ROUTE BUTTON (LOADING STATE) ----------
$("#calculateRouteButton").on("click", function () {

    $("#routePanel").removeClass("hidden");

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

    // ---------- MAP CONTROLS POSITION SYNC ----------

    const $controls = $("#mapControls");
    const $routePanel = $("#routePanel");

    function updateControlsPosition() {

        if (isMobile()) {
            // 📱 ONLY apply on mobile
            if (!$routePanel.hasClass("hidden")) {
                $controls.css("bottom", "220px");
            } else {
                $controls.css("bottom", "16px"); 
            }
        } else {
            $controls.css("bottom", "");
        }
    }

    // ---------- ROAD CHANGE MODAL ----------

    // OPEN MODAL 
    function openRoadChangeModal() {
        $("#roadChangeModal").removeClass("hidden");
    }

    // CLOSE MODAL helper
    function closeRoadChangeModal() {
        $("#roadChangeModal").addClass("hidden");
    }

    // YES BUTTON
    $("#roadYes").on("click", function () {

        closeRoadChangeModal();
    });

    // NO BUTTON
    $("#roadNo").on("click", function () {

        closeRoadChangeModal();
    });

    $("#openRoadChangeBtn").on("click", function () {
        $("#roadChangeModal").removeClass("hidden");
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

    // ---------- ORIENTATION CHECK (LANDSCAPE MODE OVERLAY) ----------
    function checkOrientation() {
        if (window.innerWidth > window.innerHeight && window.innerWidth < 1024) {
            document.getElementById('rotateOverlay').classList.remove('hidden');
        } else {
            document.getElementById('rotateOverlay').classList.add('hidden');
        }
    }

    // Listen for orientation changes and resize events
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    // Initial check
    checkOrientation();

});