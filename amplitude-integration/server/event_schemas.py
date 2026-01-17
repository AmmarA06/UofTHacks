"""
=====================================================
AMPLITUDE EVENT SCHEMAS
=====================================================

Typed event definitions for Amplitude tracking.
Ensures consistency between frontend and backend events.

These schemas can be used with Pydantic for validation,
or as reference for event property structure.

Usage:

    from amplitude_integration.server.event_schemas import ProductEvent
    
    # Validate event data
    event = ProductEvent(
        product_id='water_bottle',
        product_name='Water Bottle',
        product_category='beverage',
        price=24.99
    )
    
    # Track with validated data
    amplitude_client.track(
        user_id='user-123',
        event_type='PRODUCT_VIEWED',
        event_properties=event.dict()
    )
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

# Try to import Pydantic for validation
try:
    from pydantic import BaseModel, Field, validator
    PYDANTIC_AVAILABLE = True
except ImportError:
    # Fallback to basic dict if Pydantic not available
    PYDANTIC_AVAILABLE = False
    BaseModel = dict


# =====================================================
# ENUMS FOR EVENT TYPES
# =====================================================

class EventType(str, Enum):
    """Standard event types"""
    # Product events
    PRODUCT_VIEWED = "PRODUCT_VIEWED"
    PRODUCT_WINDOW_SHOPPED = "PRODUCT_WINDOW_SHOPPED"
    PRODUCT_CART_ABANDONED = "PRODUCT_CART_ABANDONED"
    PRODUCT_PURCHASED = "PRODUCT_PURCHASED"
    PRODUCT_ADDED_TO_CART = "PRODUCT_ADDED_TO_CART"
    
    # Detection events (backend)
    PRODUCT_DETECTED = "PRODUCT_DETECTED"
    MODEL_INFERENCE = "MODEL_INFERENCE"
    CAMERA_FRAME_PROCESSED = "CAMERA_FRAME_PROCESSED"
    
    # Dashboard events
    DASHBOARD_VIEWED = "DASHBOARD_VIEWED"
    CHART_INTERACTED = "CHART_INTERACTED"
    FILTER_APPLIED = "FILTER_APPLIED"
    EXPORT_TRIGGERED = "EXPORT_TRIGGERED"
    
    # Agent events
    AGENT_QUERY_SENT = "AGENT_QUERY_SENT"
    AGENT_RESPONSE_RECEIVED = "AGENT_RESPONSE_RECEIVED"
    AGENT_ACTION_EXECUTED = "AGENT_ACTION_EXECUTED"


# =====================================================
# BASE EVENT SCHEMA
# =====================================================

if PYDANTIC_AVAILABLE:
    class BaseEventSchema(BaseModel):
        """Base schema for all events"""
        timestamp: Optional[str] = Field(default_factory=lambda: datetime.utcnow().isoformat())
        page_url: Optional[str] = None
        
        class Config:
            use_enum_values = True


# =====================================================
# PRODUCT EVENT SCHEMAS
# =====================================================

if PYDANTIC_AVAILABLE:
    class ProductEvent(BaseEventSchema):
        """Product interaction events"""
        product_id: str
        product_name: str
        product_category: str
        price: float
        sku: Optional[str] = None
        instructions: Optional[str] = None  # For AI agent instructions
        
        @validator('price')
        def price_must_be_positive(cls, v):
            if v < 0:
                raise ValueError('Price must be positive')
            return v


    class ProductDetectionEvent(BaseEventSchema):
        """Product detection from camera/sensor"""
        product_id: str
        product_name: Optional[str] = None
        confidence: float
        detection_time_ms: int
        camera_id: str
        bbox: Optional[Dict[str, int]] = None  # Bounding box {x, y, w, h}
        center: Optional[Dict[str, int]] = None  # Center point {cx, cy}
        
        @validator('confidence')
        def confidence_must_be_valid(cls, v):
            if not 0 <= v <= 1:
                raise ValueError('Confidence must be between 0 and 1')
            return v


    class ModelInferenceEvent(BaseEventSchema):
        """Model inference tracking"""
        model_name: str
        classes_detected: List[str]
        num_detections: int
        inference_time_ms: int
        confidence_threshold: Optional[float] = 0.15
        
        @validator('inference_time_ms')
        def inference_time_must_be_positive(cls, v):
            if v < 0:
                raise ValueError('Inference time must be positive')
            return v


# =====================================================
# DASHBOARD EVENT SCHEMAS
# =====================================================

if PYDANTIC_AVAILABLE:
    class DashboardEvent(BaseEventSchema):
        """Dashboard view events"""
        dashboard_name: str
        time_spent_ms: Optional[int] = None


    class ChartInteractionEvent(BaseEventSchema):
        """Chart interaction events"""
        chart_id: str
        interaction_type: str  # 'hover', 'click', 'zoom', 'pan'
        chart_type: Optional[str] = None  # 'line', 'bar', 'pie', etc.


    class FilterEvent(BaseEventSchema):
        """Filter application events"""
        filters: Dict[str, Any]
        filter_count: int


    class ExportEvent(BaseEventSchema):
        """Data export events"""
        export_type: str  # 'csv', 'excel', 'pdf', 'json'
        data_type: str
        record_count: Optional[int] = None


# =====================================================
# AGENT EVENT SCHEMAS
# =====================================================

if PYDANTIC_AVAILABLE:
    class AgentQueryEvent(BaseEventSchema):
        """AI agent query events"""
        query_text: str
        query_type: Optional[str] = None
        context: Optional[Dict[str, Any]] = None


    class AgentResponseEvent(BaseEventSchema):
        """AI agent response events"""
        query_id: str
        response_text: str
        response_time_ms: int
        success: bool


    class AgentActionEvent(BaseEventSchema):
        """AI agent action execution events"""
        action_type: str
        action_target: str
        action_params: Optional[Dict[str, Any]] = None
        success: bool


# =====================================================
# EVENT CATALOG
# =====================================================

EVENT_CATALOG = {
    # Product events
    "PRODUCT_VIEWED": {
        "description": "User viewed a product page",
        "properties": ["product_id", "product_name", "product_category", "price", "sku"]
    },
    "PRODUCT_WINDOW_SHOPPED": {
        "description": "User viewed product but showed low engagement (AI trigger for discount)",
        "properties": ["product_id", "product_name", "product_category", "price", "instructions"],
        "instructions": "This item has low shelf velocity. Calculate a 30% clearance discount."
    },
    "PRODUCT_CART_ABANDONED": {
        "description": "User added to cart but didn't purchase (AI trigger for urgency)",
        "properties": ["product_id", "product_name", "product_category", "price", "instructions"],
        "instructions": "This item has high intent but decision friction. Trigger Urgency Directive."
    },
    "PRODUCT_PURCHASED": {
        "description": "User completed purchase (AI trigger for social proof)",
        "properties": ["product_id", "product_name", "product_category", "price", "revenue", "instructions"],
        "instructions": "Successful conversion. Deploy social proof and cross-sell recommendations."
    },
    
    # Detection events
    "PRODUCT_DETECTED": {
        "description": "Product detected by camera/sensor",
        "properties": ["product_id", "confidence", "detection_time_ms", "camera_id", "bbox", "center"]
    },
    "MODEL_INFERENCE": {
        "description": "ML model inference completed",
        "properties": ["model_name", "classes_detected", "num_detections", "inference_time_ms"]
    },
    
    # Dashboard events
    "DASHBOARD_VIEWED": {
        "description": "User viewed a dashboard page",
        "properties": ["dashboard_name"]
    },
    "CHART_INTERACTED": {
        "description": "User interacted with a chart",
        "properties": ["chart_id", "interaction_type", "chart_type"]
    },
    
    # Agent events
    "AGENT_QUERY_SENT": {
        "description": "User sent query to AI agent",
        "properties": ["query_text", "query_type", "context"]
    },
}


# =====================================================
# HELPER FUNCTIONS
# =====================================================

def get_event_schema(event_type: str) -> Optional[Dict[str, Any]]:
    """Get event schema from catalog"""
    return EVENT_CATALOG.get(event_type)


def validate_event_properties(event_type: str, properties: Dict[str, Any]) -> bool:
    """
    Validate that event properties match the expected schema
    
    Args:
        event_type: Event type name
        properties: Event properties to validate
        
    Returns:
        bool: True if valid
    """
    schema = get_event_schema(event_type)
    if not schema:
        return True  # Unknown event, allow it
    
    required_props = schema.get('properties', [])
    missing_props = [prop for prop in required_props if prop not in properties]
    
    if missing_props:
        print(f"Warning: Missing properties for {event_type}: {missing_props}")
        return False
    
    return True


# Export schema classes if Pydantic is available
if PYDANTIC_AVAILABLE:
    __all__ = [
        'EventType',
        'BaseEventSchema',
        'ProductEvent',
        'ProductDetectionEvent',
        'ModelInferenceEvent',
        'DashboardEvent',
        'ChartInteractionEvent',
        'FilterEvent',
        'ExportEvent',
        'AgentQueryEvent',
        'AgentResponseEvent',
        'AgentActionEvent',
        'EVENT_CATALOG',
        'get_event_schema',
        'validate_event_properties'
    ]
else:
    __all__ = [
        'EventType',
        'EVENT_CATALOG',
        'get_event_schema',
        'validate_event_properties'
    ]
