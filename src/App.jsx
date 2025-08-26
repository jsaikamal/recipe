import React, { useEffect, useState } from "react";

/*
 Recipe Ideas - Extended
 - Search by ingredient (TheMealDB)
 - Filter by category (from API)
 - Cooking time estimate (heuristic based on instruction length)
 - Mood filter (maps to categories/tags)
 - Combined filtering & client-side enrichment (fetch details)
 - Responsive UI and error handling
*/

const API_BASE = "https://www.themealdb.com/api/json/v1/1";

function estimateCookingTimeCategory(instructions = "") {
  // Heuristic: use instruction length to approximate time
  const words = instructions.trim().split(/\s+/).filter(Boolean).length;
  if (words === 0) return "unknown";
  if (words < 100) return "quick"; // < ~30 mins
  if (words < 300) return "medium"; // 30-60
  return "long"; // 60+ mins
}

const MOOD_MAP = {
  // mood => list of categories we consider matching
  Comfort: ["Beef", "Pasta", "Stew", "Chicken"],
  Party: ["Dessert", "Snack", "Side"],
  Healthy: ["Vegetarian", "Seafood", "Vegan"],
  Light: ["Salad", "Vegetarian", "Seafood"],
  Spicy: ["Curry", "Mexican", "Indian", "Thai"],
};

