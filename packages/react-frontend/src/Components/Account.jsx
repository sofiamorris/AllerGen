import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import "../Styles/Account.scss";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5432";

const Account = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [savedEmail, setSavedEmail] = useState("");

  // published recipes state
  const [publishedMine, setPublishedMine] = useState([]);
  const [loadingMine, setLoadingMine] = useState(false);
  const [mineErr, setMineErr] = useState("");

  useEffect(() => {
    const stored = (localStorage.getItem("userEmail") || "").trim().toLowerCase();
    setSavedEmail(stored);
  }, []);

  // load "my published recipes" whenever savedEmail changes
  useEffect(() => {
    if (!savedEmail) {
      setPublishedMine([]);
      return;
    }

    const controller = new AbortController();

    (async () => {
      try {
        setLoadingMine(true);
        setMineErr("");

        const res = await fetch(`${API_BASE}/api/recipes/mine`, {
          signal: controller.signal,
          headers: { "x-user-email": savedEmail },
        });

        if (!res.ok) throw new Error(`Failed to load your recipes (${res.status})`);

        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.recipes || []);

        setPublishedMine(list.filter((r) => r?.published === true));
      } catch (e) {
        if (e.name !== "AbortError") setMineErr(e.message || "Failed to load recipes");
      } finally {
        setLoadingMine(false);
      }
    })();

    return () => controller.abort();
  }, [savedEmail]);

  const handleSaveEmail = () => {
    if (!email.trim()) {
      alert("Please enter a valid email.");
      return;
    }

    const normalized = email.trim().toLowerCase();
    localStorage.setItem("userEmail", normalized);
    setSavedEmail(normalized);
    setEmail("");
    alert("Email saved!");
  };

  const handleLogout = () => {
    localStorage.removeItem("userEmail");
    setSavedEmail("");
    setPublishedMine([]);
    alert("Logged out.");
  };

  return (
    <div className="account">
      <header className="account-header">
        My Account
        <div className="circle">
          <span className="initials">SM</span>
        </div>
        <header className="name">
          {savedEmail ? `Hi, ${savedEmail}!` : "Hi!"}
        </header>
      </header>

      <div className="account-body">
        <div className="email-section">
          <label className="set-email">Set Your Email</label>

          <input
            type="email"
            value={email}
            placeholder="Enter your email"
            onChange={(e) => setEmail(e.target.value)}
            className="email-input"
          />

          <button className="save-email-btn" onClick={handleSaveEmail}>
            Save Email
          </button>

          {savedEmail && (
            <button className="logout-btn" onClick={handleLogout}>
              Log Out
            </button>
          )}
        </div>

         {/* My Published Recipes */}
        <div className="published-recipes-section">
          <label className="section-title">My Published Recipes</label>

          {!savedEmail && <p className="muted">Set your email to see your published recipes.</p>}

          {savedEmail && loadingMine && <p>Loading…</p>}
          {savedEmail && mineErr && <p className="error">{mineErr}</p>}

          {savedEmail && !loadingMine && !mineErr && (
            publishedMine.length ? (
              <ul className="published-recipes-list">
                {publishedMine.map((r) => (
                  <li key={r._id} className="published-recipe-item">
                    <button
                      type="button"
                      className="published-recipe-link"
                      onClick={() => navigate(`/recipe/${r._id}`)}
                    >
                      {r.name || "Untitled recipe"}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">No published recipes yet.</p>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default Account;