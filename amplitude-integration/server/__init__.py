"""
Amplitude Integration - Python Server Module

Import the client and helpers:
    from amplitude_integration.server import amplitude_client, track_event
"""

from .amplitude_client import (
    AmplitudeClient,
    amplitude_client,
    track_event,
    identify_user,
    flush_events,
    track_product_detection,
    track_grounding_dino_inference
)

from .event_schemas import (
    EventType,
    EVENT_CATALOG,
    get_event_schema,
    validate_event_properties
)

__all__ = [
    'AmplitudeClient',
    'amplitude_client',
    'track_event',
    'identify_user',
    'flush_events',
    'track_product_detection',
    'track_grounding_dino_inference',
    'EventType',
    'EVENT_CATALOG',
    'get_event_schema',
    'validate_event_properties'
]
