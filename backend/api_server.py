"""FastAPI server for database and streaming"""

from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List
from pydantic import BaseModel
import uvicorn
from datetime import datetime
import threading
import asyncio
import os

from database import VisualDatabase

# Database path - store in root/database directory
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(ROOT_DIR, "database", "visual_database.db")

# Ensure database directory exists
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

db = VisualDatabase(DB_PATH)

# Shared detector reference for dynamic class updates
_detector = None
_detector_lock = threading.Lock()

def set_detector(detector):
    """
    Register the detector instance with the API server.
    This allows dynamic class updates without restarting the backend.
    Called by backend_grounding_dino.py after detector initialization.
    """
    global _detector
    with _detector_lock:
        _detector = detector
    print(f"[API Server] Detector registered for dynamic class updates")

def get_detector():
    """
    Get the registered detector instance.
    Returns None if detector hasn't been registered yet.
    """
    global _detector
    with _detector_lock:
        return _detector

# Create FastAPI app
app = FastAPI(
    title="Visual Database API",
    description="REST API for visual object database with real-time detection streaming",
    version="2.0.0"
)

# Enable CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for local development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# === OBJECT MANAGEMENT ENDPOINTS ===

@app.get("/")
async def root():
    return {
        "name": "Visual Database API",
        "version": "2.0.0",
        "status": "running",
        "endpoints": {
            "objects": "/api/objects",
            "classes": "/api/classes",
            "groups": "/api/groups",
            "statistics": "/api/stats/summary",
            "docs": "/docs"
        }
    }


@app.get("/api/objects")
async def get_objects(
    present: Optional[bool] = None,
    class_name: Optional[str] = None,
    limit: int = 100
):
    try:
        present_only = present if present is not None else False
        objects = db.get_all_objects(
            present_only=present_only,
            class_name=class_name,
            limit=limit
        )

        # Convert to JSON-serializable format (exclude BLOB)
        result = []
        for obj in objects:
            obj_dict = dict(obj)
            # Remove binary thumbnail from response
            if 'thumbnail' in obj_dict:
                obj_dict['has_thumbnail'] = obj_dict['thumbnail'] is not None
                del obj_dict['thumbnail']
            result.append(obj_dict)

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# === SEARCH & QUERY ENDPOINTS (MUST BE BEFORE PARAMETERIZED ROUTES) ===

