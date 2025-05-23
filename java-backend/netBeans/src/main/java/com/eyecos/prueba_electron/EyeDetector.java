package com.eyecos.prueba_electron;

import java.awt.image.BufferedImage;
import java.util.ArrayList;
import java.util.List;

/**
 * Eye detection class that validates whether an image contains an eye
 * before attempting iris segmentation.
 * 
 * This uses multiple heuristics to detect eye-like patterns:
 * 1. Circular structure detection (iris/pupil patterns)
 * 2. Contrast analysis (eyes have high contrast between pupil, iris, and sclera)
 * 3. Edge density (eyes have many edges from eyelashes, iris patterns)
 * 4. Dark region detection (pupil is typically the darkest region)
 */
public class EyeDetector {
    
    // Thresholds for eye detection
    private static final double MIN_CIRCULAR_SCORE = 0.3;
    private static final double MIN_CONTRAST_RATIO = 2.0;
    private static final double MIN_EDGE_DENSITY = 0.15;
    private static final int MIN_DARK_REGION_SIZE = 100; // pixels
    
    public static class EyeDetectionResult {
        public boolean isEye;
        public double confidence;
        public String reason;
        
        public EyeDetectionResult(boolean isEye, double confidence, String reason) {
            this.isEye = isEye;
            this.confidence = confidence;
            this.reason = reason;
        }
    }
    
    /**
     * Detects whether the given image contains an eye
     */
    public static EyeDetectionResult detectEye(BufferedImage image) {
        try {
            // Convert to grayscale for analysis
            byte[] grayPixels = IrisSegmentation.convertToGrayscale(image);
            int width = image.getWidth();
            int height = image.getHeight();
            
            // Run multiple detection methods
            double circularScore = detectCircularStructures(grayPixels, width, height);
            double contrastRatio = calculateContrastRatio(grayPixels);
            double edgeDensity = calculateEdgeDensity(grayPixels, width, height);
            boolean hasDarkRegion = detectDarkRegion(grayPixels, width, height);
            
            // Calculate overall confidence score
            double confidence = 0.0;
            int passedTests = 0;
            
            if (circularScore >= MIN_CIRCULAR_SCORE) {
                confidence += 0.3;
                passedTests++;
            }
            
            if (contrastRatio >= MIN_CONTRAST_RATIO) {
                confidence += 0.3;
                passedTests++;
            }
            
            if (edgeDensity >= MIN_EDGE_DENSITY) {
                confidence += 0.2;
                passedTests++;
            }
            
            if (hasDarkRegion) {
                confidence += 0.2;
                passedTests++;
            }
            
            // Determine if it's an eye based on passed tests
            boolean isEye = passedTests >= 3; // At least 3 out of 4 tests must pass
            
            // Generate detailed reason
            String reason = generateReason(circularScore, contrastRatio, edgeDensity, hasDarkRegion, passedTests);
            
            return new EyeDetectionResult(isEye, confidence, reason);
            
        } catch (Exception e) {
            return new EyeDetectionResult(false, 0.0, "Error during eye detection: " + e.getMessage());
        }
    }
    
    /**
     * Detects circular structures in the image using Hough-like approach
     */
    private static double detectCircularStructures(byte[] pixels, int width, int height) {
        // Look for circular edges using a simplified circular Hough transform
        int centerX = width / 2;
        int centerY = height / 2;
        int maxRadius = Math.min(width, height) / 3;
        
        double maxScore = 0.0;
        
        // Test multiple radius values around the center
        for (int r = maxRadius / 4; r < maxRadius; r += 5) {
            double score = 0.0;
            int points = 0;
            
            // Sample points around the circle
            for (int angle = 0; angle < 360; angle += 10) {
                int x = (int)(centerX + r * Math.cos(Math.toRadians(angle)));
                int y = (int)(centerY + r * Math.sin(Math.toRadians(angle)));
                
                if (x >= 1 && x < width - 1 && y >= 1 && y < height - 1) {
                    // Calculate gradient magnitude at this point
                    double gradient = calculateGradientMagnitude(pixels, width, x, y);
                    score += gradient;
                    points++;
                }
            }
            
            if (points > 0) {
                score /= points;
                maxScore = Math.max(maxScore, score);
            }
        }
        
        // Normalize score to 0-1 range
        return Math.min(maxScore / 100.0, 1.0);
    }
    
