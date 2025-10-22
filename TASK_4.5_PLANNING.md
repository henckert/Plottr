# TASK 4.5 - Session Management System

**Status**: 🚧 IN PROGRESS  
**Date**: October 22, 2025  
**Prerequisites**: TASK 4.4 Complete ✅  
**Estimated Time**: 6-8 hours

---

## 🎯 Objective

Build a complete session management system that allows users to create, view, and manage training sessions, matches, and other activities on sports pitches. Sessions are time-bound bookings of pitches with participant tracking and status management.

---

## 📋 Subtasks

### 4.5.1 - Session List Page (2 hours)
**Goal**: Create a browsable list of sessions with filtering and calendar view

**Implementation**:
1. Create `web/src/app/sessions/page.tsx` - Session list view
2. Features:
   - Card-based layout showing upcoming sessions
   - Calendar view (month/week/day)
   - Filter by:
     - Date range (today, this week, this month, custom)
     - Venue
     - Pitch
     - Session type (training, match, tournament, etc.)
     - Status (scheduled, ongoing, completed, cancelled)
   - Search by session name
   - Pagination (cursor-based)
3. Session cards display:
   - Session name
   - Venue & pitch name
   - Date/time range
   - Duration
   - Status badge
   - Quick actions (view, edit, cancel)
4. "Create Session" button → `/sessions/new`

**API Endpoints**:
- `GET /api/sessions?venue_id={id}&pitch_id={id}&start_date={date}&end_date={date}&status={status}&limit={n}&cursor={c}`

**Files**:
- `web/src/app/sessions/page.tsx` (NEW)
- `web/src/components/sessions/SessionCard.tsx` (NEW)
- `web/src/components/sessions/SessionCalendar.tsx` (NEW)

**Testing**:
- [ ] Sessions load and display correctly
- [ ] Calendar view switches (month/week/day)
- [ ] Filters work (date, venue, pitch, status)
- [ ] Search filters results
- [ ] Pagination loads more sessions
- [ ] Click session card navigates to detail
- [ ] Create button navigates to /sessions/new

---

### 4.5.2 - Session Creation Flow (3 hours)
**Goal**: Allow users to create new sessions with venue/pitch selection and time scheduling

**Implementation**:
1. Create `web/src/app/sessions/new/page.tsx` - Session creation form
2. Multi-step flow:
   - **Step 1**: Basic Info
     - Session name (required)
     - Session type (training, match, tournament, other)
     - Description (optional)
   - **Step 2**: Location
     - Select venue (dropdown with search)
     - Select pitch (dropdown filtered by venue)
     - Show selected pitch on map
   - **Step 3**: Schedule
     - Date picker
     - Start time
     - End time (or duration)
     - Recurring options (optional)
   - **Step 4**: Participants (optional)
     - Add participants/teams
     - Max capacity
     - Registration status
   - **Step 5**: Review & Submit
3. Validation:
   - Pitch availability check (no overlapping sessions)
   - Time range validation (end > start)
   - Venue operating hours check
4. Success → redirect to session detail

**API Endpoints**:
- `GET /api/pitches?venue_id={id}` - Get pitches for venue
- `GET /api/sessions/availability?pitch_id={id}&start_time={dt}&end_time={dt}` - Check conflicts
- `POST /api/sessions` - Create session

**Files**:
- `web/src/app/sessions/new/page.tsx` (NEW)
- `web/src/components/sessions/SessionForm.tsx` (NEW)
- `web/src/components/sessions/VenuePitchSelector.tsx` (NEW)
- `web/src/components/sessions/TimeSlotPicker.tsx` (NEW)

**Testing**:
- [ ] Multi-step form navigation works
- [ ] Venue selection loads pitches
- [ ] Pitch selection shows on map
- [ ] Date/time picker works
- [ ] Conflict detection prevents double booking
- [ ] Validation displays errors
- [ ] Submit creates session
- [ ] Success redirects to detail

---

### 4.5.3 - Session Detail & Edit Page (2 hours)
**Goal**: View and edit session details, manage participants, update status

**Implementation**:
1. Create `web/src/app/sessions/[id]/page.tsx` - Session detail view
2. Display sections:
   - **Header**: Session name, status badge, action buttons
   - **Info Card**: Type, description, venue, pitch
   - **Schedule Card**: Date, time range, duration
   - **Map Card**: Show pitch location and boundary
   - **Participants Card**: List of participants/teams
   - **Status Timeline**: Created → Scheduled → Ongoing → Completed
3. Actions:
   - Edit session (reuse creation form)
   - Cancel session (with confirmation)
   - Start session (change status to ongoing)
   - Complete session (change status to completed)
   - Add/remove participants