@app.get("/api/objects/search")
async def search_objects(
    query: str = "",
    limit: int = 1000
):
    """Search objects by ID, class name, or table name"""
    try:
        cursor = db.conn.cursor()

        # Strip whitespace from query
        query = query.strip()

        if not query:
            # No query - return all objects
            cursor.execute("SELECT * FROM objects ORDER BY last_seen DESC LIMIT ?", (limit,))
        else:
            # Check if query is a numeric ID
            if query.isdigit():
                object_id = int(query)
                # Search by object ID
                cursor.execute("SELECT * FROM objects WHERE object_id = ? LIMIT ?", (object_id, limit))
            else:
                # Search by class name or table name
                cursor.execute("""
                    SELECT DISTINCT o.*
                    FROM objects o
                    LEFT JOIN object_group_members ogm ON o.object_id = ogm.object_id
                    LEFT JOIN object_groups og ON ogm.group_id = og.group_id
                    WHERE o.class_name LIKE ? OR og.group_name LIKE ?
                    ORDER BY o.last_seen DESC
                    LIMIT ?
                """, (f"%{query}%", f"%{query}%", limit))

        objects = cursor.fetchall()

        result = []
        for obj in objects:
            obj_dict = dict(obj)
            if 'thumbnail' in obj_dict:
                obj_dict['has_thumbnail'] = obj_dict['thumbnail'] is not None
                del obj_dict['thumbnail']
            result.append(obj_dict)

        return result

    except Exception as e:
        print(f"Search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class BulkDeleteRequest(BaseModel):
    object_ids: List[int]

@app.post("/api/objects/bulk-delete")
async def bulk_delete_objects(request: BulkDeleteRequest):
    """Delete multiple objects at once"""
    try:
        deleted = []
        not_found = []

        for object_id in request.object_ids:
            obj = db.get_object(object_id)
            if obj is None:
                not_found.append(object_id)
            else:
                db.delete_object(object_id)
                deleted.append(object_id)

        return {
            "status": "success",
            "deleted": deleted,
            "not_found": not_found,
            "total_deleted": len(deleted)
        }

    except Exception as e:
        print(f"Bulk delete error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/objects/nearby")
async def get_objects_nearby(
    x: float,
    y: float,
    z: float,
    radius: float = 500.0
):
    try:
        objects = db.get_objects_nearby(x, y, z, radius)

        result = []
        for obj in objects:
            obj_dict = dict(obj)
            if 'thumbnail' in obj_dict:
                obj_dict['has_thumbnail'] = obj_dict['thumbnail'] is not None
                del obj_dict['thumbnail']
            result.append(obj_dict)

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/objects/by-class/{class_name}")
async def get_objects_by_class(class_name: str, present: bool = False):
    try:
        objects = db.get_objects_by_class(class_name, present_only=present)

        result = []
        for obj in objects:
            obj_dict = dict(obj)
            if 'thumbnail' in obj_dict:
                obj_dict['has_thumbnail'] = obj_dict['thumbnail'] is not None
                del obj_dict['thumbnail']
            result.append(obj_dict)

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# === PARAMETERIZED OBJECT ROUTES (MUST BE AFTER SPECIFIC ROUTES) ===

@app.get("/api/objects/{object_id}")
async def get_object(object_id: int):
    try:
        obj = db.get_object(object_id)

        if obj is None:
            raise HTTPException(status_code=404, detail=f"Object {object_id} not found")

        obj_dict = dict(obj)
        # Remove binary thumbnail
        if 'thumbnail' in obj_dict:
            obj_dict['has_thumbnail'] = obj_dict['thumbnail'] is not None
            del obj_dict['thumbnail']

        return obj_dict

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/objects/{object_id}/thumbnail")
async def get_thumbnail(object_id: int):
    try:
        obj = db.get_object(object_id)

        if obj is None:
            raise HTTPException(status_code=404, detail=f"Object {object_id} not found")

        if obj['thumbnail'] is None:
            raise HTTPException(status_code=404, detail="No thumbnail available")

        return Response(content=obj['thumbnail'], media_type="image/png")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/objects/{object_id}")
async def delete_object(object_id: int):
    try:
        # Check if exists
        obj = db.get_object(object_id)
        if obj is None:
            raise HTTPException(status_code=404, detail=f"Object {object_id} not found")

        db.delete_object(object_id)

        return {"status": "success", "message": f"Object {object_id} deleted"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# === STATISTICS ENDPOINTS ===

@app.get("/api/stats/summary")
async def get_statistics():
    try:
        stats = db.get_statistics()
        return stats

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/stats/timeline")
async def get_detection_timeline(hours: int = 24):
    """Get hourly detection timeline"""
    try:
        timeline = db.get_detection_timeline(hours)
        return {"timeline": timeline}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/stats/heatmap")
async def get_detection_heatmap(days: int = 7):
    """Get detection heatmap data (day × hour)"""
    try:
        heatmap = db.get_detection_heatmap(days)
        return {"heatmap": heatmap}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/detections/recent")
async def get_recent_detections(limit: int = 20):
    """Get recent detection events with object information"""
    try:
        detections = db.get_recent_detections(limit)
        return detections

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# === CLASS MANAGEMENT ENDPOINTS ===

class ClassCreateRequest(BaseModel):
    name: str
    category: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    description: Optional[str] = None
    confidence_override: Optional[float] = None
    distance_threshold: Optional[float] = None

class ClassUpdateRequest(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    confidence_override: Optional[float] = None
    distance_threshold: Optional[float] = None

@app.get("/api/classes")
async def get_classes(
    active: Optional[bool] = None,
    category: Optional[str] = None
):
    """Get all classes with optional filters"""
    try:
        active_only = active if active is not None else False
        classes = db.get_all_classes(active_only=active_only, category=category)
        return classes
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/classes/{class_id}")
async def get_class(class_id: int):
    """Get a specific class by ID"""
    try:
        cls = db.get_class(class_id)
        if cls is None:
            raise HTTPException(status_code=404, detail=f"Class {class_id} not found")
        return cls
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/classes/{class_id}/stats")
async def get_class_stats(class_id: int):
    """Get statistics for a specific class"""
    try:
        cls = db.get_class(class_id)
        if cls is None:
            raise HTTPException(status_code=404, detail=f"Class {class_id} not found")

        stats = db.get_class_statistics(class_id)
        return stats
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/classes")
async def create_class(request: ClassCreateRequest):
    """Create a new class"""
    try:
        class_id = db.create_class(
            name=request.name,
            category=request.category,
            color=request.color,
            icon=request.icon,
            description=request.description,
            confidence_override=request.confidence_override,
            distance_threshold=request.distance_threshold
        )

        cls = db.get_class(class_id)

        return cls
    except Exception as e:
        if "UNIQUE constraint failed" in str(e):
            raise HTTPException(status_code=400, detail=f"Class '{request.name}' already exists")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/classes/{class_id}")
async def update_class(class_id: int, request: ClassUpdateRequest):
    """Update a class"""
    try:
        # Filter out None values
        updates = {k: v for k, v in request.dict().items() if v is not None}

        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")

        # Convert is_active boolean to integer
        if 'is_active' in updates:
            updates['is_active'] = 1 if updates['is_active'] else 0

        success = db.update_class(class_id, **updates)

        if not success:
            raise HTTPException(status_code=404, detail=f"Class {class_id} not found")

        cls = db.get_class(class_id)

        return cls
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/classes/{class_id}")
async def delete_class(class_id: int, cascade: bool = False):
    """Delete a class"""
    try:
        cls = db.get_class(class_id)
        if cls is None:
            raise HTTPException(status_code=404, detail=f"Class {class_id} not found")

        was_active = cls.get('is_active')
        class_name = cls.get('name')

        success = db.delete_class(class_id, cascade=cascade)

        if success:
            return {"status": "success", "message": f"Class {class_id} deleted"}
        else:
            raise HTTPException(status_code=500, detail="Failed to delete class")
    except HTTPException:
        raise
    except ValueError as e:
        # Shadow class deletion attempt
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class BulkClassCreateRequest(BaseModel):
    classes: List[dict]

@app.post("/api/classes/bulk-create")
async def bulk_create_classes(request: BulkClassCreateRequest):
    """Bulk create multiple classes"""
    try:
        class_ids = db.bulk_create_classes(request.classes)

        classes = [db.get_class(cid) for cid in class_ids]

        return {
            "status": "success",
            "created": len(classes),
            "classes": classes
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/detector/sync-classes")
async def sync_detector_classes():
    """
    Synchronize detector with active classes from database.
    This allows adding/removing/toggling classes without restarting the backend.

    Call this endpoint after:
    - Creating a new class
    - Deleting a class
    - Toggling class is_active status

    Returns:
        - status: "success" or "warning"
        - classes: list of class names currently being detected
        - count: number of active classes
        - message: informational message
    """
    try:
        # Get detector reference
        detector = get_detector()

        if detector is None:
            raise HTTPException(
                status_code=503,
                detail="Detector not initialized. Backend may still be starting up."
            )

        # Load active classes from database (same logic as backend startup)
        # First, ensure shadow fallback class exists
        db.ensure_shadow_class()

        # Get user-defined active classes (shadow class filtered out)
        active_classes = db.get_all_classes(active_only=True, include_shadow=False)

        if not active_classes:
            # No user-defined classes - include shadow class as fallback
            print("[Detector Sync] No user-defined classes found, using shadow fallback")
            active_classes = db.get_all_classes(active_only=True, include_shadow=True)

        # Extract class names
        class_names = [cls['name'] for cls in active_classes]

        # Update detector (thread-safe)
        detector.update_classes(class_names)

        # Determine status
        status = "success"
        message = f"Detector updated with {len(class_names)} active class(es)"

        if len(class_names) == 1 and db.is_shadow_class(class_names[0]):
            status = "warning"
            message = "No user-defined classes active. Using shadow fallback."

        return {
            "status": status,
            "classes": class_names,
            "count": len(class_names),
            "message": message
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[Detector Sync Error] {e}")
        raise HTTPException(status_code=500, detail=f"Failed to sync detector: {str(e)}")


# === GROUP MANAGEMENT ENDPOINTS ===

class GroupCreateRequest(BaseModel):
    group_name: str
    description: Optional[str] = None

class GroupUpdateRequest(BaseModel):
    group_name: Optional[str] = None
    description: Optional[str] = None

class GroupAddObjectsRequest(BaseModel):
    object_ids: List[int]

@app.get("/api/groups")
async def get_all_groups():
    """Get all object groups"""
    try:
        groups = db.get_all_groups()
        return groups
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/groups/{group_id}")
async def get_group(group_id: int):
    """Get a specific group by ID"""
    try:
        group = db.get_group(group_id)
        if group is None:
            raise HTTPException(status_code=404, detail=f"Group {group_id} not found")
        return group
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/groups/by-name/{group_name}")
async def get_group_by_name(group_name: str):
    """Get a specific group by name"""
    try:
        group = db.get_group_by_name(group_name)
        if group is None:
            raise HTTPException(status_code=404, detail=f"Group '{group_name}' not found")
        return group
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/groups/{group_id}/members")
async def get_group_members(group_id: int):
    """Get all objects in a group"""
    try:
        group = db.get_group(group_id)
        if group is None:
            raise HTTPException(status_code=404, detail=f"Group {group_id} not found")

        members = db.get_group_members(group_id)
        return {
            "group": group,
            "members": members,
            "count": len(members)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/objects/{object_id}/groups")
async def get_object_groups(object_id: int):
    """Get all groups an object belongs to"""
    try:
        obj = db.get_object(object_id)
        if obj is None:
            raise HTTPException(status_code=404, detail=f"Object {object_id} not found")

        groups = db.get_object_groups(object_id)
        return {
            "object_id": object_id,
            "class_name": obj.get('class_name'),
            "groups": groups,
            "count": len(groups)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/groups")
async def create_group(request: GroupCreateRequest):
    """Create a new object group"""
    try:
        group_id = db.create_group(
            group_name=request.group_name,
            description=request.description
        )

        group = db.get_group(group_id)

        return group
    except Exception as e:
        if "UNIQUE constraint failed" in str(e):
            raise HTTPException(status_code=400, detail=f"Group '{request.group_name}' already exists")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/groups/{group_id}/members")
async def add_objects_to_group(group_id: int, request: GroupAddObjectsRequest):
    """Add objects to a group"""
    try:
        group = db.get_group(group_id)
        if group is None:
            raise HTTPException(status_code=404, detail=f"Group {group_id} not found")

        added_count = db.add_objects_to_group(group_id, request.object_ids)

        # If adding to a table group, remove from Unclassified
        if group.get('group_name', '').startswith('Table '):
            unclassified = db.get_group_by_name('Unclassified')
            if unclassified:
                db.remove_objects_from_group(unclassified['group_id'], request.object_ids)

        return {
            "status": "success",
            "group_id": group_id,
            "added_count": added_count
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/groups/{group_id}/members")
async def remove_objects_from_group(group_id: int, request: GroupAddObjectsRequest):
    """Remove objects from a group"""
    try:
        group = db.get_group(group_id)
        if group is None:
            raise HTTPException(status_code=404, detail=f"Group {group_id} not found")

        removed_count = db.remove_objects_from_group(group_id, request.object_ids)

        # If this was a table group, check if objects are now unassigned
        if group.get('group_name', '').startswith('Table '):
            # For each removed object, check if it's in any table
            unclassified_id = db.ensure_unclassified_table()
            objects_to_classify = []

            for obj_id in request.object_ids:
                # Get all groups for this object
                obj_groups = db.get_object_groups(obj_id)
                # Check if any are table groups
                has_table = any(g.get('group_name', '').startswith('Table ') for g in obj_groups)
                if not has_table:
                    objects_to_classify.append(obj_id)

            # Add unassigned objects to Unclassified
            if objects_to_classify:
                db.add_objects_to_group(unclassified_id, objects_to_classify)

        return {
            "status": "success",
            "group_id": group_id,
            "removed_count": removed_count
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/groups/{group_id}")
async def update_group(group_id: int, request: GroupUpdateRequest):
    """Update a group"""
    try:
        success = db.update_group(
            group_id=group_id,
            group_name=request.group_name,
            description=request.description
        )

        if not success:
            raise HTTPException(status_code=404, detail=f"Group {group_id} not found")

        group = db.get_group(group_id)

        return group
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/groups/{group_id}")
async def delete_group(group_id: int):
    """Delete a group (removes all memberships)"""
    try:
        group = db.get_group(group_id)
        if group is None:
            raise HTTPException(status_code=404, detail=f"Group {group_id} not found")

        success = db.delete_group(group_id)

        if success:
            return {"status": "success", "message": f"Group {group_id} deleted"}
        else:
            raise HTTPException(status_code=500, detail="Failed to delete group")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# === BEHAVIORAL EVENTS ENDPOINTS ===

@app.get("/api/events")
async def get_behavioral_events(
    limit: int = 100,
    event_type: Optional[str] = None,
    object_id: Optional[int] = None,
    since: Optional[str] = None
):
    """
    Get behavioral events (WINDOW_SHOPPED, CART_ABANDONED, PRODUCT_PURCHASED, MOVED).

    Query parameters:
    - limit: Max events to return (default 100)
    - event_type: Filter by type (WINDOW_SHOPPED, CART_ABANDONED, PRODUCT_PURCHASED, MOVED)
    - object_id: Filter by object ID
    - since: Filter events after this ISO timestamp
    """
    try:
        events = db.get_behavioral_events(
            limit=limit,
            event_type=event_type,
            object_id=object_id,
            since=since
        )
        return events
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/events/stats")
async def get_behavioral_event_stats():
    """Get statistics about behavioral events."""
    try:
        stats = db.get_behavioral_event_stats()
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/events/stream")
async def get_event_stream(since: Optional[str] = None):
    """
    Get new events since last check (for polling).

    Use the 'since' parameter with the timestamp of the last event you received.
    Returns events newer than that timestamp.
    """
    try:
        events = db.get_behavioral_events(limit=50, since=since)
        latest_timestamp = events[0]['timestamp'] if events else since
        return {
            "events": events,
            "latest_timestamp": latest_timestamp,
            "count": len(events)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/events")
async def clear_behavioral_events(before: Optional[str] = None):
    """
    Clear behavioral events.

    Query parameters:
    - before: Clear events before this ISO timestamp. If not provided, clears all.
    """
    try:
        db.clear_behavioral_events(before=before)
        return {"status": "success", "message": "Events cleared"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# === HELPER FUNCTIONS FOR INTEGRATION ===

def run_server(host: str = "127.0.0.1", port: int = 8000):
    print("=" * 70)
    print("VISUAL DATABASE API SERVER")
    print("=" * 70)
    print(f"\nStarting server at http://{host}:{port}")
    print(f"\nAPI Endpoints:")
    print(f"  - GET  /api/objects                - List all objects")
    print(f"  - GET  /api/objects/{{id}}           - Get specific object")
    print(f"  - GET  /api/objects/{{id}}/thumbnail - Get object thumbnail")
    print(f"  - GET  /api/objects/by-class/{{name}} - Get objects by class")
    print(f"  - GET  /api/objects/nearby         - Spatial query")
    print(f"  - GET  /api/stats/summary          - Database statistics")
    print(f"\nInteractive API docs:")
    print(f"  - http://{host}:{port}/docs")
    print(f"  - http://{host}:{port}/redoc")
    print("=" * 70)

    uvicorn.run(app, host=host, port=port, log_level="info")


# Convenience function to run in background thread
def start_server_background(host: str = "127.0.0.1", port: int = 8000):
    """Start the server in a background thread."""
    def run_server_thread():
        # Create new event loop for this thread
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        # Run uvicorn (it will use the current thread's event loop)
        uvicorn.run(app, host=host, port=port, log_level="info")

    server_thread = threading.Thread(
        target=run_server_thread,
        daemon=True
    )
    server_thread.start()

    # Wait a bit for the loop to be set
    import time
    time.sleep(0.5)

    return server_thread


if __name__ == "__main__":
    # Run server directly
    run_server()
