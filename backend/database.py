"""Database layer for object persistence and tracking"""

import sqlite3
import time
import json
from datetime import datetime
from typing import Optional, List, Dict, Tuple
import numpy as np
from io import BytesIO
from PIL import Image



class VisualDatabase:

    def __init__(self, db_path="visual_database.db", ema_alpha=0.25):
        self.db_path = db_path
        self.ema_alpha = ema_alpha  # Exponential Moving Average smoothing factor (0.0-1.0)
        self.conn = sqlite3.connect(db_path, check_same_thread=False, isolation_level="DEFERRED")
        self.conn.row_factory = sqlite3.Row

        self._create_tables()

        print(f"[OK] Database initialized: {db_path} (EMA alpha={ema_alpha:.2f})")

    def _create_tables(self):
        cursor = self.conn.cursor()

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS objects (
                object_id INTEGER PRIMARY KEY AUTOINCREMENT,
                class_name TEXT NOT NULL,
                avg_position_x REAL,
                avg_position_y REAL,
                avg_position_z REAL,
                first_seen TEXT,
                last_seen TEXT,
                detection_count INTEGER DEFAULT 1,
                avg_confidence REAL,
                thumbnail BLOB,
                thumbnail_updated TEXT,
                is_present INTEGER DEFAULT 1
            )
        """)

        cursor.execute("CREATE INDEX IF NOT EXISTS idx_class ON objects(class_name)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_position ON objects(avg_position_x, avg_position_y, avg_position_z)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_last_seen ON objects(last_seen)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_present ON objects(is_present)")

        # Detections table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS detections (
                detection_id INTEGER PRIMARY KEY AUTOINCREMENT,
                object_id INTEGER,
                timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
                confidence REAL,
                bbox_x INTEGER,
                bbox_y INTEGER,
                bbox_width INTEGER,
                bbox_height INTEGER,
                position_x REAL,
                position_y REAL,
                position_z REAL,
                FOREIGN KEY (object_id) REFERENCES objects (object_id)
            )
        """)

        # Indexes for detections table
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_object_detections ON detections(object_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_timestamp ON detections(timestamp)")

        # Regions table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS regions (
                region_id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT,
                x_min REAL, x_max REAL,
                y_min REAL, y_max REAL,
                z_min REAL, z_max REAL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Sessions table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                session_id INTEGER PRIMARY KEY AUTOINCREMENT,
                start_time TEXT,
                end_time TEXT,
                object_count INTEGER
            )
        """)

        # Classes table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS classes (
                class_id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                category TEXT,
                color TEXT,
                icon TEXT,
                description TEXT,
                is_active INTEGER DEFAULT 1,
                confidence_override REAL,
                distance_threshold REAL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Indexes for classes table
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_class_name ON classes(name)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_class_active ON classes(is_active)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_class_category ON classes(category)")

        # Add class_id to objects table if not exists (backward compatible migration)
        cursor.execute("PRAGMA table_info(objects)")
        columns = [row[1] for row in cursor.fetchall()]
        if 'class_id' not in columns:
            cursor.execute("ALTER TABLE objects ADD COLUMN class_id INTEGER REFERENCES classes(class_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_objects_class_id ON objects(class_id)")

        # Add movement tracking columns (backward compatible migration)
        cursor.execute("PRAGMA table_info(objects)")
        columns = [row[1] for row in cursor.fetchall()]

        # Home position (2D bbox center when first detected)
        if 'home_bbox_x' not in columns:
            cursor.execute("ALTER TABLE objects ADD COLUMN home_bbox_x INTEGER")
        if 'home_bbox_y' not in columns:
            cursor.execute("ALTER TABLE objects ADD COLUMN home_bbox_y INTEGER")
        if 'home_bbox_w' not in columns:
            cursor.execute("ALTER TABLE objects ADD COLUMN home_bbox_w INTEGER")
        if 'home_bbox_h' not in columns:
            cursor.execute("ALTER TABLE objects ADD COLUMN home_bbox_h INTEGER")

        # Movement state
        if 'is_moved' not in columns:
            cursor.execute("ALTER TABLE objects ADD COLUMN is_moved INTEGER DEFAULT 0")
        if 'was_ever_moved' not in columns:
            cursor.execute("ALTER TABLE objects ADD COLUMN was_ever_moved INTEGER DEFAULT 0")

        # Behavioral state (NONE, PRESENT, MOVED, WINDOW_SHOPPED, CART_ABANDONED, PRODUCT_PURCHASED)
        if 'behavioral_state' not in columns:
            cursor.execute("ALTER TABLE objects ADD COLUMN behavioral_state TEXT DEFAULT 'NONE'")

        # Behavioral timestamps
        if 'moved_time' not in columns:
            cursor.execute("ALTER TABLE objects ADD COLUMN moved_time TEXT")
        if 'returned_time' not in columns:
            cursor.execute("ALTER TABLE objects ADD COLUMN returned_time TEXT")


        # Object Groups table for grouping/tagging multiple objects
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS object_groups (
                group_id INTEGER PRIMARY KEY AUTOINCREMENT,
                group_name TEXT NOT NULL UNIQUE,
                description TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT
            )
        """)

        # Object Group Members junction table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS object_group_members (
                membership_id INTEGER PRIMARY KEY AUTOINCREMENT,
                group_id INTEGER NOT NULL,
                object_id INTEGER NOT NULL,
                added_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (group_id) REFERENCES object_groups(group_id) ON DELETE CASCADE,
                FOREIGN KEY (object_id) REFERENCES objects(object_id) ON DELETE CASCADE,
                UNIQUE(group_id, object_id)
            )
        """)

        # Indexes for object_groups tables
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_group_name ON object_groups(group_name)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_group_members_group ON object_group_members(group_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_group_members_object ON object_group_members(object_id)")


        self.conn.commit()

    def _calculate_3d_distance(self, pos1: Tuple[float, float, float],
                               pos2: Tuple[float, float, float]) -> float:
        x1, y1, z1 = pos1
        x2, y2, z2 = pos2
        return np.sqrt((x2 - x1)**2 + (y2 - y1)**2 + (z2 - z1)**2)


    def _image_to_blob(self, image: np.ndarray) -> bytes:
        pil_img = Image.fromarray(image)
        buffer = BytesIO()
        pil_img.save(buffer, format='PNG')
        return buffer.getvalue()

    def _blob_to_image(self, blob: bytes) -> np.ndarray:
        buffer = BytesIO(blob)
        pil_img = Image.open(buffer)
        return np.array(pil_img)


    def _extract_thumbnail(self, rgb_frame: np.ndarray, bbox: Tuple[int, int, int, int],
                          target_size: Tuple[int, int] = (128, 128)) -> bytes:
        """
        Extract thumbnail from bbox region.
        Returns: thumbnail_blob
        """
        x, y, w, h = bbox

        # Ensure bbox is within image bounds
        h_img, w_img = rgb_frame.shape[:2]
        x = max(0, x)
        y = max(0, y)
        w = min(w, w_img - x)
        h = min(h, h_img - y)

        # Crop object
        cropped = rgb_frame[y:y+h, x:x+w]

        # Resize to thumbnail
        pil_img = Image.fromarray(cropped)
        pil_img.thumbnail(target_size, Image.Resampling.LANCZOS)

        # Convert to bytes
        buffer = BytesIO()
        pil_img.save(buffer, format='PNG')
        thumbnail_blob = buffer.getvalue()

        return thumbnail_blob


    def create_object(self, detection: Dict, rgb_frame: Optional[np.ndarray] = None) -> Optional[int]:
        cursor = self.conn.cursor()

        # Validate center_3d - try to use it if available, otherwise use last known position
        center_3d = detection.get('center_3d')
        last_known_3d = detection.get('last_known_position_3d')
        
        # Prefer current position, fallback to last known
        if center_3d is not None and all(v is not None for v in center_3d):
            x3d, y3d, z3d = center_3d
            position_source = "current"
        elif last_known_3d is not None and all(v is not None for v in last_known_3d):
            x3d, y3d, z3d = last_known_3d
            position_source = "last_known"
        else:
            # No position available - cannot create object yet
            print(f"Warning: Cannot create object '{detection['class_name']}' without any valid 3D position (waiting for depth)")
            return None

        # Extract thumbnail if frame provided
        thumbnail = None
        if rgb_frame is not None and 'bbox' in detection:
            try:
                thumbnail = self._extract_thumbnail(rgb_frame, detection['bbox'])
            except Exception as e:
                print(f"Warning: Failed to extract thumbnail: {e}")

        # Look up class_id from class name
        class_id = None
        class_obj = self.get_class_by_name(detection['class_name'])
        if class_obj:
            class_id = class_obj['class_id']

        # Insert object
        now = datetime.now().isoformat()
        cursor.execute("""
            INSERT INTO objects (
                class_name, class_id, avg_position_x, avg_position_y, avg_position_z,
                first_seen, last_seen, detection_count, avg_confidence,
                thumbnail, thumbnail_updated
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            detection['class_name'],
            class_id,
            x3d, y3d, z3d,
            now, now,
            1,
            detection['confidence'],
            thumbnail,
            now if thumbnail else None
        ))

        object_id = cursor.lastrowid

        # Record detection event (with actual center_3d, may be None)
        self._record_detection(object_id, detection)

        self.conn.commit()
        
        if position_source == "last_known":
            print(f"  ℹ Created object {object_id} using last known position (depth unavailable)")

        return object_id

    def update_object(self, object_id: int, detection: Dict,
                     rgb_frame: Optional[np.ndarray] = None):
        cursor = self.conn.cursor()

        # Get current object data
        cursor.execute("SELECT * FROM objects WHERE object_id = ?", (object_id,))
        row = cursor.fetchone()
        if row is None:
            print(f"Warning: Object {object_id} not found in database")
            return
        obj = dict(row)

        # Try to get valid 3D position (current or last known)
        center_3d = detection.get('center_3d')
        last_known_3d = detection.get('last_known_position_3d')
        
        # Determine which position to use
        if center_3d is not None and all(v is not None for v in center_3d):
            x3d, y3d, z3d = center_3d
            position_available = True
        elif last_known_3d is not None and all(v is not None for v in last_known_3d):
            x3d, y3d, z3d = last_known_3d
            position_available = True
            # Note: using last known position, depth temporarily unavailable
        else:
            # No position at all - just update last_seen and detection count
            cursor.execute("""
                UPDATE objects SET last_seen = ?, detection_count = detection_count + 1
                WHERE object_id = ?
            """, (datetime.now().isoformat(), object_id))
            self._record_detection(object_id, detection)
            self.conn.commit()
            return

        # Update position (Exponential Moving Average for smooth tracking)
        count = obj['detection_count']

        # Calculate new averages using EMA
        if obj['avg_position_x'] is None:
            new_avg_x, new_avg_y, new_avg_z = x3d, y3d, z3d
        else:
            new_avg_x = self.ema_alpha * x3d + (1 - self.ema_alpha) * obj['avg_position_x']
            new_avg_y = self.ema_alpha * y3d + (1 - self.ema_alpha) * obj['avg_position_y']
            new_avg_z = self.ema_alpha * z3d + (1 - self.ema_alpha) * obj['avg_position_z']

        # Update confidence average using EMA
        if obj['avg_confidence'] is None:
            new_avg_conf = detection['confidence']
        else:
            new_avg_conf = self.ema_alpha * detection['confidence'] + (1 - self.ema_alpha) * obj['avg_confidence']

        # Update thumbnail if rgb_frame provided (used for periodic updates)
        thumbnail_update = ""
        thumbnail_params = []
        if rgb_frame is not None:
            try:
                thumbnail = self._extract_thumbnail(rgb_frame, detection['bbox'])
                thumbnail_update = ", thumbnail = ?, thumbnail_updated = ?"
                thumbnail_params = [thumbnail, datetime.now().isoformat()]
            except Exception as e:
                print(f"Warning: Failed to update thumbnail: {e}")

        # Update object
        now = datetime.now().isoformat()
        cursor.execute(f"""
            UPDATE objects SET
                avg_position_x = ?,
                avg_position_y = ?,
                avg_position_z = ?,
                last_seen = ?,
                detection_count = ?,
                avg_confidence = ?
                {thumbnail_update}
            WHERE object_id = ?
        """, [
            new_avg_x, new_avg_y, new_avg_z,
            now,
            count + 1,
            new_avg_conf
        ] + thumbnail_params + [object_id])

        # Record detection event (with actual center_3d, may be None)
        self._record_detection(object_id, detection)

        self.conn.commit()

    def _record_detection(self, object_id: int, detection: Dict):
        cursor = self.conn.cursor()

        # Extract bbox
        bbox = detection.get('bbox', (None, None, None, None))
        x, y, w, h = bbox if bbox is not None else (None, None, None, None)

        # Extract 3D position (handle None case)
        pos_3d = detection.get('center_3d')
        x3d, y3d, z3d = pos_3d if pos_3d is not None else (None, None, None)

        cursor.execute("""
            INSERT INTO detections (
                object_id, confidence,
                bbox_x, bbox_y, bbox_width, bbox_height,
                position_x, position_y, position_z
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            object_id, detection['confidence'],
            x, y, w, h,
            x3d, y3d, z3d
        ))


    def get_object(self, object_id: int) -> Optional[Dict]:
        cursor = self.conn.cursor()
        cursor.execute("SELECT * FROM objects WHERE object_id = ?", (object_id,))
        row = cursor.fetchone()
        return dict(row) if row else None

    def get_all_objects(self, present_only: bool = False,
                       class_name: Optional[str] = None,
                       limit: int = 100) -> List[Dict]:
        cursor = self.conn.cursor()

        query = "SELECT * FROM objects WHERE 1=1"
        params = []

        if present_only:
            query += " AND is_present = 1"

        if class_name:
            query += " AND class_name = ?"
            params.append(class_name)

        query += " ORDER BY last_seen DESC LIMIT ?"
        params.append(limit)

        cursor.execute(query, params)
        return [dict(row) for row in cursor.fetchall()]

    def get_objects_by_class(self, class_name: str, present_only: bool = False) -> List[Dict]:
        return self.get_all_objects(present_only=present_only, class_name=class_name)

    def get_objects_nearby(self, x: float, y: float, z: float,
                          radius: float = 500.0) -> List[Dict]:
        cursor = self.conn.cursor()

        all_objects = [dict(row) for row in cursor.fetchall()]

        # Filter by distance
        nearby = []
        for obj in all_objects:
            pos = (obj['avg_position_x'], obj['avg_position_y'], obj['avg_position_z'])
            distance = self._calculate_3d_distance((x, y, z), pos)
            if distance <= radius:
                obj['distance'] = distance
                nearby.append(obj)

        # Sort by distance
        nearby.sort(key=lambda x: x['distance'])

        return nearby

    def get_statistics(self) -> Dict:
        cursor = self.conn.cursor()

        # Total objects
        cursor.execute("SELECT COUNT(*) as count FROM objects")
        total_objects = cursor.fetchone()['count']

        # Present objects
        cursor.execute("SELECT COUNT(*) as count FROM objects WHERE is_present = 1")
        present_objects = cursor.fetchone()['count']

        # Total detections
        cursor.execute("SELECT COUNT(*) as count FROM detections")
        total_detections = cursor.fetchone()['count']

        # Class distribution
        cursor.execute("""
            SELECT class_name, COUNT(*) as count
            FROM objects
            GROUP BY class_name
        """)
        class_distribution = {row['class_name']: row['count'] for row in cursor.fetchall()}

        return {
            'total_objects': total_objects,
            'present_objects': present_objects,
            'total_detections': total_detections,
            'class_distribution': class_distribution
        }

    def mark_absent_objects(self, timeout_seconds: float = 30.0):
        """
        Mark objects as absent if not seen for timeout_seconds.
        NOTE: With per-view tracking, this is handled by ViewObjectTracker.
        This method is kept for backwards compatibility.
        """
        cursor = self.conn.cursor()
        threshold_time = datetime.fromtimestamp(time.time() - timeout_seconds).isoformat()

        cursor.execute("""
            UPDATE objects SET is_present = 0
            WHERE last_seen < ? AND is_present = 1
        """, (threshold_time,))

        self.conn.commit()
        return cursor.rowcount

    def mark_object_absent(self, object_id: int):
        """
        Mark a specific object as absent.

        Args:
            object_id: Database object ID to mark as absent
        """
        cursor = self.conn.cursor()
        cursor.execute("""
            UPDATE objects SET is_present = 0
            WHERE object_id = ?
        """, (object_id,))
        self.conn.commit()
        return cursor.rowcount > 0

    def mark_object_present(self, object_id: int, detection: Optional[Dict] = None, rgb_frame: Optional[np.ndarray] = None):
        """
        Mark a specific object as present and optionally update its data.

        Args:
            object_id: Database object ID to mark as present
            detection: Optional detection dict to update position/confidence
            rgb_frame: Optional RGB frame for thumbnail update
        """
        cursor = self.conn.cursor()

        if detection is None:
            # Just mark as present
            cursor.execute("""
                UPDATE objects SET is_present = 1, last_seen = ?
                WHERE object_id = ?
            """, (datetime.now().isoformat(), object_id))
            self.conn.commit()
            return cursor.rowcount > 0

        # Mark present and update with detection data
        cursor.execute("SELECT * FROM objects WHERE object_id = ?", (object_id,))
        row = cursor.fetchone()
        if row is None:
            return False

        obj = dict(row)

        # Try to get valid 3D position (current or last known)
        center_3d = detection.get('center_3d')
        last_known_3d = detection.get('last_known_position_3d')
        
        # Determine which position to use
        if center_3d is not None and all(v is not None for v in center_3d):
            x3d, y3d, z3d = center_3d
            position_available = True
        elif last_known_3d is not None and all(v is not None for v in last_known_3d):
            x3d, y3d, z3d = last_known_3d
            position_available = True
        else:
            # No valid 3D position - just update last_seen and mark present
            cursor.execute("""
                UPDATE objects SET last_seen = ?, is_present = 1, detection_count = detection_count + 1
                WHERE object_id = ?
            """, (datetime.now().isoformat(), object_id))
            self._record_detection(object_id, detection)
            self.conn.commit()
            return True

        # Update position using EMA
        count = obj['detection_count']

        if obj['avg_position_x'] is None:
            new_avg_x, new_avg_y, new_avg_z = x3d, y3d, z3d
        else:
            new_avg_x = self.ema_alpha * x3d + (1 - self.ema_alpha) * obj['avg_position_x']
            new_avg_y = self.ema_alpha * y3d + (1 - self.ema_alpha) * obj['avg_position_y']
            new_avg_z = self.ema_alpha * z3d + (1 - self.ema_alpha) * obj['avg_position_z']

        # Update confidence using EMA
        if obj['avg_confidence'] is None:
            new_avg_conf = detection['confidence']
        else:
            new_avg_conf = self.ema_alpha * detection['confidence'] + (1 - self.ema_alpha) * obj['avg_confidence']

        # Update object
        now = datetime.now().isoformat()
        cursor.execute("""
            UPDATE objects SET
                avg_position_x = ?,
                avg_position_y = ?,
                avg_position_z = ?,
                last_seen = ?,
                detection_count = ?,
                avg_confidence = ?,
                is_present = 1
            WHERE object_id = ?
        """, [
            new_avg_x, new_avg_y, new_avg_z,
            now,
            count + 1,
            new_avg_conf,
            object_id
        ])

        # Record detection event (with actual center_3d, may be None)
        self._record_detection(object_id, detection)

        self.conn.commit()
        return True

    def delete_object(self, object_id: int):
        cursor = self.conn.cursor()
        cursor.execute("DELETE FROM objects WHERE object_id = ?", (object_id,))
        self.conn.commit()

    # === MOVEMENT TRACKING METHODS ===

    def set_home_position(self, object_id: int, bbox: Tuple[int, int, int, int]):
        """
        Set the home position (initial bounding box) for an object.
        Called when object is first detected (ENTRY event).

        Args:
            object_id: Database object ID
            bbox: Initial bounding box (x, y, w, h)
        """
        cursor = self.conn.cursor()
        x, y, w, h = bbox
        cursor.execute("""
            UPDATE objects SET
                home_bbox_x = ?,
                home_bbox_y = ?,
                home_bbox_w = ?,
                home_bbox_h = ?,
                behavioral_state = 'PRESENT'
            WHERE object_id = ?
        """, (x, y, w, h, object_id))
        self.conn.commit()

    def update_movement_state(self, object_id: int, is_moved: bool,
                              behavioral_state: str = None):
        """
        Update movement state for an object.

        Args:
            object_id: Database object ID
            is_moved: Whether the object is currently moved from home
            behavioral_state: New behavioral state (optional)
        """
        cursor = self.conn.cursor()
        now = datetime.now().isoformat()

        if behavioral_state:
            if behavioral_state == 'MOVED' and is_moved:
                # Record moved time
                cursor.execute("""
                    UPDATE objects SET
                        is_moved = 1,
                        was_ever_moved = 1,
                        behavioral_state = ?,
                        moved_time = ?
                    WHERE object_id = ?
                """, (behavioral_state, now, object_id))
            elif behavioral_state == 'CART_ABANDONED':
                # Record returned time
                cursor.execute("""
                    UPDATE objects SET
                        is_moved = 0,
                        behavioral_state = ?,
                        returned_time = ?
                    WHERE object_id = ?
                """, (behavioral_state, now, object_id))
            else:
                cursor.execute("""
                    UPDATE objects SET
                        is_moved = ?,
                        behavioral_state = ?
                    WHERE object_id = ?
                """, (1 if is_moved else 0, behavioral_state, object_id))
        else:
            cursor.execute("""
                UPDATE objects SET is_moved = ?
                WHERE object_id = ?
            """, (1 if is_moved else 0, object_id))

        self.conn.commit()

    def set_behavioral_state(self, object_id: int, state: str):
        """
        Set the behavioral state for an object.

        Args:
            object_id: Database object ID
            state: Behavioral state (NONE, PRESENT, MOVED, WINDOW_SHOPPED,
                   CART_ABANDONED, PRODUCT_PURCHASED)
        """
        cursor = self.conn.cursor()
        cursor.execute("""
            UPDATE objects SET behavioral_state = ?
            WHERE object_id = ?
        """, (state, object_id))
        self.conn.commit()

    def get_home_position(self, object_id: int) -> Optional[Tuple[int, int, int, int]]:
        """
        Get the home position (initial bounding box) for an object.

        Returns:
            (x, y, w, h) tuple or None if not set
        """
        cursor = self.conn.cursor()
        cursor.execute("""
            SELECT home_bbox_x, home_bbox_y, home_bbox_w, home_bbox_h
            FROM objects WHERE object_id = ?
        """, (object_id,))
        row = cursor.fetchone()
        if row and row['home_bbox_x'] is not None:
            return (row['home_bbox_x'], row['home_bbox_y'],
                    row['home_bbox_w'], row['home_bbox_h'])
        return None

    def get_movement_statistics(self) -> Dict:
        """Get statistics about object movement states"""
        cursor = self.conn.cursor()

        # Count by behavioral state
        cursor.execute("""
            SELECT behavioral_state, COUNT(*) as count
            FROM objects
            GROUP BY behavioral_state
        """)
        state_counts = {row['behavioral_state']: row['count'] for row in cursor.fetchall()}

        # Count moved objects
        cursor.execute("SELECT COUNT(*) as count FROM objects WHERE is_moved = 1")
        moved_count = cursor.fetchone()['count']

        # Count objects that were ever moved
        cursor.execute("SELECT COUNT(*) as count FROM objects WHERE was_ever_moved = 1")
        ever_moved_count = cursor.fetchone()['count']

        return {
            'moved_count': moved_count,
            'ever_moved_count': ever_moved_count,
            'behavioral_states': state_counts
        }

    # === CLASS MANAGEMENT METHODS ===

    def create_class(self, name: str, category: Optional[str] = None,
                    color: Optional[str] = None, icon: Optional[str] = None,
                    description: Optional[str] = None,
                    confidence_override: Optional[float] = None,
                    distance_threshold: Optional[float] = None) -> int:
        """Create a new class definition"""
        cursor = self.conn.cursor()

        now = datetime.now().isoformat()
        cursor.execute("""
            INSERT INTO classes (
                name, category, color, icon, description,
                confidence_override, distance_threshold,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (name, category, color, icon, description,
              confidence_override, distance_threshold, now, now))

        class_id = cursor.lastrowid
        self.conn.commit()

        # Update existing objects with this class name
        cursor.execute("""
            UPDATE objects SET class_id = ? WHERE class_name = ? AND class_id IS NULL
        """, (class_id, name))
        self.conn.commit()

        return class_id

    def get_class(self, class_id: int) -> Optional[Dict]:
        """Get a class by ID"""
        cursor = self.conn.cursor()
        cursor.execute("SELECT * FROM classes WHERE class_id = ?", (class_id,))
        row = cursor.fetchone()
        return dict(row) if row else None

    def get_class_by_name(self, name: str) -> Optional[Dict]:
        """Get a class by name"""
        cursor = self.conn.cursor()
        cursor.execute("SELECT * FROM classes WHERE name = ?", (name,))
        row = cursor.fetchone()
        return dict(row) if row else None

    def get_all_classes(self, active_only: bool = False,
                       category: Optional[str] = None,
                       include_shadow: bool = False) -> List[Dict]:
        """Get all classes with optional filters"""
        cursor = self.conn.cursor()

        query = "SELECT * FROM classes WHERE 1=1"
        params = []

        # Always filter out shadow class unless explicitly requested
        if not include_shadow:
            query += " AND name != '__system_shadow_fallback__'"

        if active_only:
            query += " AND is_active = 1"

        if category:
            query += " AND category = ?"
            params.append(category)

        query += " ORDER BY name ASC"

        cursor.execute(query, params)
        return [dict(row) for row in cursor.fetchall()]

    def is_shadow_class(self, class_name: str) -> bool:
        """Check if a class name is the shadow fallback class"""
        return class_name == '__system_shadow_fallback__'

    def update_class(self, class_id: int, **kwargs) -> bool:
        """Update a class (supports partial updates)"""
        cursor = self.conn.cursor()

        # Build dynamic UPDATE query
        allowed_fields = ['name', 'category', 'color', 'icon', 'description',
                         'is_active', 'confidence_override', 'distance_threshold']
        updates = []
        values = []

        for field, value in kwargs.items():
            if field in allowed_fields:
                updates.append(f"{field} = ?")
                values.append(value)

        if not updates:
            return False

        # Add updated_at timestamp
        updates.append("updated_at = ?")
        values.append(datetime.now().isoformat())
        values.append(class_id)

        query = f"UPDATE classes SET {', '.join(updates)} WHERE class_id = ?"
        cursor.execute(query, values)
        self.conn.commit()

        return cursor.rowcount > 0

    def delete_class(self, class_id: int, cascade: bool = False) -> bool:
        """
        Delete a class
        If cascade=True, also deletes all objects with this class
        If cascade=False, sets class_id to NULL on objects (default)
        """
        cursor = self.conn.cursor()

        # Prevent deletion of shadow class
        cls = self.get_class(class_id)
        if cls and self.is_shadow_class(cls['name']):
            raise ValueError("Cannot delete system shadow class")

        if cascade:
            # Delete objects first (CASCADE handled by FK constraint)
            cursor.execute("DELETE FROM objects WHERE class_id = ?", (class_id,))
        else:
            # Unlink objects
            cursor.execute("UPDATE objects SET class_id = NULL WHERE class_id = ?", (class_id,))

        cursor.execute("DELETE FROM classes WHERE class_id = ?", (class_id,))
        self.conn.commit()

        return cursor.rowcount > 0

    def bulk_create_classes(self, classes: List[Dict]) -> List[int]:
        """Bulk create multiple classes"""
        class_ids = []
        for cls in classes:
            try:
                class_id = self.create_class(**cls)
                class_ids.append(class_id)
            except sqlite3.IntegrityError:
                # Class already exists, skip
                existing = self.get_class_by_name(cls['name'])
                if existing:
                    class_ids.append(existing['class_id'])
        return class_ids

    def ensure_shadow_class(self) -> int:
        """
        Ensure shadow fallback class exists. This is a hidden class that prevents
        the system from failing when no user classes are defined. It detects an
        object that will never realistically be found.
        """
        shadow_name = '__system_shadow_fallback__'

        # Check if shadow class already exists
        existing = self.get_class_by_name(shadow_name)
        if existing:
            return existing['class_id']

        # Create shadow class
        try:
            class_id = self.create_class(
                name=shadow_name,
                category='__system__',
                color='#000000',
                icon='',
                description='System fallback class - do not delete',
                distance_threshold=150.0
            )
            print(f"✓ Created shadow fallback class (hidden from UI)")
            return class_id
        except sqlite3.IntegrityError:
            # Race condition - another process created it
            existing = self.get_class_by_name(shadow_name)
            return existing['class_id'] if existing else None


    def get_class_statistics(self, class_id: int) -> Dict:
        """Get statistics for a specific class"""
        cursor = self.conn.cursor()

        # Count objects
        cursor.execute("""
            SELECT COUNT(*) as count,
                   COUNT(CASE WHEN is_present = 1 THEN 1 END) as present_count
            FROM objects WHERE class_id = ?
        """, (class_id,))
        counts = cursor.fetchone()

        # Total detections
        cursor.execute("""
            SELECT COUNT(*) as detection_count
            FROM detections d
            JOIN objects o ON d.object_id = o.object_id
            WHERE o.class_id = ?
        """, (class_id,))
        detection_count = cursor.fetchone()['detection_count']

        # Average confidence
        cursor.execute("""
            SELECT AVG(avg_confidence) as avg_conf
            FROM objects WHERE class_id = ?
        """, (class_id,))
        avg_conf = cursor.fetchone()['avg_conf']

        return {
            'total_objects': counts['count'],
            'present_objects': counts['present_count'],
            'total_detections': detection_count,
            'average_confidence': avg_conf
        }

    # === GROUP MANAGEMENT METHODS ===

    def ensure_unclassified_table(self) -> int:
        """
        Ensure the Unclassified table exists and return its ID.
        This is the default table for objects not assigned to any other table.

        Returns:
            group_id of the Unclassified table
        """
        unclassified_name = "Unclassified"

        # Check if Unclassified table exists
        existing = self.get_group_by_name(unclassified_name)
        if existing:
            return existing['group_id']

        # Create Unclassified table
        try:
            group_id = self.create_group(
                unclassified_name,
                description="Default table for unassigned objects"
            )
            print(f"✓ Created Unclassified table (ID {group_id})")
            return group_id
        except Exception as e:
            # Race condition - another process created it
            existing = self.get_group_by_name(unclassified_name)
            return existing['group_id'] if existing else None

    def assign_unclassified_objects_to_table(self) -> int:
        """
        Find all objects not in any table group and assign them to Unclassified.

        Returns:
            Number of objects assigned to Unclassified
        """
        cursor = self.conn.cursor()

        # Ensure Unclassified table exists
        unclassified_id = self.ensure_unclassified_table()

        # Get all objects
        cursor.execute("SELECT object_id FROM objects")
        all_objects = [row['object_id'] for row in cursor.fetchall()]

        # Get objects already in table groups (groups starting with "Table" or "Unclassified")
        cursor.execute("""
            SELECT DISTINCT ogm.object_id
            FROM object_group_members ogm
            JOIN object_groups og ON ogm.group_id = og.group_id
            WHERE og.group_name LIKE 'Table %' OR og.group_name = 'Unclassified'
        """)
        classified_objects = [row['object_id'] for row in cursor.fetchall()]

        # Find unclassified objects
        unclassified_objects = [obj_id for obj_id in all_objects if obj_id not in classified_objects]

        if unclassified_objects:
            # Assign to Unclassified table
            added = self.add_objects_to_group(unclassified_id, unclassified_objects)
            print(f"✓ Assigned {added} object(s) to Unclassified table")
            return added

        return 0

    def create_group(self, group_name: str, description: Optional[str] = None) -> int:
        """
        Create a new object group.

        Args:
            group_name: Unique name for the group
            description: Optional description

        Returns:
            group_id of the created group
        """
        cursor = self.conn.cursor()
        now = datetime.now().isoformat()
        cursor.execute("""
            INSERT INTO object_groups (group_name, description, created_at, updated_at)
            VALUES (?, ?, ?, ?)
        """, (group_name, description, now, now))

        group_id = cursor.lastrowid
        self.conn.commit()
        return group_id

    def add_objects_to_group(self, group_id: int, object_ids: List[int]) -> int:
        """
        Add multiple objects to a group.

        Args:
            group_id: ID of the group
            object_ids: List of object IDs to add

        Returns:
            Number of objects successfully added
        """
        cursor = self.conn.cursor()
        added_count = 0
        now = datetime.now().isoformat()

        for object_id in object_ids:
            try:
                cursor.execute("""
                    INSERT INTO object_group_members (group_id, object_id, added_at)
                    VALUES (?, ?, ?)
                """, (group_id, object_id, now))
                added_count += 1
            except sqlite3.IntegrityError:
                # Object already in group, skip
                pass

        self.conn.commit()
        return added_count

    def remove_objects_from_group(self, group_id: int, object_ids: List[int]) -> int:
        """
        Remove objects from a group.

        Args:
            group_id: ID of the group
            object_ids: List of object IDs to remove

        Returns:
            Number of objects successfully removed
        """
        cursor = self.conn.cursor()
        placeholders = ','.join('?' * len(object_ids))
        cursor.execute(f"""
            DELETE FROM object_group_members
            WHERE group_id = ? AND object_id IN ({placeholders})
        """, [group_id] + object_ids)

        removed_count = cursor.rowcount
        self.conn.commit()
        return removed_count

    def get_group(self, group_id: int) -> Optional[Dict]:
        """Get a group by ID."""
        cursor = self.conn.cursor()
        cursor.execute("SELECT * FROM object_groups WHERE group_id = ?", (group_id,))
        row = cursor.fetchone()
        return dict(row) if row else None

    def get_group_by_name(self, group_name: str) -> Optional[Dict]:
        """Get a group by name."""
        cursor = self.conn.cursor()
        cursor.execute("SELECT * FROM object_groups WHERE group_name = ?", (group_name,))
        row = cursor.fetchone()
        return dict(row) if row else None

    def get_all_groups(self) -> List[Dict]:
        """Get all groups."""
        cursor = self.conn.cursor()
        cursor.execute("SELECT * FROM object_groups ORDER BY group_name ASC")
        return [dict(row) for row in cursor.fetchall()]

    def get_group_members(self, group_id: int) -> List[Dict]:
        """
        Get all objects in a group.

        Args:
            group_id: ID of the group

        Returns:
            List of object dictionaries (excluding thumbnail for JSON compatibility)
        """
        cursor = self.conn.cursor()
        cursor.execute("""
            SELECT o.object_id, o.class_name, o.avg_position_x, o.avg_position_y,
                   o.avg_position_z, o.first_seen, o.last_seen, o.detection_count,
                   o.avg_confidence, o.thumbnail_updated, o.is_present, o.class_id,
                   m.added_at as group_added_at
            FROM objects o
            JOIN object_group_members m ON o.object_id = m.object_id
            WHERE m.group_id = ?
            ORDER BY m.added_at DESC
        """, (group_id,))
        return [dict(row) for row in cursor.fetchall()]

    def get_object_groups(self, object_id: int) -> List[Dict]:
        """
        Get all groups an object belongs to.

        Args:
            object_id: ID of the object

        Returns:
            List of group dictionaries
        """
        cursor = self.conn.cursor()
        cursor.execute("""
            SELECT g.*, m.added_at
            FROM object_groups g
            JOIN object_group_members m ON g.group_id = m.group_id
            WHERE m.object_id = ?
            ORDER BY g.group_name ASC
        """, (object_id,))
        return [dict(row) for row in cursor.fetchall()]

    def delete_group(self, group_id: int) -> bool:
        """
        Delete a group and reassign objects to Unclassified if needed.

        Objects that are in other tables remain in those tables.
        Objects that are ONLY in this table are moved to Unclassified.

        Args:
            group_id: ID of the group to delete

        Returns:
            True if successful
        """
        cursor = self.conn.cursor()

        # Get the group name to check if it's a table group
        cursor.execute("SELECT group_name FROM object_groups WHERE group_id = ?", (group_id,))
        row = cursor.fetchone()
        if not row:
            return False

        group_name = row['group_name']

        # Get all objects in this group
        cursor.execute("SELECT object_id FROM object_group_members WHERE group_id = ?", (group_id,))
        object_ids = [row['object_id'] for row in cursor.fetchall()]

        # If this is a table group, check each object's table memberships
        if group_name.startswith('Table ') or group_name == 'Unclassified':
            if group_name != 'Unclassified' and object_ids:
                # For each object, check if it's in any other table groups
                objects_needing_unclassified = []

                for obj_id in object_ids:
                    # Count how many table groups this object is in (excluding this one)
                    cursor.execute("""
                        SELECT COUNT(*) as count
                        FROM object_group_members ogm
                        JOIN object_groups og ON ogm.group_id = og.group_id
                        WHERE ogm.object_id = ?
                        AND ogm.group_id != ?
                        AND (og.group_name LIKE 'Table %' OR og.group_name = 'Unclassified')
                    """, (obj_id, group_id))

                    count = cursor.fetchone()['count']

                    # If object is not in any other table, it needs to go to Unclassified
                    if count == 0:
                        objects_needing_unclassified.append(obj_id)

                # Add orphaned objects to Unclassified
                if objects_needing_unclassified:
                    unclassified_id = self.ensure_unclassified_table()
                    self.add_objects_to_group(unclassified_id, objects_needing_unclassified)
                    print(f"✓ Moved {len(objects_needing_unclassified)} object(s) from '{group_name}' to Unclassified")

                # Log objects staying in other tables
                objects_staying = len(object_ids) - len(objects_needing_unclassified)
                if objects_staying > 0:
                    print(f"✓ {objects_staying} object(s) remain in other tables")

        # Delete the group (CASCADE will remove all memberships)
        cursor.execute("DELETE FROM object_groups WHERE group_id = ?", (group_id,))
        self.conn.commit()
        return cursor.rowcount > 0

    def update_group(self, group_id: int, group_name: Optional[str] = None,
                    description: Optional[str] = None) -> bool:
        """
        Update group details.

        Args:
            group_id: ID of the group
            group_name: New name (optional)
            description: New description (optional)

        Returns:
            True if successful
        """
        cursor = self.conn.cursor()
        updates = []
        values = []

        if group_name is not None:
            updates.append("group_name = ?")
            values.append(group_name)

        if description is not None:
            updates.append("description = ?")
            values.append(description)

        if not updates:
            return False

        updates.append("updated_at = ?")
        values.append(datetime.now().isoformat())
        values.append(group_id)

        query = f"UPDATE object_groups SET {', '.join(updates)} WHERE group_id = ?"
        cursor.execute(query, values)
        self.conn.commit()
        return cursor.rowcount > 0

    def close(self):
        if self.conn:
            self.conn.close()
            print("Database closed")


# Test code
if __name__ == "__main__":
    print("Visual Database Test")
    print("=" * 50)

    # Create test database
    db = VisualDatabase("test_visual_db.db")

    # Simulate some detections
    print("\nSimulating detections...")

    detection1 = {
        'class_name': 'coffee mug',
        'confidence': 0.85,
        'bbox': (100, 200, 80, 120),
        'center_2d': (140, 260),
        'center_3d': (150, -80, 1200)
    }

    obj_id_1 = db.create_object(detection1)
    print(f"Created object {obj_id_1}: coffee mug")

    # Mark as present
    db.mark_object_present(obj_id_1, detection1)
    print(f"Marked object {obj_id_1} as present")

    # Different object
    detection3 = {
        'class_name': 'laptop',
        'confidence': 0.92,
        'bbox': (500, 300, 400, 300),
        'center_2d': (700, 450),
        'center_3d': (200, 100, 1800)
    }

    obj_id_3 = db.create_object(detection3)
    print(f"Created object {obj_id_3}: laptop")

    # Get statistics
    stats = db.get_statistics()
    print(f"\nDatabase Statistics:")
    print(f"  Total objects: {stats['total_objects']}")
    print(f"  Present objects: {stats['present_objects']}")
    print(f"  Total detections: {stats['total_detections']}")
    print(f"  Classes: {stats['class_distribution']}")

    # Query tests
    print(f"\nAll objects:")
    for obj in db.get_all_objects():
        print(f"  {obj['object_id']}: {obj['class_name']} (detections: {obj['detection_count']})")

    print(f"\nObjects nearby (200, 0, 1500) within 500mm:")
    for obj in db.get_objects_nearby(200, 0, 1500, radius=500):
        print(f"  {obj['class_name']} - distance: {obj['distance']:.1f}mm")

    db.close()
    print("\n[OK] Test complete")
