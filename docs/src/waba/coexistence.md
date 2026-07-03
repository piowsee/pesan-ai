# Use an Existing WhatsApp Business App Account

This guide explains how to connect an existing WhatsApp Business App account to Pesan AI using **coexistence** mode.

**Coexistence** allows you to keep using your WhatsApp Business App while connecting the same number to the WhatsApp Business Platform for use with Pesan AI.

This option is useful if your business already uses WhatsApp Business App and does not want to immediately replace the existing app workflow.

## What is coexistence?

Meta sometimes refers to this feature as **coexistence** in support channels and partner documentation. It lets a business use Embedded Signup to onboard with an existing WhatsApp Business App account and phone number instead of replacing the app setup.

After onboarding, the business can use Pesan AI through the WhatsApp Business Platform for higher-volume messaging. The business can still send personal messages from the WhatsApp Business App, and WhatsApp keeps message history synchronized between the WhatsApp Business App and the connected platform experience.

Source: [Meta - Onboarding Business App Users](https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/onboarding-business-app-users).

## Requirement

Before using **coexistence**, make sure these requirements are met:

- The business must use WhatsApp Business App version **2.24.17** or later.
- The number must be an existing WhatsApp Business App number that will be connected through **Embedded Signup**.

## Limitation

Meta lists a few limits for WhatsApp Business App numbers that are connected with **Cloud API**:

- To stay compatible with WhatsApp Business App, the phone number has a fixed throughput of **20 mps**.
- If the business previously worked with another partner and still shares that partner's credit line, the business may see an error when switching to a new partner.
- Some WhatsApp Business App features still work in the app but are not available through **Cloud API**. See **feature comparison** below.

## Pricing

After onboarding to **Cloud API**, messages sent directly from WhatsApp Business App remain free. Messages sent through **Cloud API** follow Meta's **Cloud API pricing**.

