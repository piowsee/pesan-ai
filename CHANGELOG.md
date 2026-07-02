# pesan-ai

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
