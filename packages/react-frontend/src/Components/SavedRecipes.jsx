import { useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import Card from "react-bootstrap/Card";
import SlidingPane from "react-sliding-pane";
import "react-sliding-pane/dist/react-sliding-pane.css";
import Button from "react-bootstrap/Button";
import "../Styles/SavedRecipes.scss";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5432";

const SavedRecipes = () => {
  const navigate = useNavigate();
  const [recipes, setRecipes] = useState([]);
  const [pickFilter, setPickFilter] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const userEmail = (localStorage.getItem("userEmail") || "").trim().toLowerCase();

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

  const labelToSchemaKey = {
    Vegan: "Vegan",
    Vegetarian: "Vegetarian",
    Pescatarian: "Pescatarian",
    Keto: "Keto",
    Halal: "Halal",
    Kosher: "Kosher",
    "Gluten-Free": "GlutenFree",
    "Dairy-Free": "DairyFree",
    "Nut-free": "NutFree",
    "Low-carb": "LowCarb",
    "Low-sodium": "LowSodium",
  };

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

  const categories = ["Dinner", "Dessert", "Breakfast", "Lunch", "Snacks"];

  useEffect(() => {
    if (!userEmail) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setErr("");

        const res = await fetch(`${API_BASE}/api/me/saved-recipes`, {
          signal: controller.signal,
          headers: { "x-user-email": userEmail },
        });

        if (!res.ok) {
          let msg = `Failed to load recipes (${res.status})`;
          try {
            const e = await res.json();
            msg = e.error || e.message || msg;
          } catch {}
          throw new Error(msg);
        }

        const json = await res.json();
        setRecipes(Array.isArray(json.recipes) ? json.recipes : []);
      } catch (e) {
        if (e.name !== "AbortError") setErr(e.message || "Failed to load recipes");
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [userEmail]);

  const toggleFilter = (pref) => {
    setSelectedFilter((prev) => {
      const updated = new Set(prev);
      updated.has(pref) ? updated.delete(pref) : updated.add(pref);
      return updated;
    });
  };

  const filtered = useMemo(() => {
    if (!selectedFilter.size) return recipes;
    const keys = [...selectedFilter].map((l) => labelToSchemaKey[l]).filter(Boolean);
    return recipes.filter((r) => keys.every((k) => r?.nutrition_types?.[k] === true));
  }, [recipes, selectedFilter]);

  const recipesByCategory = useMemo(() => {
    const buckets = categories.reduce((acc, c) => {
      acc[c] = [];
      return acc;
    }, {});

    for (const r of filtered) {
      const c = r?.category || "Dinner";
      if (!buckets[c]) buckets[c] = [];
      buckets[c].push(r);
    }
    return buckets;
  }, [filtered]);

  if (!userEmail) {
    return (
      <div className="recipe-display">
        <header className="saved-recipes-header">Saved Recipes</header>
        <div style={{ padding: "16px" }}>
          <p className="error">No email saved.</p>
          <p>Please set your email in the Account page to view your recipes.</p>
          <Button variant="dark" onClick={() => navigate("/account")}>
            Go to Account
          </Button>
        </div>
      </div>
    );
  }

  if (loading) return <div className="recipe-display"><p>Loading…</p></div>;
  if (err) return <div className="recipe-display"><p className="error">{err}</p></div>;

  const TOTAL_CARD_SLOTS = 10;

  return (
    <div className="recipe-list">
      <header className="saved-recipes-header">Saved Recipes</header>

      <Card
        className="filter-card"
        onClick={() => setPickFilter(true)}
        style={{ cursor: "pointer" }}
      >
        <Card.Title className="filter-card-title">{"Filter"}</Card.Title>
      </Card>

      <SlidingPane
        isOpen={pickFilter}
        from="bottom"
        width="100vw"
        className="sheet sheet--diet"
        overlayClassName="sheet-overlay"
        onRequestClose={() => setPickFilter(false)}
        title="Filter by diet"
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

          <div style={{ marginTop: 12 }}>
            <Button variant="secondary" onClick={() => setSelectedFilter(new Set())}>
              Clear
            </Button>
          </div>
        </div>
      </SlidingPane>

      <div className="scrollable-recipes">
        {categories.map((category) => {
          const list = recipesByCategory[category] || [];
          const fillerCount = Math.max(0, TOTAL_CARD_SLOTS - list.length);
          const fillers = Array.from({ length: fillerCount });

          return (
            <section key={category} className="category-block">
              <header className="categories">{category}</header>

              <div className="recipes-grid">
                {list.map((r) => {
                  const owner = (r.createdByEmail || r.ownerEmail || "").trim().toLowerCase();
                  const isMine = !!owner && owner === userEmail;
                  const isLiked = !isMine;

                  return (
                    <Card
                      key={r._id}
                      className="recipe-card"
                      onClick={() => navigate(`/recipe/${r._id}`)}
                      style={{ cursor: "pointer", position: "relative" }}
                    >
                      {isLiked && (
                        <div
                          style={{
                            position: "absolute",
                            top: 8,
                            right: 10,
                            fontSize: 18,
                            zIndex: 2,
                            textShadow: "0 1px 2px rgba(0,0,0,0.25)",
                          }}
                          aria-label="Liked"
                          title="Liked"
                        >
                          ♥
                        </div>
                      )}

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
                  );
                })}

                {fillers.map((_, i) => (
                  <Card key={`f-${category}-${i}`} className="recipe-card" />
                ))}

                {!list.length && (
                  <p className="muted span-all">No recipes in this category.</p>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};

export default SavedRecipes;