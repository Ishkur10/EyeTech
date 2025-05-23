import { useState, useEffect } from 'react';
import { Alert, Badge, Card, Button } from 'react-bootstrap';

const ModeDisplay = () => {
  const [mode, setMode] = useState('detecting...');
  const [serverStatus, setServerStatus] = useState('unknown');
  const [electronAPIAvailable, setElectronAPIAvailable] = useState(false);

  useEffect(() => {
    detectMode();
    if (isWebMode()) {
      checkServerConnection();
    }
  }, []);

  
  const isWebMode = () => {
    return !window.electronAPI && navigator.userAgent.toLowerCase().indexOf(' electron/') === -1;
  };

  const detectMode = () => {
    const webMode = isWebMode();
    const electronAPI = !!window.electronAPI;
    
    setElectronAPIAvailable(electronAPI);
    
    if (webMode) {
      setMode('Web Browser');
    } else {
      setMode('Electron App');
    }
    
    console.log('Mode detection results:', {
      isWebMode: webMode,
      electronAPIAvailable: electronAPI,
      userAgent: navigator.userAgent
    });
  };

  // Function to check if the Java backend server is running (only relevant in web mode)
  const checkServerConnection = async () => {
    const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';
    
    try {
      setServerStatus('checking...');
      
      // Try to connect to the health check endpoint
      const response = await fetch(`${API_BASE_URL}/api/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.text();
        setServerStatus('connected');
        console.log('Server health check successful:', data);
      } else {
        setServerStatus('error');
        console.log('Server health check failed:', response.status, response.statusText);
      }
      
    } catch (error) {
      setServerStatus('disconnected');
      console.log('Server connection failed:', error.message);
    }
  };

  // Function to get a user-friendly explanation of the current mode
  const getModeExplanation = () => {
    if (mode === 'Web Browser') {
      return "You're running this application in a web browser. The app will communicate with the Java backend server via HTTP requests.";
    } else if (mode === 'Electron App') {
      return "You're running this application as a desktop Electron app. The app will communicate with the Java backend directly through secure IPC messaging.";
    } else {
      return "Detecting current mode...";
    }
  };

  // Function to get status-specific styling
  const getStatusVariant = () => {
    if (mode === 'Web Browser') {
      switch (serverStatus) {
        case 'connected': return 'success';
        case 'disconnected': return 'danger';
        case 'error': return 'warning';
        default: return 'info';
      }
    } else {
      return electronAPIAvailable ? 'success' : 'warning';
    }
  };

  // Function to render connection status details
  const renderConnectionStatus = () => {
    if (mode === 'Web Browser') {
      return (
        <div className="mt-3">
          <strong>Java Backend Server Status: </strong>
          <Badge bg={getStatusVariant()}>{serverStatus}</Badge>
          
          {serverStatus === 'disconnected' && (
            <Alert variant="warning" className="mt-2">
              <strong>Server not reachable!</strong> 
              <br />
              Make sure your Java backend is running:
              <br />
              <code>cd backend && mvn spring-boot:run</code>
            </Alert>
          )}
          
          {serverStatus === 'connected' && (
            <Alert variant="success" className="mt-2">
              ✅ Successfully connected to Java backend server at {process.env.REACT_APP_API_URL || 'http://localhost:8080'}
            </Alert>
          )}
          
          <Button 
            variant="outline-primary" 
            size="sm" 
            onClick={checkServerConnection}
            className="mt-2"
          >
            🔄 Recheck Server Connection
          </Button>
        </div>
      );
    } else {
      return (
        <div className="mt-3">
          <strong>Electron API Status: </strong>
          <Badge bg={getStatusVariant()}>
            {electronAPIAvailable ? 'Available' : 'Not Available'}
          </Badge>
          
          {!electronAPIAvailable && (
            <Alert variant="warning" className="mt-2">
              <strong>Electron API not available!</strong> 
              <br />
              This might indicate an issue with the preload script or context isolation settings.
            </Alert>
          )}
          
          {electronAPIAvailable && (
            <Alert variant="success" className="mt-2">
              ✅ Electron API is properly configured and available
            </Alert>
          )}
        </div>
      );
    }
  };

  return (
    <Card className="mb-3">
      <Card.Header>
        <strong>Application Mode: </strong>
        <Badge bg={mode === 'Electron App' ? 'primary' : 'secondary'}>
          {mode}
        </Badge>
      </Card.Header>
      <Card.Body>
        <p>{getModeExplanation()}</p>
        {renderConnectionStatus()}
        
        <details className="mt-3">
          <summary style={{ cursor: 'pointer' }}>🔧 Technical Details</summary>
          <div className="mt-2 p-2" style={{ backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
            <small>
              <strong>Environment Variables:</strong><br />
              API URL: {process.env.REACT_APP_API_URL || 'http://localhost:8080 (default)'}<br />
              Node Environment: {process.env.NODE_ENV}<br />
              <br />
              <strong>Detection Results:</strong><br />
              Electron API Available: {electronAPIAvailable ? 'Yes' : 'No'}<br />
              User Agent: {navigator.userAgent.substring(0, 100)}...
            </small>
          </div>
        </details>
      </Card.Body>
    </Card>
  );
};

export default ModeDisplay;