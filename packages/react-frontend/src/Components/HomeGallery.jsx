import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import SlidingPane from "react-sliding-pane";
import "react-sliding-pane/dist/react-sliding-pane.css";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import "../Styles/HomeGallery.scss";

const HomeGallery = () => {
  const navigate = useNavigate();
  const [pickFilter, setPickFilter] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState(new Set());
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // search state
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5432";
  
  const diet_prefs = [
    "Vegan",
    "Vegetarian",
    "Pescatarian",
    "Keto",
    "Halal",
    "Kosher",
    "Gluten-Free",
    "Dairy-Free",
    "Nut-free",
    "Low-carb",
    "Low-sodium",
  ];

  const PLACEHOLDER_IMG =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="600" height="400">
        <rect width="100%" height="100%" fill="#e9ecef"/>
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
          font-family="Arial, Helvetica, sans-serif" font-size="24" fill="#6c757d">
          Recipe Image
        </text>
      </svg>`);

  const toggleFilter = (pref) => {
    setSelectedFilter((prev) => {
      const updated = new Set(prev);
      updated.has(pref) ? updated.delete(pref) : updated.add(pref);
      return updated;
    });
  };

  // debounce search input (prevents re-filtering on every keystroke)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 150);
    return () => clearTimeout(t);
  }, [search]);

  // fetch recipes from backend (same as you do now)
  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setErr("");

        const params = new URLSearchParams();
        if (selectedFilter.size > 0) {
          params.set("diets", Array.from(selectedFilter).join(","));
          params.set("match", "all"); // or "any"
        }

        const url = `${API_BASE}/api/recipes/public${params.toString() ? `?${params}` : ""}`;

        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`Failed (${res.status})`);

        const data = await res.json();
        setRecipes(Array.isArray(data) ? data : []);
      } catch (e) {
        if (e.name !== "AbortError") setErr(e.message || "Failed to load");
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [selectedFilter]);

  // apply search client-side
  const filteredRecipes = useMemo(() => {
    if (!debouncedSearch) return recipes;

    return recipes.filter((r) => {
      const name = String(r?.name || "").toLowerCase();

      const ingredientsText = Array.isArray(r?.ingredients)
        ? r.ingredients.join(" ").toLowerCase()
        : "";

      return name.includes(debouncedSearch) || ingredientsText.includes(debouncedSearch);
    });
  }, [recipes, debouncedSearch]);

  const placeholders = Array.from({ length: 10 });

  return (
    <div className="gallery-page">

      <div className="top-buttons">

        <Card
          className="filter-card"
          onClick={() => setPickFilter(true)}
          style={{ cursor: "pointer" }}
        >
          <Card.Title className="filter-card-title">Filter</Card.Title>
        </Card>

        <SlidingPane
          isOpen={pickFilter}
          from="bottom"
          width="100vw"
          className="sheet sheet--diet"
          overlayClassName="sheet-overlay"
          onRequestClose={() => setPickFilter(false)}
          title="Filter by diet."
        >
          <div className="sheet-body">
            {diet_prefs.map((pref) => (
              <Button
                key={pref}
                className={`pick-filter-button ${selectedFilter.has(pref) ? "selected" : ""}`}
                onClick={() => toggleFilter(pref)}
              >
                {pref}
              </Button>
            ))}
          </div>

          <div style={{ marginTop: 12 }}>
            <Button variant="secondary" onClick={() => setSelectedFilter(new Set())}>
              Clear
            </Button>
          </div>
        </SlidingPane>

        <Card
          className="new-recipe-card"
          onClick={() => navigate("/preferences")}
          style={{ cursor: "pointer" }}
        >
          <Card.Title className="new-recipe-card-title">+ New Recipe</Card.Title>
        </Card>
      </div>

      <div className="search-row">
        {/* Search bar */}
        <input
          className="search-bar"
          type="text"
          placeholder="Search recipes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid">
        {loading ? (
          placeholders.map((_, i) => <Card key={i} className="recipe-card"> ... </Card>)
        ) : err ? (
          <p className="error">{err}</p>
        ) : filteredRecipes.length === 0 ? (
          <p className="muted" style={{ padding: "16px" }}>
            No recipes match your search.
          </p>
        ) : (
          filteredRecipes.map((r) => (
            <Card
              key={r._id}
              className="recipe-card"
              onClick={() => navigate(`/recipe/${r._id}`)}
              style={{ cursor: "pointer" }}
            >
              <Card.Img
                variant="top"
                src={r.image || PLACEHOLDER_IMG}
                alt={r.name}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = PLACEHOLDER_IMG;
                }}
              />
              <Card.Body>
                <Card.Title className="truncate">{r.name || "Untitled recipe"}</Card.Title>
              </Card.Body>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default HomeGallery;