    /**
     * Calculates the contrast ratio between dark and light regions
     */
    private static double calculateContrastRatio(byte[] pixels) {
        // Find the darkest and brightest regions
        int[] histogram = new int[256];
        
        for (byte pixel : pixels) {
            histogram[pixel & 0xFF]++;
        }
        
        // Find the 10th and 90th percentile values
        int totalPixels = pixels.length;
        int darkValue = 0, brightValue = 255;
        int count = 0;
        
        // Find 10th percentile (dark value)
        for (int i = 0; i < 256; i++) {
            count += histogram[i];
            if (count >= totalPixels * 0.1) {
                darkValue = i;
                break;
            }
        }
        
        // Find 90th percentile (bright value)
        count = 0;
        for (int i = 255; i >= 0; i--) {
            count += histogram[i];
            if (count >= totalPixels * 0.1) {
                brightValue = i;
                break;
            }
        }
        
        // Calculate contrast ratio
        if (darkValue == 0) darkValue = 1; // Avoid division by zero
        return (double)brightValue / darkValue;
    }
    
    /**
     * Calculates edge density in the image
     */
    private static double calculateEdgeDensity(byte[] pixels, int width, int height) {
        int edgePixels = 0;
        int totalPixels = 0;
        
        // Calculate edges using Sobel-like operator
        for (int y = 1; y < height - 1; y++) {
            for (int x = 1; x < width - 1; x++) {
                double gradient = calculateGradientMagnitude(pixels, width, x, y);
                
                // Count as edge if gradient is significant
                if (gradient > 30) {
                    edgePixels++;
                }
                totalPixels++;
            }
        }
        
        return (double)edgePixels / totalPixels;
    }
    
    /**
     * Detects if there's a significant dark region (potential pupil)
     */
    private static boolean detectDarkRegion(byte[] pixels, int width, int height) {
        // Threshold for dark pixels
        int darkThreshold = 50;
        
        // Find connected dark regions using flood fill approach
        boolean[] visited = new boolean[pixels.length];
        int largestDarkRegion = 0;
        
        for (int y = height / 4; y < 3 * height / 4; y++) {
            for (int x = width / 4; x < 3 * width / 4; x++) {
                int index = y * width + x;
                
                if (!visited[index] && (pixels[index] & 0xFF) < darkThreshold) {
                    // Found a dark pixel, flood fill to find region size
                    int regionSize = floodFillCount(pixels, visited, width, height, x, y, darkThreshold);
                    largestDarkRegion = Math.max(largestDarkRegion, regionSize);
                }
            }
        }
        
        return largestDarkRegion >= MIN_DARK_REGION_SIZE;
    }
    
    /**
     * Flood fill to count connected dark pixels
     */
    private static int floodFillCount(byte[] pixels, boolean[] visited, int width, int height, 
                                     int startX, int startY, int threshold) {
        List<int[]> stack = new ArrayList<>();
        stack.add(new int[]{startX, startY});
        int count = 0;
        
        while (!stack.isEmpty()) {
            int[] pos = stack.remove(stack.size() - 1);
            int x = pos[0];
            int y = pos[1];
            int index = y * width + x;
            
            if (x < 0 || x >= width || y < 0 || y >= height || visited[index]) {
                continue;
            }
            
            if ((pixels[index] & 0xFF) < threshold) {
                visited[index] = true;
                count++;
                
                // Add neighbors
                stack.add(new int[]{x + 1, y});
                stack.add(new int[]{x - 1, y});
                stack.add(new int[]{x, y + 1});
                stack.add(new int[]{x, y - 1});
            }
        }
        
        return count;
    }
    
    /**
     * Calculates gradient magnitude at a specific pixel
     */
    private static double calculateGradientMagnitude(byte[] pixels, int width, int x, int y) {
        int index = y * width + x;
        
        // Simple gradient calculation
        int dx = (pixels[index + 1] & 0xFF) - (pixels[index - 1] & 0xFF);
        int dy = (pixels[(y + 1) * width + x] & 0xFF) - (pixels[(y - 1) * width + x] & 0xFF);
        
        return Math.sqrt(dx * dx + dy * dy);
    }
    

    private static String generateReason(double circularScore, double contrastRatio, 
                                       double edgeDensity, boolean hasDarkRegion, int passedTests) {
        if (passedTests >= 3) {
            return String.format("Eye detected with high confidence. Circular structures: %.2f, " +
                               "Contrast ratio: %.2f, Edge density: %.2f, Dark region: %s",
                               circularScore, contrastRatio, edgeDensity, hasDarkRegion ? "Yes" : "No");
        } else {
            List<String> failedTests = new ArrayList<>();
            
            if (circularScore < MIN_CIRCULAR_SCORE) {
                failedTests.add("insufficient circular structures");
            }
            if (contrastRatio < MIN_CONTRAST_RATIO) {
                failedTests.add("low contrast");
            }
            if (edgeDensity < MIN_EDGE_DENSITY) {
                failedTests.add("low edge density");
            }
            if (!hasDarkRegion) {
                failedTests.add("no dark pupil region found");
            }
            
            return "Not detected as eye image: " + String.join(", ", failedTests);
        }
    }
}