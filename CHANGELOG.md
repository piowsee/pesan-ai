# pesan-ai

## 1.3.1

### Patch Changes

- 4751419: remove timezone env variable from instrumention since it is no longer used in the app

## 1.3.0

### Minor Changes

- 2a3550f: fix embedded sign up flow to only fetch and register data that is provided by session payload and remove unused column on WABA table
- 6b289b8: add phoneNumber relation on contact table and filter by phoneNumber instead of join with conversation table on fetching customer contacts
- 18f73af: This commit introduces rich text formatting for WhatsApp messages and supports multi-file media uploads with individual captions, alongside UI improvements for media chat bubbles and conversation lists. It significantly optimizes chat performance by introducing expiration-based caching for media download URLs and ensuring real-time SSE cache invalidation only triggers on lost connections to prevent redundant network requests. Additionally, core messaging stability is improved by enforcing strict chronological message queueing, automatically routing default typing to the composer, fixing missing document filenames, capping messages to the 4096-character WhatsApp limit, and resolving underlying security and test coverage issues.
- 45a87cb: Implement business (phone number) profile feature's API

### Patch Changes

- 4456af5: Check message type before process the history webhook and add message type error on message bubble frontend
- 3f97d86: Change env variables loader on s3 Client and encryption to lazy load and add checker for all env variable on instrumentation.ts
- eda1220: Change message fetch limit from a fixed 50 to the greater of the conversation's unread count, so all unread messages are retrieved while keeping default to 50.
- d45e8d5: optimize database's schema and it's indexing

## 1.2.0

### Minor Changes

- 5376f98: add `messaging_product` column on `conversation` table and add `messaging_product` logo on conversation list avatar
- 5bc4826: Implement i18n across all page and add Indonesia translation
- 5c6b0e3: Implement history sync on embedded sign up service, webhook handler for `history` and `smb_app_state_sync` webhooks, and reorganize some repositories code
- e203c71: remove `metadata` column on `message` table

### Patch Changes

- ea20bc8: Handle `media_placeholder` message type on frontend and history webhook handler
- 28ce029: fix the conversation to automatically switch adminTakeover to true when the admin sends a message and recheck adminTakeover status after successful bot webhook request

## 1.1.0

### Minor Changes

- d9cf82b: Implement auto close conversation feature(return to bot) after 24 hours
- 28e2653: Implement account_update webhook handler for offboard and reconnect event. Also add waba status check on send Text/Media message service
- 0b82e49: Implement Message Status Webhook Handler

### Patch Changes

- 984ff34: Fix missmatch field on Meta WhatsApp Send Message API and reorganize some code

## 1.0.0

### Major Changes

- 3fe0899: This is a major release introducing support for WhatsApp's username feature, released on 29 June 2026, which is the source of the breaking changes in this update. A new `Contact` table has been added and linked to the `Conversation` table, allowing conversations to resolve user information such as `phoneNumber`, `BSUID`, and other related fields. The customer contact API has been updated to fetch data through a join between the `conversation` and `contact` tables, along with adjustments to other related queries. The `sendAdminTextMessage` function/service has been changed to prioritize `BSUID` when sending messages, falling back to `phoneNumber` when `BSUID` is unavailable, and the outgoing message payload has been updated accordingly. The `smb_message_echoes` and `incoming_message` processor has also been updated to handle all scenarios for customers who have opted into usernames; however, the message echo flow still does not support `BSUID` and continues to rely on `phoneNumber` only, since the underlying webhook does not yet support `BSUID`. Relevant functions in this flow were refactored so `BSUID` support can be added later once the webhook catches up. Finally, the external webhook request payload was restructured to send a `customerIdentifier` (`BSUID` or `phoneNumber`).

## 0.3.1

### Patch Changes

- 5123100: Increase chat workspace responsiveness by updating params locally instead of waiting for url replacement, refactor chat components by grouping it based on panel, and use dynamic route for wabaId and convId instead of query param (chatWorkspace component is used on layout to avoid remount)

## 0.3.0

### Minor Changes

- 7dfb593: implement backend for outgoing video/image/audio/document message from pesan-ai web
- a173eba: Include customerPhoneNumber on requestBotWebhook request body so we can log on n8n
- db24101: Implement FE to handle incoming and outgoing non-text media messages and implement auto scroll to the oldest unread messages
- 4633b31: implement backend to handle incoming and echo audio/image/video/document type from meta webhook payload
- 5961746: Init S3 client for Digital Ocean's Space Object Storage Integration
- ec791de: rename `mediaUrl` to `mediaObjectKey` on message table to avoid confusion on storing object key
- 1e0afb6: update `botResponse` field on bot webhook response to optional and when `botResponse` is null and `adminTakeover` is true, skip bot reply but still trigger SSE conversation update event to notify changes to client.
- f3ddf04: Implement WhatsApp Coexistence support, enabling businesses to use the WhatsApp Business App and Cloud API simultaneously on the same phone number. This includes a dedicated `smb_message_echoes` webhook processor to handle outgoing messages sent from the WhatsApp Business App, which follow a different flow than standard incoming messages.

### Patch Changes

- 05f0eae: Check incoming and echo message timestamps before updating conversation preview metadata, preventing older webhook messages from overwriting newer conversation state
- ca4f8ec: Fixed the redirect message debouncer to fall back to admin takeover when the debounced message history contains non-text messages. This prevents non-text-only or unsupported histories from producing empty/invalid bot webhook payloads while preserving `type` as an internal routing signal.

  Enforced scoped ownership checks across admin takeover and bot redirect flows by requiring user and WABA context when loading conversations. Incoming and echo message processing now resolves phone number ownership up front so downstream debounce, realtime, and redirect logic receive guaranteed `userId` and `wabaId`.

- 1952116: Improve API documentation on `/admin/webhook page`
- a05036e: Differentiate message echoes and history message from incoming messages to correctly control conversation window state
- b5161dd: Add fallback for failed redirect webhook and introduce new SSE event for frontend error handling, with highlighted UI improvements

## 0.2.0

### Minor Changes

- 2349691: debounce manager, bot webhook redirect, admin takeover, and some other minor fixes
- 33e1481: Add a localized contact-us flow from the login page. The new page lets prospective users submit contact details, then sends the request details to the poc.helpteam@gmail.com inbox by email.

## 0.1.0

Initial project release.
