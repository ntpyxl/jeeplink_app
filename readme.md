# JeepLink Website Application

A navigation app to help commuters navigate Dasmariñas City, Cavite by providing available jeepney routes, traffic updates, route planning, and alerts based on data shared by its users.

## Tech Stack

- **Frontend**: HTML, CSS ([TailwindCSS](https://tailwindcss.com/)), and JavaScript ([JQuery](https://jquery.com/))
- **Map Library**: [Leaflet](https://leafletjs.com/)
- **Tiles**: [OpenStreetMap](https://www.openstreetmap.org/)
- **Hosting & API**: [Vercel](https://vercel.com/)
- **Storage**: [Vercel](https://vercel.com/), and _[Supabase](https://supabase.com/) (to be implemented)_

## Setup

1. Clone the repository

```
git clone https://github.com/ntpyxl/jeeplink_app.git
cd JeepLink_App
```

2. Install dependencies

```
npm install
```

3. Create environment variables
   Create a file in the project root:

```
.env
```

> NEVER COMMIT THIS FILE. IT SHOULD ALREADY BE INCLUDED IN .gitignore

Then ask me for tokens.

4. Run development server

```
vercel dev
```