For common pricing scenarios, Meta also provides the PDF: [Our API Solutions for WhatsApp Business App Users](https://developers.facebook.com/resources/API-solutions-for-WhatsApp-Business-App-users.pdf).

## Customer service window

The **customer service window** opens only when a WhatsApp user sends a message to the business after the business has joined **Cloud API**.

If a WhatsApp user sends a message right before the business joins **Cloud API**, WhatsApp does not open the **customer service window** for that message. In that case, the business can only reply through **Cloud API** with a template message.

The 24-hour **customer service window** rule applies to messages sent through **Cloud API**. Messages sent from WhatsApp Business App are not bound by the Cloud API **customer service window**, and they do not create, extend, or affect Cloud API conversation windows or Cloud API pricing.

## Feature comparison

Meta's **feature comparison** explains what changes after a WhatsApp Business App account is connected to **Cloud API**:

| WhatsApp Business App feature | After onboarding to Cloud API | Cloud API support |
|---|---|---|
| Individual chats (1:1) | Edit or cancel message is supported. Messages from the last 6 months can be synced, and sent or received messages are mirrored between WhatsApp Business App and Cloud API. | Supported |
| Contacts | No change in WhatsApp Business App. Contacts with WhatsApp numbers can be synced. | Supported |
| Group chats | No change in WhatsApp Business App. Group chats are not synced. | Not supported |
| Disappearing messages | Disabled for all individual chats (1:1). | Not supported |
| Live location messages | Disabled for all individual chats (1:1). | Not supported |
| Broadcast lists | Disabled. Existing broadcast lists become read-only, and the business cannot create new broadcast lists. | Not supported |
| Voice and video calls | No change in WhatsApp Business App. | Not supported |
| Business tools, such as catalog, orders, and status | No change in WhatsApp Business App. | Not supported |
| Messaging tools, such as marketing messages, greeting messages, away messages, quick replies, and labels | No change in WhatsApp Business App. | Not supported |
| Business profile, such as business name, address, and website | No change in WhatsApp Business App. | Not supported |
| Channels | No change in WhatsApp Business App. | Not supported |

## Before you begin

Make sure:

- You can access the Facebook account that manages the business assets.
- You know which business portfolio should be connected.
- You have the WhatsApp Business phone nearby.
- The WhatsApp Business App can receive messages from Facebook Business.
- You are using the correct business phone number.

## Coexistence setup flow

1. **Start the Meta onboarding flow.** From **WABA Management**, click **Connect WhatsApp account**. A Facebook Login for Business popup will appear. Click **Continue**.

![Meta onboarding popup](../Images/05-meta-onboarding-popup.png)

2. **Select your business portfolio.** Choose the business portfolio you want to share with Pesan AI. If you already have a business portfolio, select the correct one from the list.

![Select business portfolio](../Images/06-business-portfolio-selection.png)

> [!TIP]
> If you selected the wrong business portfolio and the popup still allows changes, go back and choose the correct one. If not, close the popup and restart from **WABA Management**. Choose the business portfolio that owns or manages the WhatsApp Business account you want to connect.

3. **Choose the existing WhatsApp Business App option.** When asked to choose the WhatsApp Business setup option, select the option to connect an existing WhatsApp Business App account.

This option may appear as **Connect an existing WhatsApp Business App account** or similar wording depending on the language shown by Meta.

![Choose existing WhatsApp Business App account](../Images/07-existing-or-new-waba-choice.png)

4. **Enter your WhatsApp Business phone number.** Select the country code and enter the WhatsApp Business phone number you want to connect. Make sure the phone number is the correct business number.

![Enter phone number](../Images/08-enter-phone-number.png)

5. **Review the connection information.** Meta will show information about connecting your existing WhatsApp Business App account to the Business Platform. Review the information, then click **Next**.

![Review coexistence information](../Images/09-coexistence-review.png)

6. **Continue from WhatsApp Business App.** If a QR code or access code appears, open your WhatsApp Business App on your phone and continue the connection process from there.

![QR code or access code screen](../Images/10-coexistence-qr-or-code.png)

> [!TIP]
> Follow the instruction shown in the Meta onboarding screen. Keep the WhatsApp Business App open on your phone and continue from there.

7. **Open the Facebook Business message.** In WhatsApp, open the message from **Facebook Business**. Tap the connect button in the message.

![Facebook Business message in WhatsApp](../Images/11-facebook-business-message.png)

![Connect button in WhatsApp](../Images/12-connect-button-whatsapp.png)

> [!TIP]
> If the Facebook Business message does not appear, check that the phone number is correct, active in WhatsApp Business App, connected to the internet, and able to receive messages. If it still does not appear, restart from **WABA Management** or contact the Pesan AI team.

8. **Connect to the Business Platform.** On your phone, tap **Connect to the Business Platform**.

![Connect to Business Platform](../Images/13-connect-to-business-platform.png)

9. **Choose chat history sharing option.** When asked whether to share chat history, choose **Don't share chats**.

![Choose not to share chat history](../Images/14-dont-share-chats.png)

> [!IMPORTANT]
> Pesan AI currently does not support chat history sync. Choose **Don't share chats** during this step.
>
> If the business taps **Share chats** or turns on **history sync**, the **Connect WhatsApp App** process may fail in Pesan AI. Meta requires chat history to be synced within 24 hours after onboarding is completed. Because Pesan AI does not support **history sync** yet, the business may be automatically **offboarded** within 24 hours and will need to repeat the onboarding flow.

If you accidentally selected **Share all chats**, contact the Pesan AI team before continuing.

10. **Return to the Meta onboarding popup.** Back in the Meta onboarding popup, confirm or edit your WhatsApp Business account details, such as account name and time zone.

![Confirm WABA details](../Images/15-confirm-waba-details.png)

11. **Review permissions.** Review what Pesan AI can access and do with the connected WhatsApp Business Account. If everything is correct, click **Confirm**.

![Review permissions](../Images/16-review-permissions.png)

12. **Finish setup.** When the account is connected, click **Done** or **Finish**.

![Finish connection](../Images/17-finish-connection.png)

13. **Check WABA Management.** Return to Pesan AI and open WABA Management. Your connected WhatsApp Business Account should appear in the account list.

![WABA Management account list](../Images/04-waba-management-page.png)

> [!NOTE]
> - Keep the WhatsApp phone nearby during the setup process.
> - Make sure the number is the correct business number.
> - The phone must be able to receive WhatsApp messages from Facebook Business.
> - If the popup closes or the connection fails, restart the connection from WABA Management.
> - Use **Don't share chats** because chat history sync is not currently supported. If chat history sharing is enabled, the business may need to be offboarded and repeat onboarding within 24 hours.
