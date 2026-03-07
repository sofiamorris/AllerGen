import React, { useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";

const CameraCapture = ({ onCapture, onClose }) => {
  const webcamRef = useRef(null);
  const [stream, setStream] = useState(null);

  const videoConstraints = {
    facingMode: { ideal: "environment" },
    width: { ideal: 1280 },
    height: { ideal: 720 },
    aspectRatio: 16/9,
  };

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, [stream]);

  const handleUserMedia = (mediaStream) => setStream(mediaStream);

  const capture = async () => {
    const imageSrc = webcamRef.current.getScreenshot(); // dataURL (base64)
    if (!imageSrc) return;

    // Convert dataURL -> File so you can reuse your existing state
    const file = await dataUrlToFile(imageSrc, "scan.jpg", "image/jpeg");
    onCapture({ file, previewUrl: URL.createObjectURL(file) });
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <Webcam
        ref={webcamRef}
        audio={false}
        screenshotFormat="image/jpeg"
        imageSmoothing
        videoConstraints={videoConstraints}
        onUserMedia={handleUserMedia}
        style={{ width: "100%", borderRadius: 12 }}
      />
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onClose}>Cancel</button>
        <button onClick={capture}>Capture</button>
      </div>
    </div>
  );
};

async function dataUrlToFile(dataUrl, filename, type) {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], filename, { type: type || blob.type });
}

export default CameraCapture;
