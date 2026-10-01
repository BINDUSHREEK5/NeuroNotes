Modify the EXISTING NeuroNotes application.

Do NOT rebuild the project from scratch.
Do NOT remove existing screens.
Do NOT remove existing navigation.
Do NOT replace the existing application architecture unnecessarily.

I want to extend the existing NeuroNotes product with the following features while preserving the current visual direction.

==================================================
1. GLOBAL TYPOGRAPHY
==================================================

Replace the current Inter typography system.

Use:

DISPLAY FONT:
DM Serif Display

UI / BODY FONT:
Manrope

Use DM Serif Display only for major emotional/product headlines.

Examples:
"Your brain is not broken."
"It just works differently."
"Your brain deserves the full experience."
Major Focus / Win headlines.

Use Manrope for:
- body text
- buttons
- navigation
- cards
- labels
- inputs
- pricing
- feature descriptions
- chatbot messages
- settings
- profile
- bottom navigation

Typography:

Display:
DM Serif Display
36px
line-height 42px
regular

Large heading:
DM Serif Display
30px
line-height 36px
regular

Heading:
Manrope
20px
line-height 28px
600

Body:
Manrope
16px
line-height 26px
400

Label:
Manrope
13px
line-height 18px
600

Micro:
Manrope
11px
line-height 14px
500

Do not use DM Serif Display for dense UI.

The typography should feel:
editorial
warm
premium
creative
calm

But never difficult to read.

==================================================
2. AI COMPANION
==================================================

Add a NeuroNotes AI Companion experience.

Create a dedicated conversational interface that visually belongs to NeuroNotes.

The chatbot should feel calm and personal, NOT like a generic AI assistant.

Header:

"NeuroNotes Companion"

Small subtitle:

"You're allowed to have messy days."

Chat interface:

- User messages aligned right
- Assistant messages aligned left
- Soft cream/white message surfaces
- No aggressive blue/purple AI styling
- No robot imagery
- No generic AI sparkle branding
- Generous spacing
- Large readable text
- Calm typing indicator

Include suggested conversation starters:

"I'm overwhelmed."
"I can't get started."
"I had a bad day."
"I actually got something done!"
"I don't know what to do first."

The assistant should respond with warmth, validation and one practical next step when appropriate.

Keep responses short.

Do not present the AI as a therapist.

Do not diagnose the user.

Do not encourage emotional dependency.

Create a service abstraction:

chatService.sendMessage(message)

The frontend should call:

POST /api/chat

Do NOT place AI provider secret keys in frontend code.

The API key must remain server-side.

Create loading, error and retry states.

==================================================
3. PROFILE + CAT CHARACTER SYSTEM
==================================================

Create a Profile screen accessible from Settings.

Profile should contain:

Profile heading:
"Your space"

Display name

Selected cat character

"Choose your companion"

Create a character selection grid using built-in NeuroNotes cat characters.

Example characters:

Sage Cat
Lavender Cat
Amber Cat
Cloud Cat
Cocoa Cat
Peach Cat

Do NOT require users to upload images.

The characters should be bundled app assets.

Store only the selected identifier:

avatar_id

Example:

avatar_id: "lavender-cat"

Allow the user to change their selected cat at any time.

The selected cat should appear consistently in:
- Profile
- AI Companion header/avatar
- relevant empty states
- optional Win moments

Do not overuse the cat.

It is a secondary personality element, not the entire brand.

==================================================
4. TERMS + PRIVACY CONSENT
==================================================

Create a first-use consent screen before users access microphone-dependent features.

Include:

"Before we begin"

"NeuroNotes needs your permission to provide its core features."

Include links:

Terms of Service
Privacy Policy

Checkbox:

"I agree to the Terms of Service and Privacy Policy."

Primary button:

"Continue"

Do not claim that accepting Terms grants microphone access.

The app must separately request microphone permission when Capture is first used.

Store consent information:

terms_version
privacy_version
accepted_at
user_id

Do not store only a boolean.

==================================================
5. COOKIE CONSENT
==================================================

For the web version, add a minimal cookie consent banner.

Text:

"NeuroNotes uses essential cookies to keep the app working."

Buttons:

"Accept"

"Privacy settings"

Do not request cookie consent as a substitute for microphone permission.

Do not make the banner visually aggressive.

Use the NeuroNotes design system.

==================================================
6. MICROPHONE PERMISSION
==================================================

Do not request microphone access immediately when the application opens.

Request it when the user first activates Capture.

Before triggering the browser permission dialog, show:

"Ready to capture?"

"NeuroNotes uses your microphone to turn your thoughts into notes."

Buttons:

"Allow microphone"

"Not now"

When the user selects Allow microphone, request browser microphone permission.

Use navigator.mediaDevices.getUserMedia({ audio: true }) for the web implementation.

