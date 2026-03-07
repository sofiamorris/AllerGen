import { NavLink } from "react-router-dom";
import { HouseFill, HeartFill, PersonCircle } from "react-bootstrap-icons";
import "../Styles/NavBar.scss";

const NavBar = () => {
  return (
    <nav className="navbar-bottom">
      <NavLink to="/gallery" className="nav-item">
        <HouseFill size={24} />
        <span>Home</span>
      </NavLink>

      <NavLink to="/my_recipes" className="nav-item">
        <HeartFill size={24} />
        <span>Saved</span>
      </NavLink>

      <NavLink to="/account" className="nav-item">
        <PersonCircle size={24} />
        <span>Account</span>
      </NavLink>
    </nav>
  );
};

export default NavBar;