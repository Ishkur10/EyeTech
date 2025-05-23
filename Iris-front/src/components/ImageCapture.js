import React, { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Button, Card, Row, Col } from 'react-bootstrap';

const ImageCapture = ({ onImageCaptured, onError }) => {
  const webcamRef = useRef(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const activateCamera = () => {
    setIsCameraActive(true);
  };

  const captureImage = useCallback(() => {
    try {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        onImageCaptured({
          base64Image: imageSrc,
          originalImage: imageSrc
        });
        setIsCameraActive(false);
      } else {
        onError("Failed to capture image");
      }
    } catch (error) {
      onError(error.message || "An error occurred while capturing the image");
    }
  }, [webcamRef, onImageCaptured, onError]);

  return (
    <Card className="mb-4">
      <Card.Header>Capture Image</Card.Header>
      <Card.Body>
        {!isCameraActive ? (
          <Button 
            variant="outline-primary" 
            onClick={activateCamera}
            className="w-100"
          >
            Activate Camera
          </Button>
        ) : (
          <>
            <div className="text-center mb-3">
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={{
                  width: 640,
                  height: 480,
                  facingMode: "user"
                }}
                style={{ width: '100%', maxHeight: '300px' }}
              />
            </div>
            <Row>
              <Col>
                <Button 
                  variant="success" 
                  onClick={captureImage}
                  className="w-100"
                >
                  Capture Photo
                </Button>
              </Col>
              <Col>
                <Button 
                  variant="danger" 
                  onClick={() => setIsCameraActive(false)}
                  className="w-100"
                >
                  Cancel
                </Button>
              </Col>
            </Row>
          </>
        )}
      </Card.Body>
    </Card>
  );
};

export default ImageCapture;