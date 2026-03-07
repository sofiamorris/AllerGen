import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import SlidingPane from "react-sliding-pane";
import "react-sliding-pane/dist/react-sliding-pane.css";
import Card from "react-bootstrap/Card";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import CameraCapture from "./CameraCapture";
import "../Styles/Preferences.scss";


const Preferences = () => {
    const navigate = useNavigate();
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [pickRecipe, setPickRecipe] = useState(false);
    const [pickDietPref, setPickDietPref] = useState(false);
    const [selectedDiet, setSelectedDiet] = useState(new Set());
    const [selectedFile, setSelectedFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [notes, setNotes] = useState("");
    const [showScanner, setShowScanner] = useState(false);

    const diet_prefs = [
        "Vegan",
        "Vegetarian",
        "Pescatarian",
        "Keto",
        "Halal",
        "Kosher",
        "Gluten-Free",
        "Dairy-Free",
        "Nut-free",
        "Low-carb",
        "Low-sodium",
    ];
    
    const toggleDiet = (pref) => {
        setSelectedDiet((prev) => {
          const updated = new Set(prev);
          updated.has(pref) ? updated.delete(pref) : updated.add(pref);
          return updated;
        });
      };
    
    const handleScanClick = () => {
        cameraInputRef.current?.click();
      };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        setSelectedFile(file || null);
        console.log(file)
        if (file && file.type.startsWith("image/")) {
          setImagePreview(URL.createObjectURL(file));
        } else {
          setImagePreview(null);
        }
      };

    useEffect(() => () => imagePreview && URL.revokeObjectURL(imagePreview), [imagePreview]);

    const openUploadModal = () => {
        setPickRecipe(false);
        setShowUploadModal(true);
      };


    const closeUploadModal = () => {
        setShowUploadModal(false);
    };

    const handleUseThisFile = () => {
        setShowUploadModal(false);
      };
    
    return (
      <div className="preferences">
        <button className="back-btn" onClick={() => navigate("/gallery")}>
            ← Back
        </button>

        <div className="preference-row">
            <h1 className ="start_here">Start by uploading a recipe!</h1>
            <Card 
                className="outer-card" 
                onClick={() => setPickRecipe(true)} 
                style={{ cursor: "pointer" }}
            >
                <Card.Title className="card-title">{"+ Add A Recipe."}</Card.Title>
            </Card>

            <div className="selected-recipe-slot">
            {selectedFile ? (
                <div className="selected-recipe">Selected: {selectedFile.name}</div>
            ) : (
                <div className="selected-recipe placeholder" />
            )}
            </div>

            <Modal show={pickRecipe} onHide={() => setPickRecipe(false)} centered scrollable>
                <Modal.Header closeButton className="modal-header">
                    <Modal.Title>Search for a recipe</Modal.Title>
                </Modal.Header>
                <Modal.Body className="d-grid gap-2">
                    <Button className="pick-recipe-button" onClick={openUploadModal}>
                    Upload Existing Recipe
                    </Button>
                    {/* <Button className="pick-recipe-button">Browse for Recipe</Button> */}
                    <Button className="pick-recipe-button" onClick={() => setShowScanner(true)}>
                    Scan a Recipe
                    </Button>
                </Modal.Body>
            </Modal>

            <Modal show={showScanner} onHide={() => setShowScanner(false)} centered>
                <Modal.Header closeButton><Modal.Title>Scan Recipe</Modal.Title></Modal.Header>
                <Modal.Body>
                    <CameraCapture className="camera-capture"
                    onCapture={({ file, previewUrl }) => {
                        setSelectedFile(file);
                        setImagePreview(previewUrl);
                        setShowScanner(false);
                        setPickRecipe(false);
                        setShowUploadModal(false);
                    }}
                    onClose={() => setShowScanner(false)}
                    />
                </Modal.Body>
            </Modal>

            <Modal show={showUploadModal} onHide={closeUploadModal} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Upload existing recipe</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form.Group controlId="recipeFile">
                    <Form.Label>Select an image or PDF</Form.Label>
                    <Form.Control
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleFileChange}
                    />
                    </Form.Group>

                    {selectedFile && (
                    <div className="mt-3">
                        <div><strong>Selected:</strong> {selectedFile.name}</div>
                        {imagePreview && (
                        <img
                            src={imagePreview}
                            alt="Recipe preview"
                            style={{ maxWidth: "100%", border: "1px solid #ddd", borderRadius: 8, marginTop: 8 }}
                        />
                        )}
                    </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={closeUploadModal}>Cancel</Button>
                    <Button variant="primary" className="use-file" onClick={handleUseThisFile} disabled={!selectedFile}>
                    Use this file
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>

        <div className="preference-row">
            <label className="preference-label"> Dietary Preferences </label>
            <Card 
                className="inner-card" 
                onClick={() => setPickDietPref(true)} 
                style={{ cursor: "pointer" }}
            >
                <Card.Title className="select-card-title">{"Select"}</Card.Title>
            </Card>

            <div className="selected-pref-icons">
                {Array.from(selectedDiet).map(pref => (
                    <div key={pref} className="pref-icon">{pref}</div>
                ))}
            </div>

            <SlidingPane
                isOpen={pickDietPref}
                from="bottom"
                width="100vw"
                className="sheet sheet--diet"
                overlayClassName="sheet-overlay"
                onRequestClose={() => setPickDietPref(false)}
                title="Choose your dietary preferences."
            >
                <div className="sheet-body">
                    {diet_prefs.map((pref) => (
                    <Button
                        key={pref}
                        className={`pick-diet-button ${selectedDiet.has(pref) ? "selected" : ""}`}
                        onClick={() => toggleDiet(pref)}
                    >
                        {pref}
                    </Button>
                    ))}
                </div>
            </SlidingPane>
        </div>

        <div className="text-input-slot">
            <h1 className="input_title">Additional suggestions for the new recipe:</h1>
            <Form.Control
                as="textarea"
                rows={5}
                className="text-input"
                placeholder="Extra notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
            />
        </div>

        <div className="preference-row">
            <Card 
                className="outer-card"
                onClick={() => {selectedFile && 
                    navigate("/new_recipe", {
                        state: {
                        notes,
                        diet: Array.from(selectedDiet),
                        selectedFile: selectedFile,
                        },
                    })
                }}
                style={{ cursor: "pointer" }}
                >
                    <Card.Title className="card-title">{"Create Recipe."}</Card.Title>
                </Card>         
        </div>
      </div>
    );
  };
  
  export default Preferences;