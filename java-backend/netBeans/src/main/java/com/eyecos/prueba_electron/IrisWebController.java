package com.eyecos.prueba_electron;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.web.multipart.MultipartFile;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Base64;
import javax.imageio.ImageIO;

import com.eyecos.prueba_electron.IrisSegmentation.IrisData;
import com.eyecos.prueba_electron.EyeDetector.EyeDetectionResult;

@SpringBootApplication
@RestController
@RequestMapping("/api")
public class IrisWebController {

    public static void main(String[] args) {
        SpringApplication.run(IrisWebController.class, args);
        System.out.println("Iris Segmentation Web Server started on http://localhost:8080");
    }

    @GetMapping("/health")
    public ResponseEntity<String> healthCheck() {
        return ResponseEntity.ok("Iris Segmentation Server is running!");
    }

    @PostMapping("/process-base64")
    public ResponseEntity<?> processImageFromBase64(@RequestBody ImageRequest request) {
        try {
            System.out.println("Received base64 image processing request");
            
            String base64Data = request.getImageData();
            if (base64Data == null || base64Data.trim().isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(new ErrorResponse("MISSING_DATA", "Image data is required"));
            }

            // Remove the data URL prefix if present
            if (base64Data.startsWith("data:image")) {
                String[] parts = base64Data.split(",");
                if (parts.length > 1) {
                    base64Data = parts[1];
                } else {
                    return ResponseEntity.badRequest()
                        .body(new ErrorResponse("INVALID_FORMAT", "Invalid base64 image format"));
                }
            }

            // Convert base64 string to BufferedImage
            BufferedImage image = decodeBase64Image(base64Data);
            if (image == null) {
                return ResponseEntity.badRequest()
                    .body(new ErrorResponse("DECODE_FAILED", "Failed to decode image from base64 data"));
            }

            System.out.println("Processing image with dimensions: " + image.getWidth() + "x" + image.getHeight());
            
            // Perform eye detection first
            System.out.println("Performing eye detection...");
            EyeDetectionResult eyeDetection = EyeDetector.detectEye(image);
            
            if (!eyeDetection.isEye) {
                System.out.println("Image rejected - not detected as eye: " + eyeDetection.reason);
                return ResponseEntity.ok(new ErrorResponse("NOT_AN_EYE", 
                    "Image does not appear to contain an eye. " + eyeDetection.reason));
            }
            
            System.out.println("Eye detected with confidence: " + eyeDetection.confidence);
            
            // Process the image using iris segmentation
            IrisData irisData = IrisSegmentation.segmentIris(image);
            
            System.out.println("Processing completed successfully");
            System.out.println("Pupil: center(" + irisData.pupilCenterX + "," + irisData.pupilCenterY + 
                             ") radius=" + irisData.pupilRadius);
            System.out.println("Iris: center(" + irisData.irisCenterX + "," + irisData.irisCenterY + 
                             ") radius=" + irisData.irisRadius);

            // Create response with iris data and confidence
            IrisResponseWithConfidence response = new IrisResponseWithConfidence(irisData, eyeDetection.confidence);
            
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            System.err.println("Error processing image: " + e.getMessage());
            e.printStackTrace();
            
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("PROCESSING_ERROR", "Error processing image: " + e.getMessage()));
        }
    }

    @PostMapping("/process-file")
    public ResponseEntity<?> processImageFromFile(@RequestParam("image") MultipartFile file) {
        try {
            if (file.isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(new ErrorResponse("NO_FILE", "No file uploaded"));
            }

            String contentType = file.getContentType();
            if (contentType == null || !contentType.startsWith("image/")) {
                return ResponseEntity.badRequest()
                    .body(new ErrorResponse("NOT_IMAGE", "File must be an image"));
            }

            System.out.println("Received file upload: " + file.getOriginalFilename() + 
                             " (" + file.getSize() + " bytes, " + contentType + ")");

            BufferedImage image = ImageIO.read(file.getInputStream());
            if (image == null) {
                return ResponseEntity.badRequest()
                    .body(new ErrorResponse("READ_FAILED", "Failed to read image file"));
            }

            // Perform eye detection
            EyeDetectionResult eyeDetection = EyeDetector.detectEye(image);
            
            if (!eyeDetection.isEye) {
                return ResponseEntity.ok(new ErrorResponse("NOT_AN_EYE", 
                    "Image does not appear to contain an eye. " + eyeDetection.reason));
            }

            // Process the image
            System.out.println("Processing uploaded image with dimensions: " + image.getWidth() + "x" + image.getHeight());
            IrisData irisData = IrisSegmentation.segmentIris(image);
            
            IrisResponseWithConfidence response = new IrisResponseWithConfidence(irisData, eyeDetection.confidence);
            
            System.out.println("File processing completed successfully");
            return ResponseEntity.ok(response);

        } catch (IOException e) {
            System.err.println("IO Error processing file: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("IO_ERROR", "Error reading image file: " + e.getMessage()));
        } catch (Exception e) {
            System.err.println("Error processing file: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("PROCESSING_ERROR", "Error processing image: " + e.getMessage()));
        }
    }

    private BufferedImage decodeBase64Image(String base64Data) {
        try {
            byte[] imageBytes = Base64.getDecoder().decode(base64Data);
            ByteArrayInputStream bis = new ByteArrayInputStream(imageBytes);
            return ImageIO.read(bis);
        } catch (IllegalArgumentException e) {
            System.err.println("Invalid base64 data: " + e.getMessage());
            return null;
        } catch (IOException e) {
            System.err.println("Error reading image from base64 data: " + e.getMessage());
            return null;
        }
    }

    // Request and Response classes
    
    public static class ImageRequest {
        private String imageData;

        public ImageRequest() {}

        public ImageRequest(String imageData) {
            this.imageData = imageData;
        }

        public String getImageData() {
            return imageData;
        }

        public void setImageData(String imageData) {
            this.imageData = imageData;
        }
    }

    public static class ErrorResponse {
        private String errorCode;
        private String message;
        private long timestamp;

        public ErrorResponse(String errorCode, String message) {
            this.errorCode = errorCode;
            this.message = message;
            this.timestamp = System.currentTimeMillis();
        }

        // Getters and setters
        public String getErrorCode() { return errorCode; }
        public void setErrorCode(String errorCode) { this.errorCode = errorCode; }
        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }
        public long getTimestamp() { return timestamp; }
        public void setTimestamp(long timestamp) { this.timestamp = timestamp; }
    }

    public static class IrisResponseWithConfidence {
        private int pupilCenterX;
        private int pupilCenterY;
        private int pupilRadius;
        private int irisCenterX;
        private int irisCenterY;
        private int irisRadius;
        private double eyeConfidence;

        public IrisResponseWithConfidence(IrisData data, double confidence) {
            this.pupilCenterX = data.pupilCenterX;
            this.pupilCenterY = data.pupilCenterY;
            this.pupilRadius = data.pupilRadius;
            this.irisCenterX = data.irisCenterX;
            this.irisCenterY = data.irisCenterY;
            this.irisRadius = data.irisRadius;
            this.eyeConfidence = confidence;
        }

        // Getters (Spring needs these for JSON serialization)
        public int getPupilCenterX() { return pupilCenterX; }
        public int getPupilCenterY() { return pupilCenterY; }
        public int getPupilRadius() { return pupilRadius; }
        public int getIrisCenterX() { return irisCenterX; }
        public int getIrisCenterY() { return irisCenterY; }
        public int getIrisRadius() { return irisRadius; }
        public double getEyeConfidence() { return eyeConfidence; }
    }
}