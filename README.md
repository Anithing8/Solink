# SoLink

A responsive frontend dashboard for managing, scheduling, and analyzing social media content across multiple platforms.

## Features
* **Fully Responsive Design:** Seamless experience across desktop, tablet, and mobile devices with a custom collapsible sidebar.
* **Analytics Dashboard:** A central hub to track total views, engagement rates, and recent comments.
* **Multi-Platform Support:** UI toggles configured for YouTube, Instagram, and X (Twitter).
* **Secure Setup:** Includes `.env` templates for a backend transition, while utilizing `localStorage` to safely test API keys on the frontend.

## Local Setup
1. Clone this repository to your local machine.
2. Open `index.html` in your web browser.
3. Navigate to the **Settings** tab to input your test API keys (stored locally in your browser).

## Future Backend Transition
This repository includes a `.env` file for when you are ready to connect a Python or Node.js server. 
* **Important:** Never upload your actual `.env` file to GitHub. The provided `.gitignore` will prevent this from happening.
* Use the `.env.example` file to show other developers which variables are required without exposing your actual keys.

## Deployment
For the static frontend, you can deploy this directly via **GitHub Pages**:
1. Go to **Settings > Pages** in your GitHub repository.
2. Set the Source to **Deploy from a branch** and select `main`.
3. Save to publish your site.
