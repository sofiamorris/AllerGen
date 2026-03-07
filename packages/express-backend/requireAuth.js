import jwt from "jsonwebtoken";
import User from "./models/user.js";

export default async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const [type, token] = header.split(" ");

    if (type !== "Bearer" || !token) {
      return res.status(401).json({ error: "Missing auth token" });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.userId).select("_id email name");

    if (!user) return res.status(401).json({ error: "User not found" });

    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid/expired token" });
  }
}
