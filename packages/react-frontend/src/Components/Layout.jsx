import { Outlet } from "react-router-dom";
import NavBar from "./NavBar";

export default function Layout() {
  return (
    <div className="app-container">
      <div className="content" style={{ paddingBottom: 85 }}>
        <Outlet />
      </div>
      <NavBar />
    </div>
  );
}
