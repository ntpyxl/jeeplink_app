# JeepLink Website Application

A navigation app to help commuters navigate Dasmariñas City, Cavite by providing available jeepney routes, traffic updates, route planning, and alerts based on data shared by its users.

## Tech Stack

- **Frontend**: HTML, CSS ([TailwindCSS](https://tailwindcss.com/)), and JavaScript ([JQuery](https://jquery.com/))
- **Map Library**: [Leaflet](https://leafletjs.com/)
- **Tiles**: [OpenStreetMap](https://www.openstreetmap.org/)
- **Hosting & API**: [Vercel](https://vercel.com/)
- **Storage**: [Vercel](https://vercel.com/), and _[Supabase](https://supabase.com/) (to be implemented)_

## Setup

### Prerequisites

- [Node.js](https://nodejs.org/en) installed on your computer
- Vercel installed on your computer
    - If you don't have this installed yet, simply run `npm i -g vercel`, and then `vercel dev`, and then log into your account.

### Installation

**1. Clone the repository**

```
git clone https://github.com/ntpyxl/jeeplink_app.git
cd JeepLink_App
```

**1.1. Pull other branches**

```
git checkout -b <branch_name> origin/<branch_name>
```

> Replace `<branch_name>` with the name of the branch you wish to pull or make edits on.

**2. Install dependencies**

```
npm install
```

**3. Create environment variables**<br/>
Create a file in the project root named `.env.local`, then ask me for tokens. You also have to put the environment variables in the Vercel project you will create on your account in the next step. <br/>

**NEVER COMMIT THIS FILE. IT SHOULD ALREADY BE INCLUDED IN .gitignore!**

**4. Run development server**

```
vercel dev
```

**4.1. First time local development server setup**<br/>
Upon first executing `vercel dev`, you will be prompted to "Set up and develop" the current directory. Just follow these exact prompts for the following setup process:

```
? Set up and develop “~\...\...\JeepLink_App”? yes (or just type 'y', and press enter)

? Which scope should contain your project? <your_name>'s projects (or just press enter)

? Link to existing project? no (or just type 'n', and press enter)

? What’s your project’s name? jeep-link-app (or just press enter)

? In which directory is your code located? ./ (or just press enter)

No framework detected. Default Project Settings:
? Want to modify these settings? no (or just type 'n', and press enter)

? Do you want to change additional project settings? no (or just type 'n', and press enter)

? Detected a repository. Connect it to this project? no (or just type 'n', and press enter)
```

When done succesfully, the local development server should now be available at http://localhost:3000.<br/>
Remember to import the `.env.local` file to your Vercel project's environment variables.
