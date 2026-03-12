import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import "../Styles/NewRecipe.scss";
import Card from "react-bootstrap/Card";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";

const NewRecipe = () => {
    const navigate = useNavigate();
    const { state } = useLocation();
    const didRun = useRef(false);
    const [rawText, setRawText] = useState("");
    const [title, setTitle] = useState("");
    const [ingredientsList, setIngredientsList] = useState([]);
    const [instructionsList, setInstructionsList] = useState([]);
    const [substitutionsList, setSubstitutionsList] = useState([]);
    const [swapItem, setSwapItem] = useState(false);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState("");
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [category, setCategory] = useState("Dinner");

    const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5432";

    const categories = [
      "Breakfast",
      "Lunch",
      "Dinner",
      "Dessert",
      "Snacks"
    ];

    const labelToSchemaKey = {
      "Vegan": "Vegan",
      "Vegetarian": "Vegetarian",
      "Pescatarian": "Pescatarian",
      "Keto": "Keto",
      "Halal": "Halal",
      "Kosher": "Kosher",
      "Gluten-Free": "GlutenFree",
      "GlutenFree": "GlutenFree",
      "Dairy-Free": "DairyFree",
      "DairyFree": "DairyFree",
      "Nut-free": "NutFree",
      "NutFree": "NutFree",
      "Low-carb": "LowCarb",
      "LowCarb": "LowCarb",
      "Low-sodium": "LowSodium",
      "LowSodium": "LowSodium",
    };
    
    const dietArrayToNutrition = (dietArr = []) => {
      const defaults = {
        Vegan:false, Vegetarian:false, GlutenFree:false, Pescatarian:false,
        Keto:false, Halal:false, Kosher:false, DairyFree:false,
        NutFree:false, LowCarb:false, LowSodium:false
      };
    
      const out = { ...defaults };
      (dietArr || []).forEach((label) => {
        const key = labelToSchemaKey[label];
        if (key) out[key] = true;
      });
      return out;
    };

    useEffect(() => {
        if (didRun.current) return;
        didRun.current = true;
        handleSubmit();
      }, []);

    const handleSubmit = async () => {

      try {
        setLoading(true);
        setErr("");
        const form = new FormData();
        form.append("notes", state?.notes ?? "");
        form.append("diet", JSON.stringify(state?.diet ?? []));
        form.append("file", state?.selectedFile ?? "");

        const res = await fetch(`${API_BASE}/api/recipes/generate`, {
          method: "POST",
          body: form,
        });


        if (!res.ok) {
          return;
        }

        const data = await res.json();
        setRawText(data.resultText || "");
        setTitle(data.title || "");
        setIngredientsList(Array.isArray(data.ingredientsList) ? data.ingredientsList : []);
        setInstructionsList(Array.isArray(data.instructionsList) ? data.instructionsList : []);
        setSubstitutionsList(Array.isArray(data.substitutionsList) ? data.substitutionsList : []);
      }
      catch(e) {
        if (e.name !== "AbortError") setErr(e.message || String(e));
      }
      finally {
        setLoading(false);
      }
    };

    function parseSubstitutions(substitutionsList) {
      // Normalize to array of lines
      const lines = Array.isArray(substitutionsList)
        ? substitutionsList.map(String)
        : String(substitutionsList || "").split(/\r?\n/);
    
      return lines
        .map(l => l.trim())
        .filter(Boolean)
        // remove an optional bullet of any common kind and leading spaces
        .map(l => l.replace(/^\s*[-*•–—]\s*/, "")) // handles -, *, •, en/em dashes
        // strip trailing period to avoid getting it in the last alternative
        .map(l => l.replace(/\.\s*$/, ""))
        // must look like "<name>: <alts>"
        .map(l => {
          const m = l.match(/^\s*([^:]+?)\s*:\s*(.+)\s*$/);
          if (!m) return null;
          const name = m[1].trim();
          const alternatives = m[2]
            .split(",")
            .map(s => s.trim())
            .filter(Boolean);
          return { name, alternatives };
        })
        .filter(Boolean);
    }
    
    const subsArray = parseSubstitutions(substitutionsList);
    const substitutionMap = subsArray.reduce((map, sub) => {
      map[sub.name.toLowerCase()] = sub.alternatives;
      return map;
    }, {});
    
    function normalizeIngredientLine(line) {
      return String(line || "")
        .replace(/\([^)]*\)/g, " ")  
        .replace(/\*+/g, "")        
        .replace(/\s+/g, " ")       
        .trim()
        .toLowerCase();
    }
    const handleSave = async () => {
      const userEmail = (localStorage.getItem("userEmail") || "").trim();
      const recipeName = (state?.name || title || "").trim();
      if (!recipeName) {
        alert("Recipe name is missing. Try retrying generation or enter a title.");
        return;
      }

      if (!userEmail) {
        alert("No user email set. Please sign in or set localStorage.userEmail");
        return;
      }
    
      const payload = {
        name: recipeName,
        image: state?.imageUrl || "",
        rawText,
        ingredients: ingredientsList,
        instructions: instructionsList,
        substitutions: substitutionsList,
        nutrition_types: dietArrayToNutrition(state?.diet),
        category,
      };
    
      const res = await fetch(`${API_BASE}/api/recipes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": userEmail,
        },
        body: JSON.stringify(payload)
      });
    
      if (!res.ok) {
        let errMsg = "Failed to save";
        try {
          const err = await res.json();
          errMsg = err.message || err.error || JSON.stringify(err);
        } catch {}
        alert(errMsg);
        return;
      }
    
      const saved = await res.json();
      setShowCategoryModal(false);
      navigate(`/recipe/${saved._id}`);
    };
    
    const handleChooseAlternative = (alt) => {
      if (!swapItem) return;
      setIngredientsList(prev => {
        const next = [...prev];
        const i = swapItem.index;
        const line = next[i];
    
        const re = new RegExp(swapItem.key, "i");
        next[i] = line.replace(re, alt);
    
        return next;
      });
      setSwapItem(null);
    };

    const openCategoryModal = () => {
      setShowCategoryModal(true);
    };

    const closeCategoryModal = () => {
      setShowCategoryModal(false);
    };

    if (loading) return <div className="recipe-display"><p>Loading…</p></div>;
    if (err) return <div className="recipe-display"><p className="error">{err}</p></div>;

    return (
      <div className="new-recipe">
        <button className="back-btn" onClick={() => navigate("/preferences")}>
          ← Back
        </button>
        <header className="page-header">New Recipe</header>
        <header className="subst-note">Click the orange text to make ingredient substitutions!</header>

        <hr className="section-divider" />
        
        <div className="recipe-scroll-area">
          
          <header className="header">Ingredients</header>
          <div className="ingredient-list">
            {/* {ingredientsList.map((item, i) => (
              <p key={i}>{item}</p>
            ))} */}
            <div className="ingredient-list">
              {ingredientsList.map((item, i) => {
                const norm = normalizeIngredientLine(item);
                const matchingKey = Object.keys(substitutionMap).find(key =>
                  norm.includes(key)
                );
                const alts = matchingKey ? substitutionMap[matchingKey] : null;

                const handleClick = () => {
                  if (!alts) return;
                  setSwapItem({ key: matchingKey, alts, index: i, line: item });
                };

                return (
                  <div key={i} className="ingredient-line">
                    {alts ? (
                      <button
                        className="ingredient-btn has-sub"
                        onClick={handleClick}
                      >
                        {item}
                      </button>
                    ) : (
                      <p className="ingredient-text">{item}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
            
          <header className="header">Instructions</header>
          <div className="instruction-list">
            <div className="instruction-list"> 
              {instructionsList.map((item, i) => (
                <p key={i}>{i + 1}. {item}</p> ))}
            </div>
          </div>
          </div>
          
          <Modal show={!!swapItem} onHide={() => setSwapItem(null)} centered scrollable>
            <Modal.Header closeButton className="modal-header">
              <Modal.Title>Swap ingredient</Modal.Title>
            </Modal.Header>

            <Modal.Body className="d-grid gap-2">
              {swapItem?.key && (
                <p className="mb-2">
                  Choose a replacement for <strong>{swapItem.key}</strong>
                </p>
              )}

              {swapItem?.alts?.map((alt, idx) => (
                <Button
                  key={idx}
                  variant="outline-dark"
                  className="w-100 text-start"
                  onClick={() => handleChooseAlternative(alt)}
                >
                  {alt}
                </Button>
              ))}

            </Modal.Body>
          </Modal>


          <div className="bottom-btn-container">
            <Card 
                className="bottom-btn" 
                onClick={openCategoryModal}
                style={{ cursor: "pointer" }}
            >
              <Card.Title className="bottom-btn-title">{"Save"}</Card.Title>
            </Card>

            <Modal show={showCategoryModal} onHide={closeCategoryModal} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Choose a recipe category</Modal.Title>
                </Modal.Header>
                <Modal.Body className="d-grid gap-2">
                  {categories.map((c) => (
                    <Button
                      key={c}
                      variant={category === c ? "dark" : "outline-dark"}
                      className="w-100 text-start"
                      onClick={() => setCategory(c)}
                    >
                      {c}
                    </Button>
                  ))}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={closeCategoryModal}>Cancel</Button>
                    <Button
                      variant="primary"
                      className="use-file"
                      onClick={handleSave}
                      disabled={!category || !(state?.name || title)}
                    >
                      Save
                    </Button>
                </Modal.Footer>
            </Modal>

            <Card 
              className="bottom-btn"
              onClick={() => navigate("/new_recipe")}
              style={{ cursor: "pointer" }}
            >
              <Card.Title className="bottom-btn-title">{"Retry"}</Card.Title>
            </Card>
        </div>
      </div>
    );
  };
  
  export default NewRecipe;