export default function App() {
  const [ingredient, setIngredient] = useState("");
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedMood, setSelectedMood] = useState("All");
  const [selectedCookTime, setSelectedCookTime] = useState("All");
  const [meals, setMeals] = useState([]); // enriched meals
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showInstructionsFor, setShowInstructionsFor] = useState(null);

  useEffect(() => {
    // fetch categories for the dropdown
    async function loadCategories() {
      try {
        const res = await fetch(`${API_BASE}/list.php?c=list`);
        const data = await res.json();
        if (data && data.meals) {
          setCategories(data.meals.map((c) => c.strCategory));
        } else {
          setCategories([]);
        }
      } catch (err) {
        console.warn("Failed to load categories", err);
        setCategories([]);
      }
    }
    loadCategories();
  }, []);

  // Fetch list of meals by ingredient or by category (basic API returns limited fields)
  async function fetchMeals({ byIngredient, byCategory } = {}) {
    setLoading(true);
    setError("");
    setMeals([]);
    try {
      let list = null;

      if (byIngredient) {
        const res = await fetch(
          `${API_BASE}/filter.php?i=${encodeURIComponent(byIngredient)}`
        );
        const data = await res.json();
        list = data.meals; // may be null
      }

      if (!byIngredient && byCategory && byCategory !== "All") {
        const res = await fetch(
          `${API_BASE}/filter.php?c=${encodeURIComponent(byCategory)}`
        );
        const data = await res.json();
        list = data.meals;
      }

      // If nothing specified, show popular by category 'Beef' as fallback
      if (!byIngredient && (!byCategory || byCategory === "All")) {
        // let's fetch a few categories to give initial suggestions
        const res = await fetch(`${API_BASE}/search.php?s=`);
        const data = await res.json();
        list = data.meals; // search all - may return many
      }

      if (!list) {
        setError("No recipes found.");
        setMeals([]);
        return;
      }

      // Limit number of meals to enrich to avoid many network calls
      const limited = list.slice(0, 30);

      // Enrich meals with details (lookup by id)
      const enriched = await Promise.all(
        limited.map(async (m) => {
          try {
            const r = await fetch(`${API_BASE}/lookup.php?i=${m.idMeal}`);
            const d = await r.json();
            const full = d.meals ? d.meals[0] : null;
            const instructions = full?.strInstructions || "";
            const cookCat = estimateCookingTimeCategory(instructions);
            const categoryName =
              full?.strCategory || m.strCategory || "Unknown";
            const tagsRaw = (full?.strTags || "")
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean);
            // gather mood candidates based on category & tags & name
            const moodHints = [
              categoryName,
              ...(tagsRaw || []),
              full?.strMeal || "",
            ]
              .join(" ")
              .toLowerCase();

            // determine mood matches
            const matchedMoods = Object.keys(MOOD_MAP).filter((mood) =>
              MOOD_MAP[mood].some((c) => moodHints.includes(c.toLowerCase()))
            );

            return {
              id: m.idMeal,
              title: m.strMeal,
              thumb: m.strMealThumb,
              category: categoryName,
              area: full?.strArea || "",
              instructions,
              tags: tagsRaw,
              cookTimeCategory: cookCat, // quick|medium|long|unknown
              moods: matchedMoods.length ? matchedMoods : ["General"],
              source:
                full?.strSource ||
                full?.strYoutube ||
                `https://www.themealdb.com/meal/${m.idMeal}`,
            };
          } catch (e) {
            // fallback minimal data
            return {
              id: m.idMeal,
              title: m.strMeal,
              thumb: m.strMealThumb,
              category: m.strCategory || "Unknown",
              area: "",
              instructions: "",
              tags: [],
              cookTimeCategory: "unknown",
              moods: ["General"],
              source: `https://www.themealdb.com/meal/${m.idMeal}`,
            };
          }
        })
      );

      setMeals(enriched);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch recipes. Try again later.");
    } finally {
      setLoading(false);
    }
  }

  function applyClientFilters(list) {
    return list.filter((meal) => {
      if (selectedCategory !== "All" && meal.category !== selectedCategory)
        return false;
      if (
        selectedCookTime !== "All" &&
        meal.cookTimeCategory !== selectedCookTime
      )
        return false;
      if (selectedMood !== "All" && !meal.moods.includes(selectedMood))
        return false;
      return true;
    });
  }

  function handleSearchClick() {
    // require either ingredient or category selected; but we allow blank to fetch generic search
    fetchMeals({
      byIngredient: ingredient ? ingredient.trim() : null,
      byCategory: selectedCategory,
    });
  }

  // convenience: quick-start search by pressing Enter in ingredient input
  const onKeyDownEnter = (e) => {
    if (e.key === "Enter") handleSearchClick();
  };

  const filteredMeals = applyClientFilters(meals);

  return (
    <div className="ri-page">
      <header className="ri-header">
        <h1>🍳 Recipe Ideas</h1>
        <p className="ri-sub">
          Taylor's helper — use what you have and filter by time, category,
          mood.
        </p>
      </header>

      <main className="ri-main">
        <section className="ri-controls">
          <div className="row">
            <input
              aria-label="ingredient"
              placeholder="Enter ingredient (e.g., chicken)"
              value={ingredient}
              onChange={(e) => setIngredient(e.target.value)}
              onKeyDown={onKeyDownEnter}
            />
            <button
              onClick={handleSearchClick}
              className="btn"
              disabled={loading}
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </div>

          <div className="filters-row">
            <div className="filter">
              <label>Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="All">All</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter">
              <label>Cooking time</label>
              <select
                value={selectedCookTime}
                onChange={(e) => setSelectedCookTime(e.target.value)}
              >
                <option value="All">All</option>
                <option value="quick">Quick (&lt;30 mins)</option>
                <option value="medium">Medium (30–60 mins)</option>
                <option value="long">Long (&gt;60 mins)</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>

            <div className="filter">
              <label>Mood</label>
              <select
                value={selectedMood}
                onChange={(e) => setSelectedMood(e.target.value)}
              >
                <option value="All">All</option>
                {Object.keys(MOOD_MAP).map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
                <option value="General">General</option>
              </select>
            </div>

            <div className="filter reset-wrap">
              <button
                className="btn secondary"
                onClick={() => {
                  setIngredient("");
                  setSelectedCategory("All");
                  setSelectedMood("All");
                  setSelectedCookTime("All");
                  setMeals([]);
                  setError("");
                }}
              >
                Reset
              </button>
            </div>
          </div>
        </section>

        <section className="ri-results">
          {error && <div className="error">{error}</div>}
          {!error && !loading && meals.length === 0 && (
            <div className="hint">
              No recipes loaded — try searching by ingredient or selecting a
              category.
            </div>
          )}

          {filteredMeals.length > 0 && (
            <div className="grid">
              {filteredMeals.map((m) => (
                <article key={m.id} className="card">
                  <img src={m.thumb} alt={m.title} />
                  <div className="card-body">
                    <h3>{m.title}</h3>
                    <div className="meta">
                      <span className="pill">{m.category}</span>
                      <span className="pill">{m.area}</span>
                      <span className="pill">Time: {m.cookTimeCategory}</span>
                    </div>
                    <div className="mood-row">
                      {m.moods.map((md) => (
                        <span className="mood" key={md}>
                          {md}
                        </span>
                      ))}
                    </div>
                    <div className="actions">
                      <a
                        className="link"
                        href={m.source}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View source
                      </a>
                      <button
                        className="btn small"
                        onClick={() => setShowInstructionsFor(m)}
                      >
                        Show instructions
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          {loading && <div className="loading">Loading recipes…</div>}
        </section>
      </main>

      {showInstructionsFor && (
        <div className="modal" role="dialog" aria-modal="true">
          <div className="modal-content">
            <button
              className="modal-close"
              onClick={() => setShowInstructionsFor(null)}
            >
              ×
            </button>
            <h2>{showInstructionsFor.title}</h2>
            <p>
              <strong>Category:</strong> {showInstructionsFor.category} •{" "}
              <strong>Mood:</strong> {showInstructionsFor.moods.join(", ")}
            </p>
            <div className="instructions">
              {showInstructionsFor.instructions ? (
                showInstructionsFor.instructions
                  .split("\n")
                  .map((line, idx) => <p key={idx}>{line}</p>)
              ) : (
                <p>No instructions available.</p>
              )}
            </div>
            <div style={{ marginTop: 12 }}>
              <a
                className="btn"
                href={showInstructionsFor.source}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open full recipe
              </a>
            </div>
          </div>
        </div>
      )}

      <footer className="ri-footer">
        Built for Taylor • Uses TheMealDB (no API key required)
      </footer>
    </div>
  );
}
