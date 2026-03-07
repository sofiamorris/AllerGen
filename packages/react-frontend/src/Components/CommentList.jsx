import { useEffect, useState } from "react";
import "../Styles/Comments.scss";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5432";

const userEmail = (localStorage.getItem("userEmail") || "").trim().toLowerCase();

function Stars({ rating }) {
  if (rating === null || rating === undefined) return null;

  const n = Number(rating);
  if (!Number.isFinite(n) || n < 1) return null;

  const r = Math.max(1, Math.min(5, Math.round(n)));
  return (
    <span className="stars-comments" aria-label={`${r} out of 5`}>
      {"★".repeat(r)}
      {"☆".repeat(5 - r)}
    </span>
  );
}

function formatCommentTime(dateString) {
    const date = new Date(dateString);
  
    return date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

function getDisplayName(comment) {
  if (comment.authorName && comment.authorName.trim()) {
    return comment.authorName;
  }

  if (comment.authorEmail) {
    // remove @domain and clean up
    const namePart = comment.authorEmail.split("@")[0];
    return namePart.replace(/[._]/g, " ");
  }

  return "Anonymous";
}

export default function CommentList({ recipeId, onDeleted }) {
  const [comments, setComments] = useState([]);

  useEffect(() => {
    const fetchComments = async () => {
      const res = await fetch(`${API_BASE}/api/recipes/${recipeId}/comments`);
      const json = await res.json();
      setComments(json.comments || []);
    };

    fetchComments();
  }, [recipeId]);

  async function handleDeleteComment(commentId) {
    const ok = window.confirm("Delete this comment?");
    if (!ok) return;

    const res = await fetch(`${API_BASE}/api/comments/${commentId}`, {
      method: "DELETE",
      headers: { ...(userEmail ? { "x-user-email": userEmail } : {}) },
    });

    if (!res.ok) {
      let msg = "Failed to delete comment";
      try {
        const e = await res.json();
        msg = e.error || e.message || msg;
      } catch {}
      alert(msg);
      return;
    }

    // Update UI immediately
    setComments((prev) => prev.filter((c) => c._id !== commentId));
    onDeleted?.();
  }

  return (
    <div className="comments">
      {comments.length === 0 ? (
        <p className="muted">Be the first to comment!</p>
      ) : (
        comments.map((c) => {
          const authorEmail = (c.authorEmail || "").trim().toLowerCase();
          const canDelete = !!userEmail && !!authorEmail && userEmail === authorEmail;

          return (
            <div key={c._id} className="comment">
              <div className="comment-meta">
                <span className="comment-user">{getDisplayName(c)}</span>
                <span className="comment-date">{formatCommentTime(c.createdAt)}</span>

                {canDelete && (
                  <button
                    className="comment-delete-btn"
                    onClick={() => handleDeleteComment(c._id)}
                    type="button"
                  >
                    Delete
                  </button>
                )}
              </div>

              <Stars rating={c.rating} />
              <div className="comment-text">{c.text}</div>
            </div>
          );
        })
      )}
    </div>
  );
}