export function renderRoutesTable(routes, tableBody) {
    tableBody.empty();

    routes.forEach(route => {
        const statusStyle = getStatusStyle(route.status);
        const routeTypeStyle = getRouteTypeStyle(route.type);

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
                <td class="py-3 text-center space-x-2">
                    <button class="text-blue-500 hover:underline cursor-pointer edit-route-btn" data-route-id="${route.id}">Edit</button>
                    <button class="text-red-500 hover:underline cursor-pointer delete-route-btn" data-route-id="${route.id}">Delete</button>
                    <button class="text-orange-500 hover:underline cursor-pointer add-temporary-route-btn" data-route-id="${route.id}">Add Temporary Route</button>
                </td>
            </tr>
        `);
        tableBody.append(row);
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