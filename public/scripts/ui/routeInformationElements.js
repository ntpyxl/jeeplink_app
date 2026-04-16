export function createInstructionCard(step, i) {
    return $(`
        <div class="flex gap-3 md:gap-4 items-start">
            <div class="flex-shrink-0 w-6 h-6 md:w-7 md:h-7
                        rounded-full bg-[#004F11]
                        text-[#E9CD2D] font-bold
                        flex items-center justify-center
                        text-xs md:text-sm shadow-sm">

                ${i + 1}
            </div>
            
            <p class="text-sm md:text-base leading-relaxed text-gray-800
                    pt-[2px] md:pt-0">

                ${step}
            </p>
        </div>
    `);
}

export function createRouteStepRow(routeTitle, routeInformation, routeSteps) {
    return `
        <div class="min-w-full px-1 sm:px-2 route-card opacity-0 translate-y-4">
            <div class="bg-gradient-to-br from-[#004F11] to-[#1f7a3a]
                        rounded-xl sm:rounded-2xl shadow-lg overflow-hidden
                        border border-white/10">
                
                <div class="route-details">
                    <div class="summary flex items-center justify-between gap-2 sm:gap-3
                                px-3 sm:px-4 py-3 sm:py-4 cursor-pointer">

                        <div class="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">

                            <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#E9CD2D]
                                        flex items-center justify-center shrink-0">
                                <i class="fa-solid fa-route text-[#004F11] text-sm"></i>
                            </div>

                            <div class="flex flex-col min-w-0">
                                <span class="text-[#E9CD2D] font-semibold text-sm sm:text-base truncate">
                                    ${routeTitle}
                                </span>
                                <span class="text-white/70 text-[11px] sm:text-xs truncate">
                                    ${routeInformation.routeDistance} • ${routeInformation.jeepRidesCount} • ~${routeInformation.tripDurationFormatted}
                                </span>
                            </div>

                        </div>

                        <span class="text-[#E9CD2D] text-sm transition-transform duration-300 arrow">
                            ▼
                        </span>
                    </div>

                    <div class="route-content hidden bg-white/95 text-gray-800
                                px-3 sm:px-4 py-2 sm:py-3">

                        <div class="max-h-40 sm:max-h-48 overflow-y-auto space-y-2 pr-1">
                            ${routeSteps}
                        </div>

                    </div>

                </div>

            </div>

        </div>
        `;
}