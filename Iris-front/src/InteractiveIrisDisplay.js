import React, { useEffect, useRef, useState } from 'react';
import { Card, Button, ButtonGroup, Form } from 'react-bootstrap';

const InteractiveIrisDisplay = ({ originalImage, initialIrisData, onDataUpdate }) => {
  const canvasRef = useRef(null);
  const [image, setImage] = useState(null);
  const [irisData, setIrisData] = useState(initialIrisData);
  const [selectedCircle, setSelectedCircle] = useState(null); // 'iris' or 'pupil'
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [adjustmentMode, setAdjustmentMode] = useState('position'); // 'position' or 'radius'

  // Load image when component mounts or image changes
  useEffect(() => {
    if (!originalImage) return;

    const img = new Image();
    img.onload = () => {
      setImage(img);
      // Set initial iris data if provided
      if (initialIrisData) {
        setIrisData(initialIrisData);
      }
    };
    img.src = originalImage;
  }, [originalImage, initialIrisData]);

  // Redraw canvas whenever image or iris data changes
  useEffect(() => {
    if (!canvasRef.current || !image || !irisData) return;
    drawCanvas();
  }, [image, irisData, selectedCircle]);

  // Draw the image and circles on canvas
  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Set canvas size to match image
    canvas.width = image.width;
    canvas.height = image.height;
    
    // Clear canvas and draw image
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0);
    
    // Draw pupil circle (green)
    drawCircle(
      ctx, 
      irisData.pupilCenterX, 
      irisData.pupilCenterY, 
      irisData.pupilRadius, 
      selectedCircle === 'pupil' ? 'rgba(0, 255, 0, 1)' : 'rgba(0, 255, 0, 0.6)',
      selectedCircle === 'pupil' ? 3 : 2
    );
    
    // Draw iris circle (red)
    drawCircle(
      ctx, 
      irisData.irisCenterX, 
      irisData.irisCenterY, 
      irisData.irisRadius, 
      selectedCircle === 'iris' ? 'rgba(255, 0, 0, 1)' : 'rgba(255, 0, 0, 0.6)',
      selectedCircle === 'iris' ? 3 : 2
    );

    // Draw center points for selected circle
    if (selectedCircle) {
      const centerX = selectedCircle === 'iris' ? irisData.irisCenterX : irisData.pupilCenterX;
      const centerY = selectedCircle === 'iris' ? irisData.irisCenterY : irisData.pupilCenterY;
      
      // Draw center crosshair
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(centerX - 10, centerY);
      ctx.lineTo(centerX + 10, centerY);
      ctx.moveTo(centerX, centerY - 10);
      ctx.lineTo(centerX, centerY + 10);
      ctx.stroke();
    }
  };

  // Helper function to draw a circle
  const drawCircle = (ctx, x, y, radius, color, lineWidth) => {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  };

  // Get mouse position relative to canvas
  const getMousePos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height)
    };
  };

  // Check if mouse is near a circle (for selection)
  const isNearCircle = (mouseX, mouseY, centerX, centerY, radius) => {
    const distance = Math.sqrt(Math.pow(mouseX - centerX, 2) + Math.pow(mouseY - centerY, 2));
    return Math.abs(distance - radius) < 10; // Within 10 pixels of the circle
  };

  // Handle mouse down
  const handleMouseDown = (e) => {
    const pos = getMousePos(e);
    
    // Check if clicking near iris circle
    if (isNearCircle(pos.x, pos.y, irisData.irisCenterX, irisData.irisCenterY, irisData.irisRadius)) {
      setSelectedCircle('iris');
      setIsDragging(true);
      setDragStart(pos);
    }
    // Check if clicking near pupil circle
    else if (isNearCircle(pos.x, pos.y, irisData.pupilCenterX, irisData.pupilCenterY, irisData.pupilRadius)) {
      setSelectedCircle('pupil');
      setIsDragging(true);
      setDragStart(pos);
    }
  };

  // Handle mouse move
  const handleMouseMove = (e) => {
    if (!isDragging || !selectedCircle) return;

    const pos = getMousePos(e);
    const newData = { ...irisData };

    if (adjustmentMode === 'position') {
      // Move the center of the selected circle
      const deltaX = pos.x - dragStart.x;
      const deltaY = pos.y - dragStart.y;

      if (selectedCircle === 'iris') {
        newData.irisCenterX = Math.round(irisData.irisCenterX + deltaX);
        newData.irisCenterY = Math.round(irisData.irisCenterY + deltaY);
      } else {
        newData.pupilCenterX = Math.round(irisData.pupilCenterX + deltaX);
        newData.pupilCenterY = Math.round(irisData.pupilCenterY + deltaY);
      }
    } else if (adjustmentMode === 'radius') {
      // Adjust the radius based on mouse distance from center
      const centerX = selectedCircle === 'iris' ? irisData.irisCenterX : irisData.pupilCenterX;
      const centerY = selectedCircle === 'iris' ? irisData.irisCenterY : irisData.pupilCenterY;
      const newRadius = Math.round(Math.sqrt(Math.pow(pos.x - centerX, 2) + Math.pow(pos.y - centerY, 2)));

      if (selectedCircle === 'iris') {
        newData.irisRadius = Math.max(newRadius, irisData.pupilRadius + 10); // Iris must be larger than pupil
      } else {
        newData.pupilRadius = Math.min(newRadius, irisData.irisRadius - 10); // Pupil must be smaller than iris
      }
    }

    setIrisData(newData);
    setDragStart(pos);
  };

  // Handle mouse up
  const handleMouseUp = () => {
    if (isDragging && onDataUpdate) {
      onDataUpdate(irisData);
    }
    setIsDragging(false);
  };

  // Handle radius adjustment via input
  const handleRadiusChange = (circle, value) => {
    const newRadius = parseInt(value) || 0;
    const newData = { ...irisData };

    if (circle === 'iris') {
      newData.irisRadius = Math.max(newRadius, irisData.pupilRadius + 10);
    } else {
      newData.pupilRadius = Math.min(newRadius, irisData.irisRadius - 10);
    }

    setIrisData(newData);
    if (onDataUpdate) {
      onDataUpdate(newData);
    }
  };

  // Reset to initial detection
  const handleReset = () => {
    if (initialIrisData) {
      setIrisData(initialIrisData);
      if (onDataUpdate) {
        onDataUpdate(initialIrisData);
      }
    }
  };

  return (
    <Card>
      <Card.Header>
        <div className="d-flex justify-content-between align-items-center">
          <span>Iris Segmentation - Manual Adjustment</span>
          <Button size="sm" variant="outline-secondary" onClick={handleReset}>
            Reset to Auto-Detection
          </Button>
        </div>
      </Card.Header>
      <Card.Body>
        {irisData && (
          <>
            {/* Controls */}
            <div className="mb-3">
              <ButtonGroup className="mb-2 me-2">
                <Button 
                  variant={adjustmentMode === 'position' ? 'primary' : 'outline-primary'}
                  size="sm"
                  onClick={() => setAdjustmentMode('position')}
                >
                  Move Center
                </Button>
                <Button 
                  variant={adjustmentMode === 'radius' ? 'primary' : 'outline-primary'}
                  size="sm"
                  onClick={() => setAdjustmentMode('radius')}
                >
                  Adjust Radius
                </Button>
              </ButtonGroup>

              <ButtonGroup className="mb-2">
                <Button 
                  variant={selectedCircle === 'iris' ? 'danger' : 'outline-danger'}
                  size="sm"
                  onClick={() => setSelectedCircle('iris')}
                >
                  Select Iris
                </Button>
                <Button 
                  variant={selectedCircle === 'pupil' ? 'success' : 'outline-success'}
                  size="sm"
                  onClick={() => setSelectedCircle('pupil')}
                >
                  Select Pupil
                </Button>
              </ButtonGroup>
            </div>

            {/* Canvas */}
            <div className="text-center mb-3" style={{ cursor: isDragging ? 'move' : 'crosshair' }}>
              <canvas 
                ref={canvasRef} 
                style={{ maxWidth: '100%', maxHeight: '400px', border: '1px solid #dee2e6' }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              />
            </div>

            {/* Manual radius inputs */}
            <div className="row">
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label className="text-danger">Iris Radius</Form.Label>
                  <Form.Control 
                    type="number" 
                    value={irisData.irisRadius}
                    onChange={(e) => handleRadiusChange('iris', e.target.value)}
                    min={irisData.pupilRadius + 10}
                  />
                  <Form.Text className="text-muted">
                    Center: ({irisData.irisCenterX}, {irisData.irisCenterY})
                  </Form.Text>
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label className="text-success">Pupil Radius</Form.Label>
                  <Form.Control 
                    type="number" 
                    value={irisData.pupilRadius}
                    onChange={(e) => handleRadiusChange('pupil', e.target.value)}
                    max={irisData.irisRadius - 10}
                  />
                  <Form.Text className="text-muted">
                    Center: ({irisData.pupilCenterX}, {irisData.pupilCenterY})
                  </Form.Text>
                </Form.Group>
              </div>
            </div>

            {/* Instructions */}
            <div className="alert alert-info">
              <strong>Instructions:</strong>
              <ul className="mb-0">
                <li>Select a circle (Iris or Pupil) to adjust</li>
                <li>Choose adjustment mode: Move Center or Adjust Radius</li>
                <li>Click and drag on the canvas to make adjustments</li>
                <li>Or use the number inputs for precise radius control</li>
              </ul>
            </div>
          </>
        )}
        
        {!irisData && (
          <p className="text-center">Process an image to see results and enable manual adjustment</p>
        )}
      </Card.Body>
    </Card>
  );
};

export default InteractiveIrisDisplay;