4. Edit mode:
   - Use same form components as creation
   - Pre-populate with current data
   - Validate changes (no conflicts)
   - Submit → PUT /api/sessions/{id}

**API Endpoints**:
- `GET /api/sessions/{id}` - Get session details
- `PUT /api/sessions/{id}` - Update session (with If-Match)
- `DELETE /api/sessions/{id}` - Delete session
- `PATCH /api/sessions/{id}/status` - Update status

**Files**:
- `web/src/app/sessions/[id]/page.tsx` (NEW)
- `web/src/components/sessions/SessionDetail.tsx` (NEW)
- `web/src/components/sessions/SessionActions.tsx` (NEW)
- `web/src/components/sessions/ParticipantsList.tsx` (NEW)

**Testing**:
- [ ] Session details load correctly
- [ ] Map shows pitch location
- [ ] Edit button opens form with data
- [ ] Update saves changes
- [ ] Cancel button works with confirmation
- [ ] Status change buttons work
- [ ] Participant management works
- [ ] Timeline displays correctly

---

### 4.5.4 - Calendar Integration & Enhancements (1 hour)
**Goal**: Add calendar view with drag-and-drop rescheduling

**Implementation**:
1. Enhance `SessionCalendar` component:
   - Monthly calendar grid
   - Sessions displayed on dates
   - Color-coded by status/type
   - Hover shows session details
   - Click opens session detail
2. Drag-and-drop rescheduling:
   - Drag session to new date/time
   - Validate new time slot
   - Show conflict warnings
   - Confirm reschedule
   - Update via API
3. Week/Day views:
   - Time-slot grid (e.g., 6am-10pm)
   - Sessions shown as blocks
   - Duration visible
   - Drag to resize (change duration)

**Libraries**:
- Consider using `react-big-calendar` or `fullcalendar`
- Or build custom with `date-fns` for date manipulation

**Files**:
- `web/src/components/sessions/SessionCalendar.tsx` (ENHANCE)
- `web/src/components/sessions/CalendarDayView.tsx` (NEW)
- `web/src/components/sessions/CalendarWeekView.tsx` (NEW)

**Testing**:
- [ ] Calendar displays sessions correctly
- [ ] Drag-and-drop moves sessions
- [ ] Conflict detection prevents invalid moves
- [ ] Week/day views show time slots
- [ ] Resize changes duration
- [ ] Changes persist to database

---

## 🗂️ Data Models

### Session Schema (Backend)

```typescript
interface Session {
  id: string;                    // UUID
  name: string;                  // "Monday Training", "Match vs Team B"
  type: 'training' | 'match' | 'tournament' | 'other';
  description?: string;
  
  // Location
  venue_id: number;
  pitch_id: number;
  
  // Schedule
  start_time: string;           // ISO 8601 datetime
  end_time: string;             // ISO 8601 datetime
  timezone: string;             // e.g., "Europe/London"
  recurring_rule?: string;      // iCalendar RRULE format (optional)
  
  // Status
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  
  // Participants (optional, could be separate table)
  max_participants?: number;
  registered_count?: number;
  
  // Metadata
  created_by: string;           // User ID
  version_token: string;        // For optimistic concurrency
  created_at: string;
  updated_at: string;
}
```

### API Response Types

```typescript
interface SessionListResponse {
  data: Session[];
  next_cursor?: string;
  has_more: boolean;
}

interface SessionDetailResponse {
  data: Session & {
    venue: { id: number; name: string; address?: string };
    pitch: { id: number; name: string; sport?: string };
    participants?: Participant[];
  };
}

interface AvailabilityResponse {
  available: boolean;
  conflicts?: Array<{
    session_id: string;
    session_name: string;
    start_time: string;
    end_time: string;
  }>;
}
```

---

## 🎨 UI/UX Design

### Color Coding

