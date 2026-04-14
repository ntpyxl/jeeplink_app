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

            const instructions =
                route.info?.cheapestRouteInstructions ||
                route.info?.fastestRouteInstructions ||
                route.info?.minimalTransferRouteInstructions ||
                [];

            const ridesCount = route.path?.jeepRidesCount || 0;
            const duration = route.path?.routeDurationSeconds
                ? Math.round(route.path.routeDurationSeconds / 60)
                : 0;

            // Limited to 5 instructions
            const limited = instructions.slice(0, 5);

            const stepsHtml = limited.map((step, i) => `
                <div class="flex gap-3 md:gap-4 items-start">

                    <!-- STEP NUMBER -->
                    <div class="flex-shrink-0 w-6 h-6 md:w-7 md:h-7
                                rounded-full bg-[#004F11]
                                text-[#E9CD2D] font-bold
                                flex items-center justify-center
                                text-xs md:text-sm shadow-sm">

                        ${i + 1}

                    </div>

                    <!-- STEP TEXT -->
                    <p class="text-sm md:text-base leading-relaxed text-gray-800
                            pt-[2px] md:pt-0">

                        ${step}

                    </p>

                </div>
            `).join("");

            const html = `
            <div class="min-w-full px-1 sm:px-2">

                <div class="bg-gradient-to-br from-[#004F11] to-[#1f7a3a]
                            rounded-xl sm:rounded-2xl shadow-lg overflow-hidden
                            border border-white/10">

                    <div class="route-details">

                        <!-- HEADER -->
                        <div class="summary flex items-center justify-between gap-2 sm:gap-3
                                    px-3 sm:px-4 py-3 sm:py-4 cursor-pointer">

                            <div class="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">

                                <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#E9CD2D]
                                            flex items-center justify-center shrink-0">
                                    <i class="fa-solid fa-route text-[#004F11] text-sm"></i>
                                </div>

                                <div class="flex flex-col min-w-0">
                                    <span class="text-[#E9CD2D] font-semibold text-sm sm:text-base truncate">
                                        ${route.title}
                                    </span>
                                    <span class="text-white/70 text-[11px] sm:text-xs truncate">
                                        ${ridesCount} rides • ~${duration} mins
                                    </span>
                                </div>

                            </div>

                            <span class="text-[#E9CD2D] text-sm transition-transform duration-300 arrow">
                                ▼
                            </span>

                        </div>

                        <!-- CONTENT -->
                        <div class="route-content hidden bg-white/95 text-gray-800
                                    px-3 sm:px-4 py-2 sm:py-3">

                            <div class="max-h-40 sm:max-h-48 overflow-y-auto space-y-2 pr-1">
                                ${stepsHtml}
                            </div>

                        </div>

                    </div>

                </div>

            </div>
            `;
            $slider.append(html);
        });

        updateSlider();
    };

    // ---------- MAP CONTROLS POSITION SYNC ----------

    const $controls = $("#mapControls");
    const $routePanel = $("#routePanel");

    function isMobile() {
        return window.innerWidth < 768; // Tailwind md breakpoint
    }

    function updateControlsPosition() {

        if (isMobile()) {
            // 📱 ONLY apply on mobile
            if (!$routePanel.hasClass("hidden")) {
                $controls.css("bottom", "220px");
            } else {
                $controls.css("bottom", "16px"); // bottom-4
            }
        } else {
            // 💻 Desktop → reset to default (Tailwind handles it)
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

});