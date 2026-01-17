"""
=====================================================
AMPLITUDE PYTHON CLIENT
=====================================================

Centralized Amplitude SDK wrapper for Python backend/server applications.
Provides a simple API for tracking events from FastAPI, Flask, Django, etc.

Installation:
    pip install amplitude-analytics

Environment Variables Required:
    AMPLITUDE_API_KEY - Your Amplitude project API key

Usage:

    from amplitude_integration.server.amplitude_client import AmplitudeClient
    
    # Initialize once in your app
    client = AmplitudeClient()
    
    # Track events
    client.track(
        user_id='user-123',
        event_type='PRODUCT_DETECTED',
        event_properties={
            'product_id': 'water_bottle',
            'confidence': 0.95,
            'detection_time_ms': 150
        }
    )
    
    # Set user properties
    client.identify(
        user_id='user-123',
        user_properties={
            'device_type': 'kinect_camera',
            'location': 'store_001'
        }
    )
"""

import os
import logging
from typing import Dict, Optional, Any
from datetime import datetime

# Try to import Amplitude SDK
try:
    from amplitude import Amplitude, BaseEvent, EventOptions, Identify
    AMPLITUDE_AVAILABLE = True
except ImportError:
    AMPLITUDE_AVAILABLE = False
    logging.warning(
        "Amplitude SDK not installed. Run: pip install amplitude-analytics"
    )

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class AmplitudeClient:
    """
    Singleton wrapper for Amplitude Python SDK
    """
    
    _instance = None
    
    def __new__(cls, api_key: Optional[str] = None):
        """Singleton pattern - only one instance per process"""
        if cls._instance is None:
            cls._instance = super(AmplitudeClient, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize Amplitude client
        
        Args:
            api_key: Amplitude API key (optional, reads from AMPLITUDE_API_KEY env var)
        """
        if self._initialized:
            return
        
        # Get API key from parameter or environment
        self.api_key = api_key or os.getenv('AMPLITUDE_API_KEY', '')
        
        if not self.api_key:
            logger.error(
                "AMPLITUDE_API_KEY not configured! Set it in your .env file or pass to AmplitudeClient()"
            )
            self.client = None
            self._initialized = True
            return
        
        # Check if SDK is available
        if not AMPLITUDE_AVAILABLE:
            logger.error("Amplitude SDK not available. Events will not be tracked.")
            self.client = None
            self._initialized = True
            return
        
        # Initialize Amplitude SDK
        try:
            self.client = Amplitude(self.api_key)
            logger.info("✓ Amplitude Python client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Amplitude: {e}")
            self.client = None
        
        self._initialized = True
    
    def is_configured(self) -> bool:
        """Check if Amplitude is properly configured"""
        return self.client is not None
    
    def track(
        self,
        user_id: str,
        event_type: str,
        event_properties: Optional[Dict[str, Any]] = None,
        device_id: Optional[str] = None,
        time: Optional[int] = None,
        insert_id: Optional[str] = None,
        **kwargs
    ) -> bool:
        """
        Track an event to Amplitude
        
        Args:
            user_id: User identifier
            event_type: Event name (e.g., 'PRODUCT_DETECTED')
            event_properties: Dictionary of event properties
            device_id: Device identifier (optional)
            time: Event timestamp in milliseconds (optional, defaults to now)
            insert_id: Unique event ID for deduplication (optional)
            **kwargs: Additional event options
            
        Returns:
            bool: True if event was tracked successfully
        """
        if not self.is_configured():
            logger.warning(f"Cannot track event '{event_type}' - Amplitude not configured")
            return False
        
        try:
            # Create event
            event = BaseEvent(
                event_type=event_type,
                user_id=user_id,
                device_id=device_id,
                event_properties=event_properties or {},
                time=time,
                insert_id=insert_id
            )
            
            # Track event
            self.client.track(event)
            
            logger.debug(f"Tracked event: {event_type} for user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error tracking event '{event_type}': {e}")
            return False
    
    def identify(
        self,
        user_id: str,
        user_properties: Dict[str, Any],
        device_id: Optional[str] = None
    ) -> bool:
        """
        Set or update user properties
        
        Args:
            user_id: User identifier
            user_properties: Dictionary of user properties to set
            device_id: Device identifier (optional)
            
        Returns:
            bool: True if identification was successful
        """
        if not self.is_configured():
            logger.warning(f"Cannot identify user '{user_id}' - Amplitude not configured")
            return False
        
        try:
            # Create identify event
            identify_obj = Identify()
            
            # Set user properties
            for key, value in user_properties.items():
                identify_obj.set(key, value)
            
            # Create event with identify
            event = BaseEvent(
                event_type="$identify",
                user_id=user_id,
                device_id=device_id,
                user_properties=user_properties
            )
            
            # Track identify event
            self.client.track(event)
            
            logger.debug(f"Identified user: {user_id} with properties: {list(user_properties.keys())}")
            return True
            
        except Exception as e:
            logger.error(f"Error identifying user '{user_id}': {e}")
            return False
    
    def flush(self) -> bool:
        """
        Flush all pending events to Amplitude
        
        Returns:
            bool: True if flush was successful
        """
        if not self.is_configured():
            return False
        
        try:
            self.client.flush()
            logger.debug("Flushed events to Amplitude")
            return True
        except Exception as e:
            logger.error(f"Error flushing events: {e}")
            return False
    
    def shutdown(self):
        """
        Shutdown the Amplitude client and flush remaining events
        Call this on application shutdown
        """
        if not self.is_configured():
            return
        
        try:
            self.client.shutdown()
            logger.info("Amplitude client shutdown complete")
        except Exception as e:
            logger.error(f"Error during shutdown: {e}")


# Singleton instance for easy importing
amplitude_client = AmplitudeClient()


# Convenience functions that use the singleton
def track_event(
    user_id: str,
    event_type: str,
    event_properties: Optional[Dict[str, Any]] = None,
    **kwargs
) -> bool:
    """
    Convenience function to track an event
    Uses the singleton AmplitudeClient instance
    """
    return amplitude_client.track(user_id, event_type, event_properties, **kwargs)


def identify_user(
    user_id: str,
    user_properties: Dict[str, Any],
    device_id: Optional[str] = None
) -> bool:
    """
    Convenience function to identify a user
    Uses the singleton AmplitudeClient instance
    """
    return amplitude_client.identify(user_id, user_properties, device_id)


def flush_events() -> bool:
    """
    Convenience function to flush events
    Uses the singleton AmplitudeClient instance
    """
    return amplitude_client.flush()


# Example usage for detection events from your backend
def track_product_detection(
    user_id: str,
    product_id: str,
    confidence: float,
    detection_time_ms: int,
    camera_id: str = 'kinect_001'
):
    """
    Helper function to track product detection events
    
    Args:
        user_id: User/session identifier
        product_id: Detected product ID
        confidence: Detection confidence score
        detection_time_ms: Time taken for detection
        camera_id: Camera/sensor identifier
    """
    return track_event(
        user_id=user_id,
        event_type='PRODUCT_DETECTED',
        event_properties={
            'product_id': product_id,
            'confidence': confidence,
            'detection_time_ms': detection_time_ms,
            'camera_id': camera_id,
            'timestamp': datetime.utcnow().isoformat()
        }
    )


def track_grounding_dino_inference(
    user_id: str,
    classes_detected: list,
    num_detections: int,
    inference_time_ms: int,
    model_name: str = 'grounding-dino-tiny'
):
    """
    Helper function to track Grounding DINO inference events
    
    Args:
        user_id: User/session identifier
        classes_detected: List of detected class names
        num_detections: Number of detections
        inference_time_ms: Inference time in milliseconds
        model_name: Model identifier
    """
    return track_event(
        user_id=user_id,
        event_type='MODEL_INFERENCE',
        event_properties={
            'model_name': model_name,
            'classes_detected': classes_detected,
            'num_detections': num_detections,
            'inference_time_ms': inference_time_ms,
            'timestamp': datetime.utcnow().isoformat()
        }
    )