**Session Status**:
- Scheduled: Blue (#3b82f6)
- Ongoing: Green (#10b981)
- Completed: Gray (#6b7280)
- Cancelled: Red (#ef4444)

**Session Type**:
- Training: Purple (#8b5cf6)
- Match: Orange (#f59e0b)
- Tournament: Pink (#ec4899)
- Other: Gray (#6b7280)

### Layout Patterns

**List View**:
```
┌────────────────────────────────────────────────────────┐
│ Sessions                           [+ Create Session]  │
├────────────────────────────────────────────────────────┤
│ [Search] [Date▼] [Venue▼] [Status▼]     [Calendar▼]  │
├────────────────────────────────────────────────────────┤
│ ┌──────────────────┐ ┌──────────────────┐             │
│ │ Monday Training  │ │ Match vs Team B  │             │
│ │ 📍 Main Pitch    │ │ 📍 Field 2       │             │
│ │ ⏰ 6:00-8:00 PM │ │ ⏰ 3:00-5:00 PM │             │
│ │ [Scheduled]      │ │ [Ongoing]        │             │
│ └──────────────────┘ └──────────────────┘             │
└────────────────────────────────────────────────────────┘
```

**Calendar View**:
```
┌────────────────────────────────────────────────────────┐
│ October 2025               [Month▼] [Week] [Day]       │
├────────────────────────────────────────────────────────┤
│ Sun  Mon  Tue  Wed  Thu  Fri  Sat                     │
│  19   20   21   22   23   24   25                     │
│            ┌─────┐ ┌─────┐                             │
│            │Train│ │Match│                             │
│            │6-8pm│ │3-5pm│                             │
│            └─────┘ └─────┘                             │
└────────────────────────────────────────────────────────┘
```

---

## 🔧 Technical Implementation

### State Management

```typescript
// Session list page
const [sessions, setSessions] = useState<Session[]>([]);
const [filters, setFilters] = useState({
  dateRange: 'this_week',
  venueId: null,
  pitchId: null,
  status: 'all',
  searchQuery: '',
});
const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

// Session creation
const [step, setStep] = useState(1);
const [formData, setFormData] = useState<Partial<Session>>({});
const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
const [selectedPitch, setSelectedPitch] = useState<Pitch | null>(null);
const [conflicts, setConflicts] = useState<Session[]>([]);
```

### Validation Logic

```typescript
// Check session conflicts
async function checkAvailability(
  pitchId: number,
  startTime: string,
  endTime: string,
  excludeSessionId?: string
): Promise<AvailabilityResponse> {
  const response = await sessionApi.checkAvailability(
    pitchId,
    startTime,
    endTime,
    excludeSessionId
  );
  return response;
}

// Validate time range
function validateTimeRange(start: Date, end: Date): string | null {
  if (end <= start) return 'End time must be after start time';
  const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  if (durationHours > 24) return 'Session cannot exceed 24 hours';
  if (durationHours < 0.5) return 'Session must be at least 30 minutes';
  return null;
}
```

---

## 🧪 Testing Strategy

### Unit Tests
- [ ] Session form validation logic
- [ ] Time range calculations
- [ ] Conflict detection algorithm
- [ ] Date/time formatting utilities

### Integration Tests
- [ ] Create session flow (API)
- [ ] Update session (API)
- [ ] Delete session (API)
- [ ] Availability check (API)
- [ ] Filter sessions (API)

### E2E Tests (Manual for now)
- [ ] Complete session creation flow
- [ ] Edit existing session
- [ ] Cancel session
- [ ] View calendar
- [ ] Filter and search sessions
- [ ] Drag-and-drop reschedule

---

## 📊 Success Criteria

### TASK 4.5.1 - Session List
- ✅ Sessions load from API
- ✅ Filters work (date, venue, pitch, status)
- ✅ Search filters results
- ✅ Calendar view displays sessions
- ✅ Pagination works
- ✅ Navigation to detail page works

### TASK 4.5.2 - Session Creation
- ✅ Multi-step form works
- ✅ Venue/pitch selection works
- ✅ Date/time picker works
- ✅ Conflict detection prevents double booking
- ✅ Validation displays errors
- ✅ Submit creates session
- ✅ Redirect to detail page

### TASK 4.5.3 - Session Detail
- ✅ Session details display correctly
- ✅ Map shows pitch location
- ✅ Edit updates session
- ✅ Cancel deletes session
- ✅ Status changes persist
- ✅ Participant management works

### TASK 4.5.4 - Calendar Integration
- ✅ Calendar displays sessions
- ✅ Drag-and-drop moves sessions
- ✅ Week/day views work
- ✅ Conflicts prevented

---

## 🚀 Next Steps After TASK 4.5

### TASK 4.6 - User Management & Auth
- User profiles
- Team management
- Role-based access control
- Clerk integration completion

### TASK 4.7 - Reporting & Analytics
- Session usage reports
- Venue utilization
- Participant attendance tracking
- Export data (CSV, PDF)

### TASK 4.8 - Mobile App (React Native)
- Native iOS/Android apps
- Push notifications
- Offline mode
- QR code check-in

---

**Status**: 📋 PLANNING → 🚧 STARTING TASK 4.5.1  
**Next Action**: Create session list page  
**Estimated Completion**: October 22, 2025 (6-8 hours from now)
