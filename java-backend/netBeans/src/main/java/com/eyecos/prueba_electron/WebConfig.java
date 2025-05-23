package com.eyecos.prueba_electron;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Web configuration class that handles Cross-Origin Resource Sharing (CORS) settings.
 * 
 * CORS is a security feature implemented by web browsers that restricts web pages
 * from making requests to a different domain, port, or protocol than the one serving
 * the web page. Since our React app runs on port 3000 and our Java server runs on
 * port 8080, we need to explicitly allow this cross-origin communication.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        // Configure CORS for all API endpoints
        registry.addMapping("/api/**")  // Apply to all URLs starting with /api/
                
                // Allow requests from these origins (add more as needed)
                .allowedOrigins(
                    "http://localhost:3000",     // React development server
                    "http://127.0.0.1:3000",     // Alternative localhost format
                    "file://"                    // For Electron app in production
                )
                
                // Allow these HTTP methods
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                
                // Allow these headers in requests
                .allowedHeaders("*")
                
                // Allow credentials (cookies, authorization headers) to be sent
                .allowCredentials(true)
                
                // How long the browser can cache the CORS preflight response (in seconds)
                .maxAge(3600);
        
        // Log CORS configuration for debugging
        System.out.println("CORS configuration applied:");
        System.out.println("- Allowed origins: React dev server (localhost:3000), Electron");
        System.out.println("- Allowed methods: GET, POST, PUT, DELETE, OPTIONS");
        System.out.println("- Credentials allowed: true");
    }
}