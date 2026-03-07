import { useState } from 'react'
import './App.css'
import Account from "./Components/Account.jsx";
import MyRecipesList from "./Components/SavedRecipes.jsx";
import NewRecipe from "./Components/NewRecipe.jsx";
import Preferences from "./Components/Preferences.jsx";
import HomeGallery from "./Components/HomeGallery.jsx";
import RecipeDisplay from "./Components/RecipeDisplay.jsx";
import WelcomePage from "./Components/WelcomePage.jsx";
import Layout from "./Components/Layout";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
  Outlet
} from 'react-router-dom';
import SavedRecipes from './Components/SavedRecipes.jsx';

function App() {

  // define page navigation and send appropriate paramaters into function
  return (
    <div className="container">
      <Router>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<WelcomePage />} />
            <Route path="/gallery" element={<HomeGallery />} />
            <Route path="/preferences" element={<Preferences />} />
            <Route path="/account" element={<Account />} />
            <Route path="/my_recipes" element={<SavedRecipes />} />
            <Route path="/new_recipe" element={<NewRecipe />} />
            <Route path="/recipe/:id" element={<RecipeDisplay />} />
          </Route>
        </Routes>
      </Router>
    </div>
  );
}

export default App
