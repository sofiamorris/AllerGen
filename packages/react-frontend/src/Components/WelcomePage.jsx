import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import "../Styles/WelcomePage.scss";
import logo from "../assets/logo.png";

const WelcomePage = () => {
    const navigate = useNavigate();
  
    useEffect(() => {
        const timer = setTimeout(() => {
          navigate("/login"); // direct to preferences after 3 seconds
        }, 3000);
    
        // cleanup if user leaves early
        return () => clearTimeout(timer);
      }, [navigate]);

    return (
        <div className="welcome-page">
            <img src={logo} className="welcome-logo" alt="Logo" />
        </div>
    );
  };
  
  export default WelcomePage;