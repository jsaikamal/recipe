🍴 Recipe Finder App

A simple and interactive Recipe Finder web application built with React and Tailwind CSS.
It allows users to search for recipes by ingredient or dish name and fetches results from a free public API.

🔗 Live Demo

👉 https://q9dq65.csb.app/

✨ Features

🔍 Search recipes by keyword (e.g., "chicken", "pasta")

🍽️ Displays recipe title, thumbnail, and category

📖 Shows detailed instructions for selected recipes

🌍 Fetches data from TheMealDB API (free and no authentication required)

📱 Responsive design (works on desktop and mobile)

❌ Handles empty searches and invalid results

🛠️ Tech Stack

React – JavaScript UI framework

Tailwind CSS – Styling and layout

TheMealDB API – Recipe data provider

API Endpoints used:

Search by name:

https://www.themealdb.com/api/json/v1/1/search.php?s={recipe}


Lookup full meal details:

https://www.themealdb.com/api/json/v1/1/lookup.php?i={mealId}



📂 Project Structure
recipe-app/
├── public/                # Static assets
├── src/
│   ├── App.jsx            # Main app logic
│   ├── components/        # UI components like RecipeCard
│   ├── index.css          # Tailwind styles
│   ├── main.jsx           # React entry file
├── package.json           # Dependencies
└── README.md              # Documentation

📌 Notes

Uses TheMealDB API which is completely free, no API key required.

Can be extended to add favorites, categories filter, or meal videos.

Designed for beginners to practice API calls + React + Tailwind.

👨‍🍳 Author

Created by <Jsaikamal>
Project developed for learning React + API integration + Tailwind CSS.