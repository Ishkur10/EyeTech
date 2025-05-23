import { useState } from 'react';
import { Container, Row, Col, Alert, Tabs, Tab } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';

import ImageUpload from './components/ImageUpload';
import ImageCapture from './components/ImageCapture';
import InteractiveIrisDisplay from './components/InteractiveIrisDisplay';
import { processImage } from './services/irisService';

function App() {
  const [results, setResults] = useState(null);
  const [originalImage, setOriginalImage] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [eyeConfidence, setEyeConfidence] = useState(null);
  const [adjustedResults, setAdjustedResults] = useState(null);

  const handleImage = async (imageData) => {
    setError(null);
    setLoading(true);
    
    try {
      setOriginalImage(imageData.originalImage);
      const response = await processImage(imageData.base64Image);
      
      // Check if it's an error response (not an eye)
      if (response.errorCode === 'NOT_AN_EYE') {
        setError(response.message);
        setResults(null);
        setEyeConfidence(null);
      } else {
        // Valid eye image with iris data
        setResults(response);
        setEyeConfidence(response.eyeConfidence);
        setAdjustedResults(response); // Initially same as auto-detected
      }
    } catch (err) {
      setError(err.message || "An error occurred while processing the image");
      setResults(null);
      setEyeConfidence(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDataUpdate = (updatedData) => {
    setAdjustedResults(updatedData);
  };

  const handleError = (message) => {
    setError(message);
  };

  return (
    <Container className="mt-4 mb-4">
      <div className="text-center mb-4">
        <h1>Iris Segmentation Application</h1>
        <p className="lead">Upload or capture an eye image to analyze iris and pupil</p>
      </div>

      {error && (
        <Alert variant="danger" onClose={() => setError(null)} dismissible>
          <Alert.Heading>
            {error.includes("not appear to contain an eye") ? "⚠️ Invalid Image" : "Error"}
          </Alert.Heading>
          <p>{error}</p>
          {error.includes("not appear to contain an eye") && (
            <><hr /><p className="mb-0">
              Please upload a clear image of an eye. The image should show:
              <ul className="mt-2">
                <li>A visible iris (colored part of the eye)</li>
                <li>A visible pupil (dark center)</li>
                <li>Good lighting and focus</li>
                <li>The eye should be open and clearly visible</li>
              </ul>
            </p></>
          )}
        </Alert>
      )}

      {eyeConfidence !== null && (
        <Alert variant={eyeConfidence > 0.7 ? "success" : "warning"}>
          <strong>Eye Detection Confidence:</strong> {(eyeConfidence * 100).toFixed(1)}%
          {eyeConfidence < 0.7 && " - Low confidence, results may be less accurate"}
        </Alert>
      )}

      <Row>
        <Col md={5}>
          <Tabs defaultActiveKey="upload" className="mb-3">
            <Tab eventKey="upload" title="Upload Image">
              <ImageUpload 
                onImageProcessed={handleImage} 
                onError={handleError} 
              />
            </Tab>
            <Tab eventKey="capture" title="Capture Image">
              <ImageCapture
                onImageCaptured={handleImage} 
                onError={handleError} 
              />
            </Tab>
          </Tabs>
        </Col>
        <Col md={7}>
          <InteractiveIrisDisplay 
            originalImage={originalImage} 
            initialIrisData={results}
            onDataUpdate={handleDataUpdate}
          />
          
          {adjustedResults && results && (
            <div className="mt-3">
              <h5>Adjustment Summary:</h5>
              <Row>
                <Col md={6}>
                  <h6 className="text-danger">Iris Changes:</h6>
                  <ul>
                    <li>Center moved: {Math.abs(adjustedResults.irisCenterX - results.irisCenterX) + 
                                      Math.abs(adjustedResults.irisCenterY - results.irisCenterY)} pixels</li>
                    <li>Radius changed: {adjustedResults.irisRadius - results.irisRadius} pixels</li>
                  </ul>
                </Col>
                <Col md={6}>
                  <h6 className="text-success">Pupil Changes:</h6>
                  <ul>
                    <li>Center moved: {Math.abs(adjustedResults.pupilCenterX - results.pupilCenterX) + 
                                      Math.abs(adjustedResults.pupilCenterY - results.pupilCenterY)} pixels</li>
                    <li>Radius changed: {adjustedResults.pupilRadius - results.pupilRadius} pixels</li>
                  </ul>
                </Col>
              </Row>
            </div>
          )}
        </Col>
      </Row>

      {loading && (
        <div className="loading-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999
        }}>
          <div className="text-center text-white">
            <div className="spinner-border text-light mb-3" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p>Processing image, please wait...</p>
          </div>
        </div>
      )}
    </Container>
  );
}

export default App;