Handle:
- permission granted
- permission denied
- microphone unavailable
- retry

Do not pretend that microphone permission has been granted simply because the user accepted Terms.

==================================================
7. DATA MODEL
==================================================

Create frontend service interfaces that are ready to connect to Supabase.

Data models:

profiles:
- id
- user_id
- display_name
- avatar_id
- created_at
- updated_at

captures:
- id
- user_id
- type
- content
- urgency
- status
- created_at
- updated_at

chat_messages:
- id
- user_id
- role
- content
- created_at

user_settings:
- user_id
- microphone_enabled
- notifications_enabled
- theme

consents:
- id
- user_id
- terms_version
- privacy_version
- accepted_at

Do not store unnecessary sensitive information.

Do not store raw microphone recordings by default.

Only store audio if the user explicitly chooses a feature that requires storage.

==================================================
8. DATABASE / STORAGE ARCHITECTURE
==================================================

Prepare the application for Supabase.

Use:

Supabase Auth
Supabase Postgres
Supabase Storage only when file storage is necessary.

The frontend should use a service layer rather than placing database calls inside every component.

Create conceptual services:

authService
profileService
captureService
chatService
consentService
subscriptionService

Keep the implementation modular.

==================================================
9. REVENUECAT / SHIPATON PAYWALL
==================================================

Preserve the existing NeuroNotes Paywall screen.

Redesign it to feel premium.

Remove emoji feature icons.

Do NOT use:
⚡
🌿
⏱
🎲
🔊

Use consistent minimal line icons instead.

Paywall copy:

"NeuroNotes Pro"

"Your brain deserves the full experience."

"Try free for 7 days."

Benefits:

Capture without limits
Smart organization
Gentle nudge timing
Hyperfocus Timer
Task Roulette
Capture Replay

Use short benefit descriptions.

Pricing:

Monthly
Yearly

Make Yearly visually dominant.

Use:

"Best value"

"Save 37%"

Do not use red, bright orange or bright yellow.

CTA:

"Start 7-day free trial"

Secondary action:

"Stay on free plan"

Fine print:

"No charge today · Cancel anytime"

Create a subscription service abstraction:

subscriptionService.getOfferings()
subscriptionService.purchase(packageId)
subscriptionService.restorePurchases()
subscriptionService.getCustomerStatus()

Use the entitlement:

"pro"

Do not put RevenueCat secret keys in frontend code.

For the current web prototype, keep the UI integration-ready for RevenueCat Web SDK.

For the eventual mobile build, structure the service so it can be replaced by the React Native RevenueCat SDK.

==================================================
10. PRO FEATURE GATING
==================================================

Create a simple entitlement helper:

hasProAccess()

Use it to protect premium features.

Examples:

Free:
- basic capture
- limited AI companion usage
- basic inbox
- basic Focus

Pro:
- unlimited capture
- advanced AI companion
- Hyperfocus Timer
- Task Roulette
- Capture Replay
- advanced insights
- additional cat characters

When a free user attempts to access a Pro feature:

Open the NeuroNotes Pro Paywall.

Do not simply disable the feature without explanation.

==================================================
11. VISUAL SYSTEM
==================================================

Maintain the existing NeuroNotes palette.

Background:
#F7F5F2

Surface:
#FFFFFF

Muted:
#F0EDE8

Subtle:
#E8E4DF

Text:
#2C2C2C

Secondary:
#7A7570

Sage:
#7B9E87

Sage light:
#D4E4D9

Lavender:
#9B8EC4

Lavender light:
#E8E4F0

Amber:
#C4956A

Amber light:
#F0D5B8

Do not introduce neon colors.

Do not use aggressive gradients.

Do not use generic AI purple gradients.

Do not use excessive glassmorphism.

Do not use excessive rounded cards.

==================================================
12. DESIGN PERSONALITY
==================================================

The entire app should feel:

calm
artistic
intelligent
warm
slightly playful
premium
human

It should NOT feel:

generic SaaS
clinical
corporate
generic AI chatbot
generic productivity app
emoji-heavy
template-generated

The cat characters should provide personality.

The typography should provide editorial character.

The abstract shapes should provide visual identity.

The AI Companion should provide emotional warmth.

The Capture experience should remain the core product action.

==================================================
13. IMPORTANT IMPLEMENTATION RULE
==================================================

Do not destroy existing working screens.

Modify the existing project incrementally.

Reuse existing components where appropriate.

Keep the current navigation.

Keep the current Capture, Inbox, Focus, Win and Paywall functionality.

Add the new Profile, Companion, Consent and permission flows cleanly.

Before changing any existing component, preserve its current behavior.

The final application should be a coherent NeuroNotes product, not a collection of unrelated feature screens.