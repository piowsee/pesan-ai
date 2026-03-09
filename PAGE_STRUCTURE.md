## Overview
This document outlines the complete page structure aligned with functional requirements and user flows.

---

## Table of Contents
1. [Public Pages](#public-pages)
2. [User Pages (Dashboard)](#user-pages-dashboard)
3. [Admin Pages](#admin-pages)
4. [Backend Logic Features](#backend-logic-features)
5. [Page Connections Summary](#page-connections-summary)

---

## Public Pages

### 1. Landing Page (`/`)
**Route:** `/`  
**Access:** Everyone (no authentication)  
**Purpose:** Marketing and demo request page

**Sections:**
- Hero section with value proposition
- Features showcase (6 key features)
- Pricing plans (Starter, Professional, Enterprise)
- FAQ section (expandable accordion)
- **Contact form to request demo access** (FR-02)
- About Us section with company stats
- Footer with navigation links (Terms, Privacy)

**Related FR:**
- FR-02: Contact Form - Request demo access

**Navigation Links:**
- Terms of Service → `/terms`
- Privacy Policy → `/privacy`
- Login → `/login`

---

### 2. Terms of Service (`/terms`)
**Route:** `/terms`  
**Access:** Everyone  
**Purpose:** Legal terms and conditions

**Content:**
- Complete terms of service
- WABA usage policies
- Prohibited activities
- User responsibilities
- Liability limitations
- Last updated date

**Related FR:**
- FR-03: View Terms

**Navigation:**
- Back to Landing → `/`

---

### 3. Privacy Policy (`/privacy`)
**Route:** `/privacy`  
**Access:** Everyone  
**Purpose:** Privacy and data handling information

**Content:**
- Data collection practices
- How data is used and shared
- Security measures
- User privacy rights (GDPR, CCPA)
- Cookie policy
- Data retention policies
- Contact information for privacy concerns
- Last updated date

**Related FR:**
- FR-04: View Privacy

**Navigation:**
- Back to Landing → `/`

---

### 4. Login Page (`/login`)
**Route:** `/login`  
**Access:** Unauthenticated users  
**Purpose:** User authentication via Google OAuth

**Content:**
- **Sign in with Google OAuth button** (FR-01)
- No registration option (admin provides access)
- Forgot password link (for non-OAuth users if applicable)

**Related FR:**
- FR-01: User Sign In via Google OAuth

**Authentication Flow:**
1. User clicks "Sign in with Google"
2. Google OAuth authentication
3. Backend validates credentials
4. Check user role → Redirect to appropriate dashboard

**Post-Login Navigation:**
- Regular User → `/dashboard` (Dashboard Home)
- Admin User → Choice between `/dashboard` or `/admin`

---

## User Pages (Dashboard)

**Base Route:** `/dashboard`  
**Access:** Authenticated users only  
**Layout:** Sidebar navigation + main content area

**Sidebar Navigation:**
- Dashboard Home
- Chat
- WABA Management
- Settings
- Logout

---

### 5. Dashboard Home (`/dashboard`)
**Route:** `/dashboard`  
**Access:** Authenticated users  
**Purpose:** Overview and quick access

**Features:**
- Welcome message with user name
- WABA status overview (number of connected WABAs, active/suspended status)
- Quick action buttons:
  - Go to Chat
  - Add New WABA
  - View Settings

**Related FR:**
- FR-05: View Dashboard Overview

**Navigation:**
- Chat → `/dashboard/chat`
- WABA Management → `/dashboard/waba`
- Settings → `/dashboard/settings`

---

### 6. Chat Interface (`/dashboard/chat`)
**Route:** `/dashboard/chat`  
**Access:** Authenticated users  
**Purpose:** Manage WhatsApp conversations across multiple WABAs

**Key Feature:** **Multi-tab browser support** - Users can open multiple tabs inside WebApp, each viewing a different WABA's chats independently

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ [WABA Selector Dropdown ▼]        [Search] [Filter ▼]      │
├─────────────────────────────────────────────────────────────┤
│  Chat List                  │  Chat Detail View             │
│  ┌──────────────────────┐  │  ┌─────────────────────────┐ │
│  │ 👤 John Doe          │  │  │ 👤 John Doe             │ │
│  │ Hey, is this...  🔴  │  │  │ +1 234 567 8901         │ │
│  │ 2 min ago            │  │  │─────────────────────────│ │
│  ├──────────────────────┤  │  │                         │ │
│  │ 👤 Jane Smith        │  │  │ [Message History]       │ │
│  │ Thanks for help! ✓✓  │  │  │                         │ │
│  │ 5 min ago            │  │  │                         │ │
│  └──────────────────────┘  │  │─────────────────────────│ │
│                             │  │ [Type message...] [Send]│ │
│                             │  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Features:**

#### WABA Selector (UI Component)
- Dropdown at top to select which WABA to view
- Shows WABA name and number of phone numbers
- Switching WABA reloads chat list for that WABA
- This is a UI component that enables FR-07 (View Chat List)

#### Chat List (FR-07)
- Display all conversations for selected WABA
- Includes chats from all phone numbers under that WABA
- Shows contact name/number, last message preview, timestamp
- Unread count badges
- Sorted by recent activity
- Pagination support

#### Filter Options (FR-08)
- All conversations
- Unread messages only
- Filter by specific phone number (if WABA has multiple numbers)

#### Search (FR-09)
- Search conversations by contact name or phone number
- Real-time search filtering

#### Chat Detail View (FR-10, FR-11)
- Full conversation thread with message history
- Real-time message sync via SSE
- Message status indicators:
  - ✓ Sent
  - ✓✓ Delivered
  - ✓✓ Read (blue)
- Contact information sidebar:
  - Contact name
  - Phone number
  - Profile picture
  - Last seen

#### Multi-Tab Support (FR-06)
- User can open multiple tabs inside the WebApp
- Each tab is independent
- Each tab can select different WABA
- Real-time sync works across tabs

**Multi-Tab Workflow Example:**
```
Tab 1: WABA "Main Store" → Viewing customer support chats
Tab 2: WABA "Wholesale Business" → Viewing B2B conversations
Tab 3: WABA "Retail Shop" → Viewing retail inquiries
```

#### Send Messages (FR-12, FR-13)

**24-Hour Window Check (FR-12):**
- Frontend validates if within 24h window from last customer message (TTL logic)
- If outside 24h → Show warning: "Use template message required"
- If within 24h → Allow regular text messages
- Cannot send if outside 24h window

**Send Text Message (FR-13):**
- Text input with character counter
- Send button (enabled only within 24h window)
- Emoji picker button (optional)
- Real-time delivery status updates

#### Receive Messages (FR-14)
Receive and display:
- Text messages from customers
- Real-time delivery via SSE (Server-Sent Events)
- Message status indicators (sent, delivered, read)
- Timestamp display in user's timezone

**Related FR:**
- FR-06: Multi-Tab Support
- FR-07: View Chat List
- FR-08: Filter Conversations
- FR-09: Search Conversations
- FR-10: Open Chat Detail
- FR-11: Real-time Message Sync
- FR-12: Check 24-Hour Window
- FR-13: Send Text Message
- FR-14: Receive Text Message

**Navigation:**
- Back to Dashboard → `/dashboard`
- Open New Tab → User opens new browser tab manually
- WABA Management → `/dashboard/waba`

---

### 7. WABA Management (`/dashboard/waba`)
**Route:** `/dashboard/waba`  
**Access:** Authenticated users  
**Purpose:** Manage WhatsApp Business Accounts

**Features:**

#### WABA List (FR-15)
Display all connected WABAs for the user in grid or list view

**WABA Card Layout:**
```
┌──────────────────────────────────────────────────────────┐
│ 🟢 WABA: My Business Account                            │
│ ID: 123456789012345                                      │
│ Status: ● Active                                         │
│ Created: Jan 15, 2024                                    │
│                                                          │
│ ▼ Phone Numbers (3)                                     │
│ ┌────────────────────────────────────────────────────┐ │
│ │ 📱 +1 234 567 8901 (Main)                          │ │
│ │    Display Name: Main Store                        │ │
│ │    Quality: 🟢 High | Status: Active               │ │
│ │    [Configure] [Business Hours] [Holidays]         │ │
│ ├────────────────────────────────────────────────────┤ │
│ │ 📱 +1 234 567 8902 (Support)                       │ │
│ │    Display Name: Customer Support                  │ │
│ │    Quality: 🟢 High | Status: Active               │ │
│ │    [Configure] [Business Hours] [Holidays]         │ │
│ ├────────────────────────────────────────────────────┤ │
│ │ 📱 +1 234 567 8903 (Sales)                         │ │
│ │    Display Name: Sales Team                        │ │
│ │    Quality: 🟡 Medium | Status: Active             │ │
│ │    [Configure] [Business Hours] [Holidays]         │ │
│ └────────────────────────────────────────────────────┘ │
│                                                          │
│ [Configure WABA] [Add Phone Number] [Disconnect]        │
└──────────────────────────────────────────────────────────┘
```

**For Each WABA:**
- Business name
- Account ID (WABA ID)
- Status (Active, Pending, Suspended)
- Created date
- **Expandable phone numbers section** - click to expand/collapse
- Account health indicators

**For Each Phone Number (FR-19):**
- Phone number with display name
- Quality rating (High/Medium/Low)
- Status (Active/Inactive)
- Action buttons:
  - Configure (FR-20, FR-21, FR-22)
  - Business Hours
  - Holidays

#### Phone Number Configuration Modal/Page (FR-19, FR-20, FR-21, FR-22)

When user clicks "Configure" on a phone number:

**Business Hours Settings (FR-20):**
```
Monday:    [09:00 AM] to [05:00 PM]  [Open/Closed]
Tuesday:   [09:00 AM] to [05:00 PM]  [Open/Closed]
Wednesday: [09:00 AM] to [05:00 PM]  [Open/Closed]
Thursday:  [09:00 AM] to [05:00 PM]  [Open/Closed]
Friday:    [09:00 AM] to [05:00 PM]  [Open/Closed]
Saturday:  [10:00 AM] to [02:00 PM]  [Open/Closed]
Sunday:    [Closed]                   [Open/Closed]
```

**Holiday Dates (FR-21):**
```
┌─────────────────────────────────────────┐
│ Add Holiday                             │
│ Date: [2024-12-25] (Christmas)          │
│ Reason: [Holiday Closure]               │
│ [Add]                                   │
├─────────────────────────────────────────┤
│ Upcoming Holidays:                      │
│ • Dec 25, 2024 - Christmas     [Delete] │
│ • Jan 1, 2025 - New Year       [Delete] │
└─────────────────────────────────────────┘
```

**Business Profile (FR-22):**
- Business Name: [Text input]
- Address: [Text input]
- Description: [Textarea]
- Category: [Dropdown]
- Website: [URL input]
- Email: [Email input]
- [Save Changes]

#### Add New WABA (FR-16)
- Button: "Add New WABA"
- Launches Embedded Sign-Up flow
- Redirects to WABA setup wizard

#### Add Phone Number to WABA (FR-18)
- Button: "Add Phone Number" (per WABA)
- Opens dialog to add phone number to existing WABA
- Phone number verification required

#### Disconnect WABA (FR-17)
- Button: "Disconnect"
- Confirmation modal
- Removes WABA from user account
- Unsubscribes webhooks

**Related FR:**
- FR-15: View Connected WABAs
- FR-16: Connect WABA (Embedded Sign-Up)
- FR-17: Disconnect WABA
- FR-18: Add Phone Number
- FR-19: Select Phone for Configuration
- FR-20: Set Business Hours
- FR-21: Set Holiday Dates
- FR-22: Update Business Profile

**Navigation:**
- Add New WABA → `/dashboard/waba/setup` (Embedded signup)
- Configure Phone → Opens modal/sidebar
- Back to Dashboard → `/dashboard`

---

### 9. Settings (`/dashboard/settings`)
**Route:** `/dashboard/settings`  
**Access:** Authenticated users  
**Purpose:** User preferences (MINIMAL - Only 2 settings)

**Settings Options:**

#### 1. Timezone Settings (FR-23)
```
┌─────────────────────────────────────────┐
│ Timezone                                │
│ Select your timezone for displaying     │
│ message timestamps and schedules        │
│                                         │
│ [Dropdown: (GMT-8) Pacific Time]   ▼   │
│                                         │
│ Current Time: 2:30 PM                   │
│ [Save]                                  │
└─────────────────────────────────────────┘
```
- Database stores all times in UTC
- Frontend converts to user's selected timezone
- Used for message timestamps, business hours display

#### 2. Sound Alerts (FR-24)
```
┌─────────────────────────────────────────┐
│ Sound Alerts                            │
│ Play sound when new message arrives     │
│                                         │
│ [Toggle Switch: ON/OFF]                 │
│                                         │
│ [Test Sound] button                     │
└─────────────────────────────────────────┘
```
- Toggle to enable/disable notification sound
- Test sound button to preview
- Saved to user preferences

**Layout:**
- Simple single page or tabs
- Two sections only
- No profile editing, no password change, no 2FA
- Minimal and clean interface

**Related FR:**
- FR-23: Set Timezone
- FR-24: Sound Alerts Toggle

**Navigation:**
- Back to Dashboard → `/dashboard`

---

## Admin Pages

**Base Route:** `/admin`  
**Access:** Admin users only  
**Layout:** Admin sidebar + main content area

**Admin Sidebar Navigation:**
- WABA Management
- Webhook Management
- Switch to User Dashboard
- Logout

**Note:** Admin has NO user management page. Users are managed outside the system (admin creates accounts directly in database or via separate admin tool).

---

### 10. Admin WABA Management (`/admin/waba`)
**Route:** `/admin/waba`  
**Access:** Admin only  
**Purpose:** Monitor and manage all WhatsApp Business Accounts across the entire platform

**Features:**

#### Filter and Search (FR-26)
```
┌────────────────────────────────────────────────────────┐
│ [Search by User, WABA ID, Business Name...]           │
│                                                        │
│ Filter by User:   [All Users ▼]                       │
│ Filter by Status: [All Status ▼] (Active/Suspended)   │
│ Filter by Quality:[All Quality ▼] (High/Medium/Low)   │
│                                                        │
│ [Apply Filters] [Clear]                                │
└────────────────────────────────────────────────────────┘
```

#### WABA List Table (FR-25)
```
┌──────────────────────────────────────────────────────────────────────────┐
│ Owner          │ WABA ID    │ Business    │ Phone Numbers │ Status      │
├──────────────────────────────────────────────────────────────────────────┤
│ john@email.com │ 1234567... │ Main Store  │ 3 numbers ▼   │ 🟢 Active   │
│ jane@email.com │ 9876543... │ Support     │ 2 numbers ▼   │ 🟡 Pending  │
│ bob@email.com  │ 5555555... │ Sales Dept  │ 1 number ▼    │ 🔴 Suspended│
└──────────────────────────────────────────────────────────────────────────┘
```

**For Each WABA:**
- Owner (user email/name)
- WABA ID
- Business name
- Phone numbers (click to expand)
- Status (Active/Suspended/Disconnected)
- Quality rating (High/Medium/Low)
- Message limits
- Webhook status (Connected/Not Connected/Error)
- Created date
- [View Details] button

**Expandable Phone Numbers:**
Click on "3 numbers ▼" to expand:
```
📱 +1 234 567 8901 (Main) - Quality: High
📱 +1 234 567 8902 (Support) - Quality: High  
📱 +1 234 567 8903 (Sales) - Quality: Medium
```

#### WABA Detail View (FR-27)
When clicking [View Details]:
```
┌────────────────────────────────────────────────────────┐
│ WABA Details                                           │
├────────────────────────────────────────────────────────┤
│ Owner: john@email.com                                  │
│ WABA ID: 123456789012345                               │
│ Business Name: Main Store                              │
│ Status: 🟢 Active                                      │
│ Created: Jan 15, 2024                                  │
│ Last Activity: 2 minutes ago                           │
│                                                        │
│ Phone Numbers:                                         │
│ ├─ +1 234 567 8901 (Main) - Quality: High             │
│ ├─ +1 234 567 8902 (Support) - Quality: High          │
│ └─ +1 234 567 8903 (Sales) - Quality: Medium          │
│                                                        │
│ Message Limits: 1000/day                               │
│ Quality Rating: High                                   │
│ Webhook Status: ✅ Connected                           │
│ Assigned Webhook: Customer Support Bot                 │
│                                                        │
│ WhatsApp API Health: ✅ Healthy                        │
│ Last Webhook Event: 30 seconds ago                     │
│                                                        │
│ [Assign Webhook]                                       │
└────────────────────────────────────────────────────────┘
```

#### Admin Action: Assign Webhook to WABA (FR-28)

**Assign Webhook Modal:**
```
┌─────────────────────────────────────────────────────────────┐
│ Assign Bot Webhook to WABA                                 │
├─────────────────────────────────────────────────────────────┤
│ WABA: Main Store (john@email.com)                          │
│                                                             │
│ Select Phone Number:                                        │
│ [All Numbers ▼]                                            │
│   Options:                                                  │
│   • All Numbers (applies to all phones in this WABA)       │
│   • +1 234 567 8901 (Main)                                 │
│   • +1 234 567 8902 (Support)                              │
│   • +1 234 567 8903 (Sales)                                │
│                                                             │
│ Select Bot Webhook URL:                                     │
│ [Customer Support Bot ▼]                                    │
│   Available webhooks from FR-29:                            │
│   • Customer Support Bot                                    │
│   • Sales Bot                                               │
│   • FAQ Bot                                                 │
│   • (None - Remove webhook)                                 │
│                                                             │
│ [Assign Webhook] [Cancel]                                   │
└─────────────────────────────────────────────────────────────┘
```

**How It Works:**
- Admin selects a WABA
- Chooses which phone number(s) to assign webhook to:
  - "All Numbers" = webhook applies to all phones in the WABA
  - Specific phone number = webhook only for that phone
- Selects webhook URL from list of available bot webhooks (managed in FR-29)
- When customer sends message to that phone number, message is forwarded to assigned webhook (FR-33)

**Webhook Connection Monitoring:**
- Real-time webhook status indicator
- Last webhook event timestamp
- Error status if webhooks failing

**WhatsApp API Health Indicators:**
- API connectivity status
- Rate limit status
- Quality rating changes
- Account warnings

**Related FR:**
- FR-25: View All WABAs
- FR-26: Filter by User/Status/Quality
- FR-27: View WABA Details
- FR-28: Assign Webhook to WABA

**Navigation:**
- Manage Webhooks → `/admin/webhooks`
- Back to Admin Dashboard → `/admin`

---

### 11. Webhook Management (`/admin/webhooks`)
**Route:** `/admin/webhooks`  
**Access:** Admin only  
**Purpose:** Configure platform webhooks and manage bot webhook URLs

**Two Main Sections:**

---

#### Section 1: Platform Webhook Configuration (FR-30)

```
┌─────────────────────────────────────────────────────────────┐
│ Platform Webhook Configuration                             │
├─────────────────────────────────────────────────────────────┤
│ Webhook URL (Central Endpoint):                            │
│ [https://platform.com/api/webhooks/whatsapp]               │
│                                                             │
│ Verify Token:                                               │
│ [••••••••••••••••] [Show/Hide] [Regenerate]                │
│                                                             │
│ Webhook Secret:                                             │
│ [••••••••••••••••] [Show/Hide] [Regenerate]                │
│                                                             │
│ SSL Certificate Status: ✅ Valid (Expires: Dec 31, 2024)   │
│                                                             │
│ [Save Configuration]                                        │
└─────────────────────────────────────────────────────────────┘
```

**Features:**
- Central webhook URL for all WhatsApp events
- Verify token for webhook verification
- Webhook secret for signature verification
- SSL certificate monitoring
- This is the webhook URL that WhatsApp will send events to

**How It Works:**
1. WhatsApp sends events (messages, status updates) to this platform webhook URL
2. Platform receives the webhook, validates it with verify token and secret
3. Platform processes the event and forwards to appropriate bot webhook (FR-33)

**Related FR:**
- FR-30: Configure Platform Webhook

---

#### Section 2: Bot Webhook URLs Management (FR-29, FR-31, FR-32)

**Manage Bot Webhook URLs (FR-29):**

```
┌─────────────────────────────────────────────────────────────┐
│ Bot Webhook URLs                          [+ Add New URL]   │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🤖 Customer Support Bot                                 │ │
│ │ URL: https://n8n.company.com/webhook/support            │ │
│ │ Platform: n8n                                           │ │
│ │ Assigned to: 5 WABAs                                    │ │
│ │ Status: ✅ Active                                       │ │
│ │ [Edit] [Delete] [Test]                                  │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🤖 Sales Bot                                            │ │
│ │ URL: https://n8n.company.com/webhook/sales              │ │
│ │ Platform: n8n                                           │ │
│ │ Assigned to: 2 WABAs                                    │ │
│ │ Status: ✅ Active                                       │ │
│ │ [Edit] [Delete] [Test]                                  │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🤖 FAQ Bot                                              │ │
│ │ URL: https://zapier.com/hooks/catch/12345/abc123        │ │
│ │ Platform: Zapier                                        │ │
│ │ Assigned to: 0 WABAs                                    │ │
│ │ Status: ⚪ Inactive                                     │ │
│ │ [Edit] [Delete] [Test]                                  │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Add/Edit Bot Webhook URL:**
```
┌─────────────────────────────────────────┐
│ Add Bot Webhook URL                     │
├─────────────────────────────────────────┤
│ Name/Label:                             │
│ [Customer Support Bot]                  │
│                                         │
│ Webhook URL:                            │
│ [https://n8n.company.com/webhook/...]   │
│                                         │
│ Platform:                               │
│ [n8n ▼] (n8n, Zapier, Make, Custom)    │
│                                         │
│ Description: (optional)                 │
│ [Bot handles customer support queries]  │
│                                         │
│ [Save] [Cancel]                         │
└─────────────────────────────────────────┘
```

**Features:**
- Create, edit, and delete bot webhook URLs
- Each webhook has a name/label for easy identification
- Support for multiple platforms (n8n, Zapier, Make, Custom)
- See which WABAs are using each webhook
- Test webhook functionality

**Test Webhook (FR-31):**
- Button: [Test] on each webhook
- Send test payload to bot webhook
- Verify bot receives and processes
- Display response time and status
- Shows success/error message

**How These Webhooks Are Used:**
1. Admin creates bot webhook URLs here (FR-29)
2. Admin assigns webhook to specific WABA/phone number (FR-28)
3. When message comes to that phone number:
   - WhatsApp → Platform Webhook (FR-30)
   - Platform → Bot Webhook URL (FR-33)
   - Bot processes and responds (FR-34)

**Retry Failed Webhooks (FR-32):**

```
┌──────────────────────────────────────────────────────────────┐
│ Failed Webhook Attempts                  [Clear All]         │
├──────────────────────────────────────────────────────────────┤
│ Timestamp        │ Webhook      │ Error          │ Actions   │
├──────────────────────────────────────────────────────────────┤
│ 2024-01-15 14:25 │ Support Bot  │ Timeout (30s)  │ [Retry]   │
│ 2024-01-15 14:15 │ Sales Bot    │ 500 Error      │ [Retry]   │
│ 2024-01-15 13:45 │ FAQ Bot      │ Connection     │ [Retry]   │
└──────────────────────────────────────────────────────────────┘
```

**Features:**
- Shows list of failed webhook delivery attempts
- Error details (timeout, HTTP errors, connection issues)
- Retry button to resend the webhook
- Can retry individual webhooks or bulk retry
- Automatically retries with exponential backoff

**Related FR:**
- FR-29: Manage Bot Webhook URLs (Create/Edit/Delete)
- FR-31: Test Webhook
- FR-32: Retry Failed Webhooks

**Navigation:**
- Back to Admin Dashboard → `/admin`
- WABA Management → `/admin/waba`

---

## Backend Logic Features

These are backend features that don't have dedicated UI pages but are critical for the platform's functionality.

### FR-33: Forward Messages to Webhook URL
**Description:** Send incoming customer messages to webhook based on assigned webhook URL on receiver phone number

**How It Works:**
1. Customer sends WhatsApp message to business phone number
2. WhatsApp Cloud API sends webhook event to platform (FR-30)
3. Platform receives the message and identifies:
   - Which WABA received the message
   - Which phone number received the message
4. Platform checks webhook assignment (FR-28):
   - Is there a bot webhook URL assigned to this phone number?
   - If yes, forward message to that webhook URL
   - If no, just display in chat interface (FR-11)
5. Platform forwards message payload to bot webhook URL:
   - Customer information
   - Message content
   - Conversation context
   - Metadata (timestamp, WABA ID, phone number)
6. Message appears in chat interface (FR-11) for user to see

**Technical Details:**
- HTTP POST request to bot webhook URL
- JSON payload with message data
- Timeout: 30 seconds (if bot doesn't respond)
- Retry logic: Exponential backoff (FR-32)
- Error handling: Log failed attempts

---

### FR-34: Receive Bot Responses
**Description:** Process and send bot-generated replies to frontend (FR-11) and customer

**How It Works:**
1. Bot webhook processes the message (from FR-33)
2. Bot generates response and sends it back to platform webhook
3. Platform receives bot response:
   - Validates the response
   - Checks message format
   - Verifies it's within 24h window (if not, requires template)
4. Platform sends message to customer via WhatsApp Cloud API
5. Platform forwards message to frontend (SSE) for real-time update (FR-11)
6. Message appears in chat interface with "Bot" indicator
7. User sees the bot response in real-time

**Bot Response Format:**
Bot must respond with:
```json
{
  "to": "+15551234567",
  "type": "text",
  "text": {
    "body": "Hi! I'm here to help. What's your order number?"
  },
  "context": {
    "message_id": "wamid.abc123"
  }
}
```

**Technical Details:**
- Bot has 30 seconds to respond (timeout handled in FR-32 if fails)
- Response sent to customer via WhatsApp Cloud API
- Response also sent to frontend via SSE (FR-11)
- Message status tracked (sent, delivered, read)
- If bot response fails, log error and notify admin

**Integration with Chat Interface:**
- Bot responses appear in chat with special indicator: 
- User can see which messages were handled by bot vs human
- User can take over conversation manually if needed

---

## Page Connections Summary

```
Landing (/)
├── Terms (/terms)
├── Privacy (/privacy)
├── Contact Form (on landing page - FR-02)
└── Login (/login - FR-01)
    └── Dashboard (/dashboard) [User - FR-05]
        ├── Chat (/dashboard/chat - FR-06 to FR-14)
        │   └── Multi-tab support (open multiple browser tabs)
        ├── WABA Management (/dashboard/waba - FR-15 to FR-22)
        │   ├── Add New WABA (/dashboard/waba/setup - FR-16)
        │   ├── Configure Phone (modal - FR-19 to FR-22)
        │   │   ├── Business Hours (FR-20)
        │   │   ├── Holidays (FR-21)
        │   │   └── Business Profile (FR-22)
        │   ├── Add Phone Number (FR-18)
        │   └── Disconnect WABA (FR-17)
        └── Settings (/dashboard/settings - FR-23, FR-24)
            ├── Timezone (FR-23)
            └── Sound Alerts (FR-24)

    └── Admin Dashboard (/admin) [Admin]
        ├── WABA Management (/admin/waba - FR-25 to FR-28)
        │   ├── View All WABAs (FR-25)
        │   ├── Filter/Search (FR-26)
        │   ├── View Details (FR-27)
        │   └── Assign Webhook (FR-28)
        └── Webhook Management (/admin/webhooks - FR-29 to FR-32)
            ├── Platform Webhook Config (FR-30)
            ├── Bot Webhook URLs (FR-29)
            ├── Test Webhook (FR-31)
            └── Retry Failed Webhooks (FR-32)

Backend Logic (No UI):
├── Forward Messages to Webhook (FR-33)
└── Receive Bot Responses (FR-34)
```

---