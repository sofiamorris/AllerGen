import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import "../Styles/WelcomePage.scss";
import logo from "../Assets/logo.png";

const WelcomePage = () => {
    const navigate = useNavigate();
  
    useEffect(() => {
        const timer = setTimeout(() => {
          navigate("/gallery"); // direct to preferences after 3 seconds
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