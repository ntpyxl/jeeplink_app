let activeToggleBtn = null;

export function renderRoutesTable(routes, tableBody) {
    tableBody.empty();

    $(document).off("click", ".action-toggle").on("click", ".action-toggle", function (e) {
        e.stopPropagation();

        const menu = $(this).siblings(".action-menu");
        const isOpen = !menu.hasClass("hidden");

        $(".action-menu").addClass("hidden");

        if (isOpen) {
            activeToggleBtn = null;
            return;
        }

        menu.removeClass("hidden");
        activeToggleBtn = this;

        positionMenu(menu, this);
    });

    $(document).off("click.dropdown").on("click.dropdown", function () {
        $(".action-menu").addClass("hidden");
    });

    $(window).on("scroll", function () {
        if (!activeToggleBtn) return;

        const menu = $(activeToggleBtn).siblings(".action-menu");

        if (menu.hasClass("hidden")) return;

        positionMenu(menu, activeToggleBtn);
    });

    $(window).on("resize", function () {
        if (!activeToggleBtn) return;

        const menu = $(activeToggleBtn).siblings(".action-menu");

        if (menu.hasClass("hidden")) return;

        positionMenu(menu, activeToggleBtn);
    });

    routes.forEach(route => {
        const statusStyle = getStatusStyle(route.status);
        const routeTypeStyle = getRouteTypeStyle(route.type);
        const isTemporary = route.type === "temporary";
        const hasChildRoute = route.temp_route_id ? true : false;

        const row = $(`
            <tr class="border-b hover:bg-gray-50">
                <td class="py-3">${route.id}</td>
                <td class="py-3">${route.name}</td>
                <td class="py-3">${route.parent_route_id ?? "—"}</td>
                <td class="py-3">
                    <span class="${statusStyle.class}">${route.status}</span>
                </td>
                <td class="py-3">
                    <span class="${routeTypeStyle.class}">${route.type}</span>
                </td>
                <td class="py-3 text-center space-x-2 relative">

                    <button class="action-toggle px-3 py-2 rounded-full bg-gray-100 hover:bg-gray-200 transition" data-route-id="${route.id}">
                        <i class="fas fa-ellipsis-h text-gray-600"></i>
                    </button>

                    <div class="action-menu hidden fixed w-44 bg-white border border-gray-200 rounded-md shadow-sm z-[9999] text-sm text-left">

                        <button class="w-full px-3 py-2 text-blue-500 hover:bg-gray-100 cursor-pointer edit-route-btn" data-route-id="${route.id}">Edit</button>
                        <button 
                            class="w-full px-3 py-2 text-red-500 hover:bg-gray-100 cursor-pointer delete-route-btn" 
                            data-route-id="${route.id}"
                            ${hasChildRoute ? `data-child-route-id="${route.temp_route_id}"` : ""}
                        ">
                            Delete
                        </button>

                        ${
                            !isTemporary && !hasChildRoute
                                ? `<button class="w-full px-3 py-2 text-orange-500 hover:bg-gray-100 cursor-pointer add-temporary-route-btn" data-route-id="${route.id}">Add Temporary Route</button>`
                                : ""
                        }

                        ${
                            hasChildRoute
                                ? `
                                    <button class="w-full px-3 py-2 text-blue-500 hover:bg-gray-100 cursor-pointer edit-route-btn" data-route-id="${route.temp_route_id}">Edit Temporary Route</button>
                                    <button class="w-full px-3 py-2 text-red-500 hover:bg-gray-100 cursor-pointer delete-temp-route-btn" data-route-id="${route.temp_route_id}">Delete Temporary Route</button>
                                `
                                : ""
                        }

                    </div>
                </td>
            </tr>
        `);
        tableBody.append(row);
    });
}

function positionMenu(menu, btn) {
    const rect = btn.getBoundingClientRect();

    menu.removeClass("hidden").css({ visibility: "hidden" });

    const menuHeight = menu.outerHeight();
    const menuWidth = menu.outerWidth();

    menu.css({ visibility: "visible" });

    let top = rect.bottom + 6;
    let left = rect.right - menuWidth;

    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    if (top + menuHeight > window.innerHeight) {
        top = rect.top - menuHeight - 6;
    }

    if (left < 6) left = 6;
    if (left + menuWidth > viewportWidth) {
        left = viewportWidth - menuWidth - 6;
    }

    menu.css({
        top: `${top}px`,
        left: `${left}px`
    });
}

function getStatusStyle(status) {
    const formattedStatus = status.toLowerCase();

    switch (formattedStatus) {
        case "enabled":
            return { class: "bg-green-100 text-green-600 px-2 py-1 rounded-full text-xs" };
        case "disabled":
            return { class: "bg-red-100 text-red-600 px-2 py-1 rounded-full text-xs" };
        default:
            return { class: "bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs" };
    }
}

function getRouteTypeStyle(type) {
    const formattedType = type.toLowerCase();

    switch (formattedType) {
        case "main":
            return { class: "bg-blue-100 text-blue-600 px-2 py-1 rounded-full text-xs" };
        case "temporary":
            return { class: "bg-orange-100 text-orange-600 px-2 py-1 rounded-full text-xs" };
        default:
            return { class: "bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs" };
    }
}