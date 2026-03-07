import { useState } from "react";
import "../Styles/Comments.scss";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5432";

function StarPicker({ value, onChange, disabled }) {
  return (
    <div className="star-picker" aria-label="Star rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={`star ${n <= value ? "filled" : ""}`}
          onClick={() => !disabled && onChange(n)}
          disabled={disabled}
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
        >
          {n <= value ? "★" : "☆"}
        </button>
      ))}
      <span className="star-label">{value ? `${value}/5` : "No rating"}</span>
    </div>
  );
}

export default function CommentForm({ recipeId, onPosted }) {
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [rating, setRating] = useState(0); // 0 = not set (or change default to 5)
  const [posting, setPosting] = useState(false);

  const userEmail = (localStorage.getItem("userEmail") || "").trim().toLowerCase();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return alert("Comment cannot be empty");
    // If you want rating required, uncomment:
    // if (!rating) return alert("Please select a rating");

    try {
      setPosting(true);

      const res = await fetch(`${API_BASE}/api/recipes/${recipeId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(userEmail ? { "x-user-email": userEmail } : {}),
        },
        body: JSON.stringify({
          text,
          rating: rating || null,          // store null if not set
          authorName: name || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || `Failed (${res.status})`);
      }

      const created = await res.json();

      onPosted?.(created);
      setText("");
      setName("");
      setRating(0);
    } catch (err) {
      alert(err.message || "Post failed");
    } finally {
      setPosting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="comment-form">
      <div>
        <input
          placeholder="Display name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={posting}
        />
      </div>

      <div>
        <label className="comment-form-label">Rating (optional)</label>
        <StarPicker value={rating} onChange={setRating} disabled={posting} />
      </div>

      <div>
        <textarea
          rows={3}
          placeholder="Write a helpful comment — tips, changes you made, amount adjustments…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={posting}
        />
      </div>

      <div>
        <button type="submit" disabled={posting}>
          {posting ? "Posting…" : "Post comment"}
        </button>
      </div>
    </form>
  );
}