import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import "../Styles/RecipeDisplay.scss";
import CommentList from "../Components/CommentList";
import CommentForm from "../Components/CommentForm";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5432";

const RecipeDisplay = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [commentsReloadToken, setCommentsReloadToken] = useState(0);
  const [comments, setComments] = useState([]);
  const [liked, setLiked] = useState(false);

  const userEmail = (localStorage.getItem("userEmail") || "").trim().toLowerCase();

  const ownerEmail = (recipe?.ownerEmail || recipe?.createdByEmail || "").trim().toLowerCase();
  const canEdit = Boolean(userEmail) && Boolean(ownerEmail) && userEmail === ownerEmail;

  const isMine = canEdit;
  const canLike = !!userEmail && !isMine && !!recipe?.published;

  useEffect(() => {
    if (!recipe) return;
    if (!canLike) return;
    const load = async () => {
      const res = await fetch(`${API_BASE}/api/recipes/${id}/like-state`, {
        headers: { "x-user-email": userEmail },
      });
      if (res.ok) {
        const json = await res.json();
        setLiked(!!json.liked);
      }
    };
    load();
  }, [recipe, id, userEmail, canLike]);

  useEffect(() => {
    const fetchComments = async () => {
      const res = await fetch(`${API_BASE}/api/recipes/${id}/comments`);
      const json = await res.json();
      setComments(json.comments || []);
    };
  
    fetchComments();
  }, [id, commentsReloadToken]);

  const rated = comments.filter(
    (c) => c.rating != null && Number.isFinite(Number(c.rating))
  );
  
  const avg = rated.length
    ? rated.reduce((s, c) => s + Number(c.rating), 0) / rated.length
    : null;
  
  function StarsAvg({ avg }) {
    if (avg == null) return null;
  
    const r = Math.max(0, Math.min(5, Math.round(Number(avg))));
    return (
      <span className="stars" aria-label={`Average ${r} out of 5`}>
        {"★".repeat(r)}
        {"☆".repeat(5 - r)}
      </span>
    );
  }

  async function toggleLike() {
    if (!canLike) return;
  
    const method = liked ? "DELETE" : "POST";
    const res = await fetch(`${API_BASE}/api/recipes/${id}/like`, {
      method,
      headers: { "x-user-email": userEmail },
    });
  
    if (!res.ok) {
      let msg = `Like failed (${res.status})`;
      try {
        const e = await res.json();
        msg = e.error || e.message || msg;
      } catch {}
      alert(msg);
      return;
    }
  
    const json = await res.json();
    setLiked(!!json.liked);
  }

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setErr("");

        const res = await fetch(`${API_BASE}/api/recipes/${id}`, {
          headers: { "x-user-email": userEmail }
        });

        if (!res.ok) {
          let msg = `Failed to load recipe`;
          try {
            const e = await res.json();
            msg = e.message || e.error || msg;
          } catch {}
          throw new Error(msg);
        }
        const data = await res.json();
        setRecipe(data);
      } catch (e) {
        if (e.name !== "AbortError") setErr(e.message || String(e));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  async function handleDeleteComment(commentId) {
    if (!commentId) return;
  
    const ok = window.confirm("Delete this comment?");
    if (!ok) return;
  
    try {
      const res = await fetch(`${API_BASE}/api/comments/${commentId}`, {
        method: "DELETE",
        headers: {
          ...(userEmail ? { "x-user-email": userEmail } : {}),
        },
      });
  
      if (!res.ok) {
        let msg = "Failed to delete comment";
        try {
          const e = await res.json();
          msg = e.error || e.message || msg;
        } catch {}
        throw new Error(msg);
      }

      setComments((prev) => prev.filter((c) => c._id !== commentId));
  
    } catch (e) {
      alert(e.message || "Delete failed");
    }
  }
  
  const togglePublish = async () => {
    if (!recipe) return;
  
    const nextPublished = !recipe.published;
  
    try {
      
      // send the update
      const res = await fetch(`${API_BASE}/api/recipes/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": userEmail,
        },
        body: JSON.stringify({ published: nextPublished }),
      });
  
      if (!res.ok) {
        let msg = "Failed to update publish state";
        try {
          const e = await res.json();
          msg = e.message || e.error || msg;
        } catch {}
        throw new Error(msg);
      }
  
      // read the updated recipe from the server
      const updated = await res.json();
      setRecipe(updated);
  
    } catch (e) {
      // show error and keep UI consistent
      alert(e.message || "Update failed");
    }
  };
  

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
  
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file.");
      return;
    }
  
    const formData = new FormData();
    formData.append("image", file);
  
    try {
      setUploading(true);

      const res = await fetch(`${API_BASE}/api/recipes/${id}/image`, {
        method: "PATCH",
        headers: {
          "x-user-email": userEmail,
        },
        body: formData,
      });
  
      if (!res.ok) {
        let msg = "Failed to upload image";
        try {
          const e = await res.json();
          msg = e.message || e.error || msg;
        } catch {}
        throw new Error(msg);
      }
  
      const updated = await res.json();
      setRecipe(updated); // re-render with new image
    } catch (err) {
      alert(err.message || "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = ""; // reset input
    }
  };

  if (loading) return <div className="recipe-display"><p>Loading…</p></div>;
  if (err) return <div className="recipe-display"><p className="error">{err}</p></div>;
  if (!recipe) return <div className="recipe-display"><p>Not found.</p></div>;

  return (
    <div className="recipe-display">
        <header
          className="recipe-header"
          style={{ "--header-bg": recipe.image ? `url(${recipe.image})` : "none" }}
        >
          {/* Overlay controls */}
          <div className="header-overlay">

            <div className="top-row">
              <button
                className="back-button"
                onClick={() => {
                  if (window.history.length > 1) navigate(-1);
                  else navigate("/");
                }}
              >
                ← Back
              </button>
            </div>

            <h1 className="recipe-title">
              {recipe.name}
            </h1>

            {canEdit && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleImageSelect}
                />

                <button
                  className="upload-img-btn"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? "Uploading…" : "Upload Photo"}
                </button>
              </>
            )}
          </div>
        </header>

        {isMine ? (
          <div className="publish-row">
            <StarsAvg avg={avg}/>
            <button
              className={`publish-btn ${recipe.published ? "selected" : ""}`}
              type="button"
              onClick={togglePublish}
            >
              {recipe.published ? "Unpublish" : "Publish"}
            </button>
          </div>
        ) : canLike ? (
          <div className="publish-row">
                  <StarsAvg avg={avg}/>
            <button
              className={`publish-btn ${liked ? "selected" : ""}`}
              type="button"
              onClick={toggleLike}
            >
              {liked ? "♥ Liked" : "♡ Like"}
            </button>
          </div>
        ) : null}

      <div className="recipe-scroll-area">

        <section>
          <header className="header-2">Ingredients</header>
          <div className="content-box">
            {recipe.ingredients?.length
              ? recipe.ingredients.map((it, i) => <p key={i}>• {it}</p>)
              : <p className="muted">No ingredients</p>}
          </div>
        </section>

        <section>
          <header className="header-2">Instructions</header>
          <div className="content-box">
            {recipe.instructions?.length
              ? recipe.instructions.map((it, i) => <p key={i}>{i + 1}. {it}</p>)
              : <p className="muted">No instructions</p>}
          </div>
        </section>

        <section style={{ marginTop: 24 }}>
          <header className="header-2">Comments</header>

          <CommentForm recipeId={id} onPosted={() => {
            setCommentsReloadToken(t => t + 1);
          }} />

          <CommentList
            key={commentsReloadToken}
            recipeId={id}
            onDeleted={() => setCommentsReloadToken((t) => t + 1)}
          />
        </section>

      </div>
    </div>
  );
};

export default RecipeDisplay;
