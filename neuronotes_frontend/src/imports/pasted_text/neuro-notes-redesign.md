# NeuroNotes Product Extension Specification

Modify the EXISTING NeuroNotes application.

Do NOT rebuild the project from scratch.
Do NOT remove existing screens.
Do NOT remove existing navigation.
Do NOT replace the existing application architecture unnecessarily.

I want to extend the existing NeuroNotes product with the following features while preserving the current visual direction.

## 1. Global Typography

Replace the current Inter typography system.

Use:

- Display font: DM Serif Display
- UI / body font: Manrope

Use DM Serif Display only for major emotional/product headlines, including:

- "Your brain is not broken."
- "It just works differently."
- "Your brain deserves the full experience."
- Major Focus / Win headlines.

Use Manrope for body text, buttons, navigation, cards, labels, inputs, pricing, feature descriptions, chatbot messages, settings, profile, and bottom navigation.

Typography:

- Display: DM Serif Display, 36px / 42px, regular
- Large heading: DM Serif Display, 30px / 36px, regular
- Heading: Manrope, 20px / 28px, 600
- Body: Manrope, 16px / 26px, 400
- Label: Manrope, 13px / 18px, 600
- Micro: Manrope, 11px / 14px, 500

Do not use DM Serif Display for dense UI.

The typography should feel editorial, warm, premium, creative, and calm, but never difficult to read.

## 2. AI Companion

Add a NeuroNotes AI Companion experience.

Create a dedicated conversational interface that visually belongs to NeuroNotes. The chatbot should feel calm and personal, not like a generic AI assistant.

Header:

- "NeuroNotes Companion"
- Subtitle: "You're allowed to have messy days."

Chat interface:

- User messages aligned right.
- Assistant messages aligned left.
- Soft cream/white message surfaces.
- No aggressive blue/purple AI styling.
- No robot imagery.
- No generic AI sparkle branding.
- Generous spacing.
- Large readable text.
- Calm typing indicator.

Suggested conversation starters:

- "I'm overwhelmed."
- "I can't get started."
- "I had a bad day."
- "I actually got something done!"
- "I don't know what to do first."

The assistant should respond with warmth, validation, and one practical next step when appropriate. Keep responses short. Do not present the AI as a therapist, diagnose the user, or encourage emotional dependency.

Create a service abstraction:

`chatService.sendMessage(message)`

The frontend should call `POST /api/chat`. Do NOT place AI provider secret keys in frontend code. The API key must remain server-side.

Create loading, error, and retry states.

## 3. Profile + Cat Character System

Create a Profile screen accessible from Settings.

Profile should contain:

- Profile heading: "Your space"
- Display name
- Selected cat character
- "Choose your companion"

Create a character selection grid using built-in NeuroNotes cat characters:

- Sage Cat
- Lavender Cat
- Amber Cat
- Cloud Cat
- Cocoa Cat
- Peach Cat

Do NOT require users to upload images. The characters should be bundled app assets.

Store only the selected identifier:

`avatar_id`

Example: `avatar_id: "lavender-cat"`

Allow the user to change their selected cat at any time. The selected cat should appear consistently in Profile, AI Companion header/avatar, relevant empty states, and optional Win moments. Do not overuse the cat. It is a secondary personality element, not the entire brand.

## 4. Terms + Privacy Consent

Create a first-use consent screen before users access microphone-dependent features.

Include:

- "Before we begin"
- "NeuroNotes needs your permission to provide its core features."
- Links: Terms of Service and Privacy Policy
- Checkbox: "I agree to the Terms of Service and Privacy Policy."
- Primary button: "Continue"

Do not claim that accepting Terms grants microphone access. The app must separately request microphone permission when Capture is first used.

Store consent information:

- `terms_version`
- `privacy_version`
- `accepted_at`
- `user_id`

Do not store only a boolean.

## 5. Cookie Consent

For the web version, add a minimal cookie consent banner.

Text: "NeuroNotes uses essential cookies to keep the app working."

Buttons:

- "Accept"
- "Privacy settings"

Do not request cookie consent as a substitute for microphone permission. Do not make the banner visually aggressive. Use the NeuroNotes design system.

## 6. Microphone Permission

Do not request microphone access immediately when the application opens. Request it when the user first activates Capture.

Before triggering the browser permission dialog, show:

- "Ready to capture?"
- "NeuroNotes uses your microphone to turn your thoughts into notes."
- "Allow microphone"
- "Not now"

When the user selects Allow microphone, request browser microphone permission using `navigator.mediaDevices.getUserMedia({ audio: true })`.

