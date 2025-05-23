package com.eyecos.prueba_electron;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.Base64;
import javax.imageio.ImageIO;
import com.google.gson.Gson;
import com.eyecos.prueba_electron.IrisSegmentation.IrisData;

/**
 * Command Line Interface controller for the Iris Segmentation application.
 * This class is designed to be called from Electron's main process.
 * 
 * It reads base64-encoded image data from stdin (to handle large images),
 * processes it, and outputs the results as JSON to stdout.
 */
public class IrisController {
    
    public static void main(String[] args) {
        try {
            // Log to stderr that we're starting (this won't interfere with JSON output)
            System.err.println("CLI: Starting iris segmentation process");
            System.err.println("CLI: Reading image data from stdin...");
            
            // Read the entire input from stdin
            // We use a BufferedReader to efficiently read the large base64 string
            BufferedReader reader = new BufferedReader(new InputStreamReader(System.in));
            StringBuilder base64Builder = new StringBuilder();
            String line;
            
            // Read all lines from stdin until we reach the end
            while ((line = reader.readLine()) != null) {
                base64Builder.append(line);
            }
            reader.close();
            
            String base64Data = base64Builder.toString();
            System.err.println("CLI: Received image data of length: " + base64Data.length());
            
            // Validate that we received data
            if (base64Data.isEmpty()) {
                throw new IllegalArgumentException("No image data received from stdin");
            }
            
            // Remove the data URL prefix if present
            if (base64Data.startsWith("data:image")) {
                String[] parts = base64Data.split(",");
                if (parts.length > 1) {
                    base64Data = parts[1];
                    System.err.println("CLI: Stripped data URL prefix");
                } else {
                    throw new IllegalArgumentException("Invalid base64 image format");
                }
            }
            
            // Decode the base64 string into a BufferedImage
            BufferedImage image = decodeBase64Image(base64Data);
            if (image == null) {
                throw new IOException("Failed to decode image from base64 data");
            }
            
            System.err.println("CLI: Decoded image dimensions: " + image.getWidth() + "x" + image.getHeight());
            
            // First, check if the image contains an eye
            System.err.println("CLI: Performing eye detection...");
            EyeDetector.EyeDetectionResult eyeDetection = EyeDetector.detectEye(image);
            
            if (!eyeDetection.isEye) {
                // Create an error response for non-eye images
                ErrorResponse errorResponse = new ErrorResponse(
                    "NOT_AN_EYE",
                    "Image does not appear to contain an eye. " + eyeDetection.reason
                );
                
                Gson gson = new Gson();
                System.out.println(gson.toJson(errorResponse));
                System.err.println("CLI: Image rejected - not detected as eye");
                System.exit(0);
            }
            
            System.err.println("CLI: Eye detected with confidence: " + eyeDetection.confidence);
            
            // Process the image using the iris segmentation algorithm
            IrisData result = IrisSegmentation.segmentIris(image);
            
            System.err.println("CLI: Processing completed");
            System.err.println("CLI: Pupil - center(" + result.pupilCenterX + "," + result.pupilCenterY + ") radius=" + result.pupilRadius);
            System.err.println("CLI: Iris - center(" + result.irisCenterX + "," + result.irisCenterY + ") radius=" + result.irisRadius);
            
            // Add eye detection confidence to the result
            IrisDataWithConfidence resultWithConfidence = new IrisDataWithConfidence(result, eyeDetection.confidence);
            
            // Convert the result to JSON and print to stdout
            // This is what Electron will capture and parse
            Gson gson = new Gson();
            String jsonResult = gson.toJson(resultWithConfidence);
            
            // IMPORTANT: Only output the JSON to stdout, nothing else!
            System.out.println(jsonResult);
            System.err.println("CLI: Successfully output JSON result");
            
            // Exit successfully
            System.exit(0);
            
        } catch (Exception e) {
            // Log errors to stderr so they don't corrupt the JSON output
            System.err.println("CLI Error: " + e.getClass().getName() + " - " + e.getMessage());
            e.printStackTrace(System.err);
            
            // Exit with error code
            System.exit(1);
        }
    }
    
    /**
     * Helper method to decode base64 image data into a BufferedImage
     */
    private static BufferedImage decodeBase64Image(String base64Data) throws IOException {
        try {
            // Decode the base64 string into bytes
            byte[] imageBytes = Base64.getDecoder().decode(base64Data);
            
            // Convert bytes into a BufferedImage
            ByteArrayInputStream bis = new ByteArrayInputStream(imageBytes);
            BufferedImage image = ImageIO.read(bis);
            
            if (image == null) {
                throw new IOException("ImageIO.read returned null - invalid image data");
            }
            
            return image;
            
        } catch (IllegalArgumentException e) {
            throw new IOException("Invalid base64 data: " + e.getMessage(), e);
        }
    }
    
    /**
     * Error response class for non-eye images
     */
    static class ErrorResponse {
        String errorCode;
        String message;
        
        ErrorResponse(String errorCode, String message) {
            this.errorCode = errorCode;
            this.message = message;
        }
    }
    
    /**
     * Extended iris data with eye detection confidence
     */
    static class IrisDataWithConfidence {
        int pupilCenterX;
        int pupilCenterY;
        int pupilRadius;
        int irisCenterX;
        int irisCenterY;
        int irisRadius;
        double eyeConfidence;
        
        IrisDataWithConfidence(IrisData data, double confidence) {
            this.pupilCenterX = data.pupilCenterX;
            this.pupilCenterY = data.pupilCenterY;
            this.pupilRadius = data.pupilRadius;
            this.irisCenterX = data.irisCenterX;
            this.irisCenterY = data.irisCenterY;
            this.irisRadius = data.irisRadius;
            this.eyeConfidence = confidence;
        }
    }
}