import React, { useEffect, useRef } from 'react';
import { Card } from 'react-bootstrap';

const IrisDisplay = ({ originalImage, irisData }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !originalImage || !irisData) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Load the image
    const img = new Image();
    img.onload = () => {
      // Set canvas dimensions to match image
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Draw the original image
      ctx.drawImage(img, 0, 0);
      
      // Draw pupil circle (green)
      drawCircle(
        ctx, 
        irisData.pupilCenterX, 
        irisData.pupilCenterY, 
        irisData.pupilRadius, 
        'rgba(0, 255, 0, 0.8)'
      );
      
      // Draw iris circle (red)
      drawCircle(
        ctx, 
        irisData.irisCenterX, 
        irisData.irisCenterY, 
        irisData.irisRadius, 
        'rgba(255, 0, 0, 0.8)'
      );
    };
    
    img.src = originalImage;
  }, [canvasRef, originalImage, irisData]);

  const drawCircle = (ctx, x, y, radius, color) => {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  return (
    <Card>
      <Card.Header>Iris Segmentation Results</Card.Header>
      <Card.Body className="text-center">
        {irisData ? (
          <>
            <canvas ref={canvasRef} style={{ maxWidth: '100%', maxHeight: '400px' }} />
            <div className="mt-3 text-start">
              <h5>Analysis Data:</h5>
              <p><strong>Pupil:</strong> Center at ({irisData.pupilCenterX}, {irisData.pupilCenterY}), Radius: {irisData.pupilRadius}</p>
              <p><strong>Iris:</strong> Center at ({irisData.irisCenterX}, {irisData.irisCenterY}), Radius: {irisData.irisRadius}</p>
            </div>
          </>
        ) : (
          <p>Process an image to see results here</p>
        )}
      </Card.Body>
    </Card>
  );
};

export default IrisDisplay;