Handle permission granted, permission denied, microphone unavailable, and retry. Do not pretend that microphone permission has been granted simply because the user accepted Terms.

## 7. Data Model

Create frontend service interfaces that are ready to connect to Supabase.

Data models:

### profiles

- `id`
- `user_id`
- `display_name`
- `avatar_id`
- `created_at`
- `updated_at`

### captures

- `id`
- `user_id`
- `type`
- `content`
- `urgency`
- `status`
- `created_at`
- `updated_at`

### chat_messages

- `id`
- `user_id`
- `role`
- `content`
- `created_at`

### user_settings

- `user_id`
- `microphone_enabled`
- `notifications_enabled`
- `theme`

### consents

- `id`
- `user_id`
- `terms_version`
- `privacy_version`
- `accepted_at`

Do not store unnecessary sensitive information. Do not store raw microphone recordings by default. Only store audio if the user explicitly chooses a feature that requires storage.

## 8. Database / Storage Architecture

Prepare the application for Supabase.

Use:

- Supabase Auth
- Supabase Postgres
- Supabase Storage only when file storage is necessary

The frontend should use a service layer rather than placing database calls inside every component.

Create conceptual services:

- `authService`
- `profileService`
- `captureService`
- `chatService`
- `consentService`
- `subscriptionService`

Keep the implementation modular.

## 9. RevenueCat / Shipaton Paywall

Preserve the existing NeuroNotes Paywall screen and redesign it to feel premium.

Remove emoji feature icons. Do NOT use ⚡ 🌿 ⏱ 🎲 🔊. Use consistent minimal line icons instead.

Paywall copy:

- "NeuroNotes Pro"
- "Your brain deserves the full experience."
- "Try free for 7 days."

Benefits:

- Capture without limits
- Smart organization
- Gentle nudge timing
- Hyperfocus Timer
- Task Roulette
- Capture Replay

Use short benefit descriptions.

Pricing:

- Monthly
- Yearly

Make Yearly visually dominant. Use "Best value" and "Save 37%". Do not use red, bright orange, or bright yellow.

CTA:

- "Start 7-day free trial"
- Secondary action: "Stay on free plan"
- Fine print: "No charge today · Cancel anytime"

Create a subscription service abstraction:

- `subscriptionService.getOfferings()`
- `subscriptionService.purchase(packageId)`
- `subscriptionService.restorePurchases()`
- `subscriptionService.getCustomerStatus()`

Use the entitlement `"pro"`. Do not put RevenueCat secret keys in frontend code.

For the current web prototype, keep the UI integration-ready for RevenueCat Web SDK. For the eventual mobile build, structure the service so it can be replaced by the React Native RevenueCat SDK.

## 10. Pro Feature Gating

Create a simple entitlement helper:

`hasProAccess()`

Use it to protect premium features.

Free:

- Basic capture
- Limited AI companion usage
- Basic inbox
- Basic Focus

Pro:

- Unlimited capture
- Advanced AI companion
- Hyperfocus Timer
- Task Roulette
- Capture Replay
- Advanced insights
- Additional cat characters

When a free user attempts to access a Pro feature, open the NeuroNotes Pro Paywall. Do not simply disable the feature without explanation.

## 11. Visual System

Maintain the existing NeuroNotes palette:

- Background: `#F7F5F2`
- Surface: `#FFFFFF`
- Muted: `#F0EDE8`
- Subtle: `#E8E4DF`
- Text: `#2C2C2C`
- Secondary: `#7A7570`
- Sage: `#7B9E87`
- Sage light: `#D4E4D9`
- Lavender: `#9B8EC4`
- Lavender light: `#E8E4F0`
- Amber: `#C4956A`
- Amber light: `#F0D5B8`

Do not introduce neon colors, aggressive gradients, generic AI purple gradients, or excessive glassmorphism. Do not use excessive rounded cards.

## 12. Design Personality

The entire app should feel calm, artistic, intelligent, warm, slightly playful, premium, and human.

It should NOT feel generic SaaS, clinical, corporate, like a generic AI chatbot, like a generic productivity app, emoji-heavy, or template-generated.

The cat characters should provide personality. The typography should provide editorial character. The abstract shapes should provide visual identity. The AI Companion should provide emotional warmth. The Capture experience should remain the core product action.

## 13. Important Implementation Rule

Do not destroy existing working screens. Modify the existing project incrementally. Reuse existing components where appropriate. Keep the current navigation. Keep the current Capture, Inbox, Focus, Win, and Paywall functionality. Add the new Profile, Companion, Consent, and permission flows cleanly.

Before changing any existing component, preserve its current behavior.

The final application should be a coherent NeuroNotes product, not a collection of unrelated feature screens.