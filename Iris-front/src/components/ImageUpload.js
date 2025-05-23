import React, { useState } from 'react';
import { Button, Form, Card, Alert } from 'react-bootstrap';

const ImageUpload = ({ onImageProcessed, onError }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      
      // Create a preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedFile) return;

    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64data = reader.result;
          onImageProcessed({
            base64Image: base64data,
            originalImage: preview
          });
        } catch (error) {
          onError(error.message || "An error occurred while processing the image");
        } finally {
          setLoading(false);
        }
      };
      reader.readAsDataURL(selectedFile);
    } catch (error) {
      onError(error.message || "An error occurred while reading the file");
      setLoading(false);
    }
  };

  return (
    <Card className="mb-4">
      <Card.Header>Upload Image</Card.Header>
      <Card.Body>
        <Form onSubmit={handleSubmit}>
          <Form.Group controlId="formFile" className="mb-3">
            <Form.Label>Select an eye image</Form.Label>
            <Form.Control 
              type="file" 
              accept="image/*" 
              onChange={handleFileChange} 
              disabled={loading}
            />
          </Form.Group>
          
          {preview && (
            <div className="text-center mb-3">
              <img 
                src={preview} 
                alt="Preview" 
                style={{ maxHeight: '200px', maxWidth: '100%' }} 
                className="img-thumbnail"
              />
            </div>
          )}
          
          <Button 
            variant="primary" 
            type="submit" 
            disabled={!selectedFile || loading}
            className="w-100"
          >
            {loading ? 'Processing...' : 'Process Image'}
          </Button>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default ImageUpload;