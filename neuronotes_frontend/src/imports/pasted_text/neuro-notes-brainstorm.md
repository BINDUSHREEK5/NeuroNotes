# 🧠 NeuroNotes — Feature Brainstorm + Paywall Strategy
### Ideas that make judges stop and say "nobody else built this"

---

## HOW TO READ THIS DOC

Each idea has:
- What it is (plain English)
- Why it stands out
- Free or Pro (paywall placement)
- Build difficulty: Easy / Medium / Hard
- Impact on winning: ⭐ to ⭐⭐⭐⭐⭐

Start with the ⭐⭐⭐⭐⭐ ideas. Build those first.

---

## 🔴 TIER 1 — GAME CHANGERS
### These are the ideas no competitor will have

---

### 1. Brain Dump Mode ⭐⭐⭐⭐⭐

**What it is:**
A timed 2-minute voice recording where the user just talks
— stream of consciousness, chaotic, no structure needed.
When they stop, Claude splits the whole dump into individual
clean captures automatically.

**Example:**
User says: *"okay so I need to call the dentist and also
I keep forgetting to reply to Sarah's email and I had this
idea for the app while showering what if you could group
things by energy level like high energy tasks vs low energy
ones and also I'm feeling really scattered today"*

App returns 4 captures:
- task: "Call the dentist" · high urgency
- task: "Reply to Sarah's email" · medium
- idea: "Group tasks by energy level instead of priority"
- feeling: "Feeling scattered today"

**Why it stands out:**
ADHD thoughts don't come one at a time. Every other app
makes you capture one thing, organize it, then capture
the next. Brain Dump Mode gets everything out in one go —
exactly how ADHD brains actually work.

**Paywall:** FREE (it's the wow moment that converts)
**Build difficulty:** Medium — extend the classifier to split text
**Win categories:** Design, HAMM, Grand Prize, BuildInPublic

---

### 2. Energy Level Sorting ⭐⭐⭐⭐⭐

**What it is:**
Instead of "high/medium/low urgency" (time-based),
add an energy level tag: "🔋 High energy" / "⚡ Low energy" / "🌿 5 min"

User can ask: "What can I do right now with low energy?"
App shows only low-energy tasks → no overwhelm from seeing
tasks that need full focus when you're already depleted.

**Example captures:**
- "Call the dentist" → High energy (needs phone anxiety)
- "Reply to Sarah" → Medium energy
- "Organize bookmarks" → Low energy (can do on autopilot)
- "Read that article" → 5 min (tiny win available)

Claude auto-suggests the energy level from context.
User can override with one tap.

**Why it stands out:**
ADHD people often can't do their "urgent" tasks because
their energy doesn't match the task requirement. This is
the first app to account for that. It's also based on
real ADHD productivity research (body doubling, task-energy
matching are well-documented strategies).

**Paywall:** FREE to capture with energy tags, PRO to filter by energy
**Build difficulty:** Easy — add field to Capture model, update Claude prompt
**Win categories:** Design Award, Peace Prize, Grand Prize ⭐

---

### 3. Hyperfocus Timer ⭐⭐⭐⭐⭐

**What it is:**
A gentle Pomodoro-style timer BUT designed for ADHD brains:
- No alarming red countdown
- No guilt when you go over time
- Can extend with one tap ("5 more minutes")
- When timer ends: soft chime, NOT a jarring alarm
- Shows: "You focused for 28 minutes 🌿" (celebrates actual time)
- NOT "Session ended. 2 minutes over your goal ⚠️"

Three modes:
- Gentle (25 min focus / 5 min break — classic Pomodoro)
- Flow (no timer — just tracks how long you were focused)
- Micro (10 min — for when starting is the hardest part)

**Why it stands out:**
Pomodoro timers exist everywhere. None of them are designed
to not shame you when you hyperfocus past the end.
This is the first one that says: *hyperfocus is not a bug.*

**Paywall:** PRO — timer is a core Pro feature
**Build difficulty:** Easy — pure frontend, no backend needed
**Win categories:** Design, HAMM (strong monetization reason), Productivity Influencer

---

### 4. Emotional Check-In → Task Match ⭐⭐⭐⭐

**What it is:**
Every time user opens the app, optionally ask:
"How are you feeling right now? 🌿"
4 options (tap one):
  😤 Overwhelmed   😴 Low energy   😐 Okay   ⚡ Energized

App then surfaces tasks that MATCH that emotional state:
- Overwhelmed → shows ONLY 1 low-energy task + a kind message
- Low energy → shows only "5 min" tasks
- Okay → shows normal inbox
- Energized → shows high-priority tasks and "Let's go" mode

**Why it stands out:**
This is emotional intelligence built into a productivity app.
No other notes app does this. ADHD people's executive function
is heavily mood-dependent — this is the first app to
accommodate that scientifically.

**Paywall:** FREE check-in, PRO for the task-matching intelligence
**Build difficulty:** Medium — add state to frontend, filter logic in backend
**Win categories:** Peace Prize, Design, Grand Prize, BuildInPublic story

---

### 5. Body Double Mode ⭐⭐⭐⭐

**What it is:**
"Body doubling" is a real ADHD strategy — having someone
present while you work dramatically improves focus, even
if they're doing something completely different.

NeuroNotes Body Double:
- User taps "Work with me"
- App shows a calming ambient screen: soft animated gradient,
  a gentle timer counting up (not down)
- Small text: "Working alongside [X] others right now"
  (anonymised counter of other users in Body Double mode)
- Soft ambient sound option: rain / white noise / café
- One-tap "I'm done" → shows what you accomplished

This is a virtual co-working space, but framed as presence,
not productivity pressure.

**Why it stands out:**
Body doubling is one of the most effective ADHD interventions
known, but no app has built it in. Community element adds
viral growth potential (users invite friends to "body double").

**Paywall:** PRO — with ambient sounds and session tracking
**Build difficulty:** Medium — counter via Redis, ambient sounds via free audio files
**Win categories:** Peace Prize, Grand Prize, viral potential (Most Viral Award)

---

### 6. Thought Parking Lot ⭐⭐⭐⭐

**What it is:**
During a Hyperfocus Timer session or Focus Mode,
intrusive thoughts come up constantly for ADHD people.
("Oh I need to text back — wait what was I doing — oh also I forgot—")

"Thought Parking Lot" is a floating mini-capture button
that appears ONLY during focus sessions.
One tap → speak a thought → it parks in the Lot.
User never leaves the focus session.

After the session ends: "You parked 3 thoughts. Want to look?"
They appear in inbox, already classified.

**Why it stands out:**
Every ADHD person knows this problem. The thought comes,
they act on it, they lose their focus. This is the first
app to give that thought SOMEWHERE to go without breaking flow.

**Paywall:** PRO (requires active Focus/Timer session, which is Pro)
**Build difficulty:** Easy — floating button + voice capture, no new backend
**Win categories:** Design Award, Grand Prize, HAMM

---

### 7. Streak-Free Consistency Score ⭐⭐⭐⭐

**What it is:**
Instead of a streak (which breaks and causes shame),
NeuroNotes shows a "Consistency Score" — a rolling 14-day
percentage of days you showed up.

Visual: a gentle wave graph, warm sage color, showing the
last 14 days as dots. Some filled, some empty. No red dots.
Empty days are just... empty. No X mark. No broken chain.

"You showed up 9 of the last 14 days 🌿"
Not: "6-day streak BROKEN ❌"

It also celebrates YOUR pattern:
"You tend to capture most on Tuesday mornings — nice."

**Why it stands out:**
Streak mechanics are psychologically harmful for ADHD people.
Missing ONE day resets everything → shame → abandonment.
This replaces a punishing mechanic with a compassionate one.
That's a story that writes itself for BuildInPublic.

**Paywall:** FREE — visible to everyone (drives Pro conversion through goodwill)
**Build difficulty:** Easy — calculate from capture timestamps
**Win categories:** Peace Prize, BuildInPublic, Design

---

### 8. Capture Replay (Voice Journal) ⭐⭐⭐

**What it is:**
Keep the original audio recording of each voice capture.
User can tap any inbox item and hear their own voice again.

Two views:
- AI Summary (default) — the clean structured version
- Original Voice — tap to hear what you actually said

Why this matters: sometimes the AI summary loses nuance.
The original voice has the emotion, the context, the urgency
that words on a screen can't fully capture.
Also: voice journaling is deeply therapeutic for ADHD people.

**Paywall:** PRO — audio storage costs money (store on S3)
**Build difficulty:** Medium — save audio to S3, link to capture record
**Win categories:** Design, HAMM (strong Pro reason), Peace Prize

---

### 9. Weekly Brain Report ⭐⭐⭐

**What it is:**
Every Sunday, a gentle summary card:
"Here's your week 🧠"

- How many things you captured (number, not judgment)
- Most common capture type ("Mostly tasks this week")
- One insight: "You capture most at 8pm — your brain is active then"
- One kind word: "You showed up. That's what matters."
- Most captured emotion (if user used feeling captures)

Delivered as a push notification → opens to a beautiful
full-screen weekly card they can screenshot and share.

**Why it stands out:**
This creates a #BuildInPublic sharing moment INSIDE the app.
Users screenshot their weekly card and share it. Organic
viral growth built into the product.

**Paywall:** FREE — it's a sharing/growth mechanism
**Build difficulty:** Medium — aggregate queries + scheduled task (Railway cron)
**Win categories:** Most Viral, BuildInPublic, Grand Prize

---

### 10. Task Roulette ⭐⭐⭐

**What it is:**
When the user can't decide what to do next (decision paralysis
is a core ADHD symptom), they shake the phone or tap
"Surprise me 🎲"

App randomly selects ONE task from their inbox,
shows it full-screen in Focus Mode.

No explanation, no other options shown.
Just: one thing. Right now.

Optional: "Not this one" → reroll. But only 3 rerolls allowed,
then it commits. (The limit is gentle — not punishing.)

**Why it stands out:**
Decision paralysis kills ADHD productivity more than lack
of motivation. This is the first app to directly address it
with a delightful mechanic. It's also extremely shareable —
"the app that decides for me" is a great social post.

**Paywall:** PRO feature — infinite rerolls vs 3 for free
**Build difficulty:** Easy — random select from inbox, same Focus UI
**Win categories:** Design, HAMM, viral potential

---

## 🟡 TIER 2 — STRONG DIFFERENTIATORS
### Build these if time allows after Tier 1

---

### 11. Capture Templates ⭐⭐⭐

Pre-built voice prompts for common ADHD capture moments:
- "Morning brain dump" → starts a 2-min timer with prompt
- "Meeting notes" → captures with meeting context
- "Intrusive thought" → quick single thought, no processing
- "Grocery run" → list mode, quick fire items

**Paywall:** Free templates are 3. PRO unlocks custom templates.
**Build difficulty:** Easy — predefined Claude prompts per template

---

### 12. Gentle Accountability Partner ⭐⭐⭐

User sets ONE goal for the day (not a list — just one).
"Today I want to: ___________"

App checks in once in the afternoon:
"How's your one thing going? 🌿"
Three options: "Done ✓" / "In progress" / "Not started (that's okay)"

If not started: "Want to start now? I'll clear your screen for 10 minutes."
No guilt. Just a gentle hand extended.

**Paywall:** PRO — daily goal tracking + check-ins
**Build difficulty:** Medium — daily goal model + scheduled nudge

---

### 13. Capture by Photo ⭐⭐⭐

Take a photo of something (whiteboard, sticky note, receipt,
handwritten list) — Claude reads it and converts to captures.

Real ADHD use case: physical sticky notes are everywhere.
This bridges physical and digital capture in one tap.

**Paywall:** PRO — vision API costs money per image
**Build difficulty:** Medium — OpenAI Vision API, same classifier pipeline

---

### 14. Night Brain Mode ⭐⭐⭐

Triggered automatically after 9pm (or user's set time).
App shifts to a special mode:
- Extra dark background (not standard dark mode — warmer)
- Captures are tagged "night thought — review tomorrow"
- A gentle note: "This can wait until morning 🌙"
- Voice input auto-enabled (typing at night is harder)
- No urgent classifications after 9pm (even if it sounds urgent)

Why: ADHD brains race at night. This gives them a safe place
to capture without triggering action spiral.

**Paywall:** PRO — automatic mode + sleep-time filtering
**Build difficulty:** Easy — time-based CSS swap + classifier modifier

---

### 15. Share a Capture (Collaboration) ⭐⭐

Send a single capture to someone else (email or link).
They can add a comment or mark it done on their end.

Simple accountability: "I'm sending you this task — it means
I'm committing to doing it."

**Paywall:** PRO — sharing requires accounts on both ends
**Build difficulty:** Hard — new user model, sharing tokens, notifications

---

## 💰 PAYWALL STRUCTURE — FULL PLAN

### The Philosophy:
Free tier must be genuinely useful.
Pro must feel worth it, not like a hostage situation.
No dark patterns. No fake urgency. No countdown timers.

---

### FREE TIER — What everyone gets:

```
✅ 10 voice captures per day
✅ Unlimited text captures (voice is the premium feel)
✅ AI classification (task/note/idea/feeling) on all captures
✅ Unified inbox
✅ Basic urgency detection
✅ Emotional check-in (tap only, no task-matching)
✅ Consistency Score (14-day view)
✅ Weekly Brain Report card
✅ Archive (forever — never lose data)
✅ Brain Dump Mode — 3 per day
✅ 3 capture templates
```

Why give so much free? Because:
1. Users need to experience the magic before paying
2. Brain Dump + Weekly Card are your viral/sharing features
3. 10 captures/day is genuinely useful — not crippled

---

### NEURONOTES PRO — $7.99/month or $59.99/year

```
Everything in Free, plus:

🎙  Unlimited voice captures
⚡  Energy Level filtering (what can I do right now?)
🌿  Emotional state → task matching intelligence
⏱  Hyperfocus Timer (all modes + ambient sounds)
🅿️  Thought Parking Lot (during focus sessions)
🎲  Task Roulette (unlimited rerolls)
🧠  Brain Dump Mode unlimited (Free = 3/day)
🔊  Capture Replay (original voice audio)
📸  Capture by Photo
🌙  Night Brain Mode
📅  Gentle Accountability Partner (daily goal)
♾️  Unlimited capture templates (+ custom)
🔍  Full search history (Free = last 30 days only)
📊  Full capture analytics and patterns
```

---

### NEURONOTES FAMILY — $12.99/month

```
Everything in Pro, for up to 5 profiles

Perfect for:
- Parents managing their own ADHD + supporting an ADHD child
- Partners who both have ADHD
- Small accountability groups

Extra features:
👥  Shared captures (optional — always opt-in)
👀  Gentle caregiver view (non-invasive, child must approve)
🤝  Body Double Mode across family members
```

---

### PAYWALL TRIGGER MOMENTS (when to show it):

```
Trigger 1: 11th voice capture in a day
  Message: "You've captured 10 things today 🌿
            Want to keep going? Unlock unlimited."

Trigger 2: Trying to use Hyperfocus Timer
  Message: "Hyperfocus Timer is a Pro feature.
            Try free for 7 days."

Trigger 3: Trying to filter by energy level
  Message: "Energy filtering is Pro.
            It shows you what you can do RIGHT NOW."

Trigger 4: After Week 1 (gentle prompt, not forced)
  Message: "You've captured [n] things this week.
            NeuroNotes Pro helps you do even more with them."

Trigger 5: After marking 5 tasks done (celebrate first!)
  Message: "You've completed 5 things. 🎉
            Pro users complete [X]% more tasks on average.
            [optional upsell button]"

RULES FOR ALL PAYWALL TRIGGERS:
✅ Always show the free option to continue (never trap)
✅ Lead with what they GAIN not what they're LOSING
✅ Use calm language — no countdown timers, no "LIMITED TIME"
✅ Show the trial first: "Try free for 7 days"
✅ Never interrupt a capture in progress — only trigger after
```

---

### PAYWALL SCREEN DESIGN RULES:

```
HEADLINE:
❌ "Upgrade to Pro"         — transactional, cold
❌ "Unlock Premium"         — gatekeeping language
✅ "Your brain deserves the full experience."
✅ "You've been showing up. Let's make it easier."

SUBHEADLINE:
❌ "Get access to 15+ features"   — feature list selling
✅ "Try free for 7 days.          — benefit first, price second
    Cancel anytime. No questions."

PRICE DISPLAY:
Show yearly as monthly equivalent:
"$4.99/mo" with small text "billed as $59.99/year"
This is honest AND shows value — not a dark pattern

SAVE BADGE:
"Save 37%" on yearly — simple, factual, no fake strikethrough

FEATURE LIST:
Max 6 items. Use emojis. Short phrases.
Not a wall of text. Not bullet points with checkmarks.

CTA BUTTON:
"Start 7-day free trial" — primary
"Stay on free plan" — ghost link below (always present)
```

---

## 🏆 HOW THESE IDEAS MAP TO AWARD CATEGORIES

```
IDEA                    GRAND  HAMM   DESIGN  BUILD  PEACE  PROD
                        PRIZE         AWARD   PUBLIC PRIZE  INFLU
─────────────────────────────────────────────────────────────────
Brain Dump Mode          ✅     ✅      ✅      ✅
Energy Level Sorting     ✅     ✅      ✅      ✅      ✅     ✅
Hyperfocus Timer         ✅     ✅      ✅                    ✅
Emotional Check-In       ✅            ✅      ✅      ✅
Body Double Mode         ✅                    ✅      ✅
Thought Parking Lot      ✅            ✅      ✅
Streak-Free Score                      ✅      ✅      ✅
Weekly Brain Report      ✅            ✅      ✅
Task Roulette            ✅     ✅      ✅      ✅
Night Brain Mode                       ✅             ✅
```

---

## 📋 RECOMMENDED BUILD ORDER

Given your Sep 20 deadline, build in this order:

```
MUST HAVE (days 1-3):
1. Brain Dump Mode        — the wow demo moment
2. Energy Level tags      — simple, high impact
3. Paywall fully working  — required for Shipaton

SHOULD HAVE (days 4-5):
4. Hyperfocus Timer       — strong Pro feature
5. Emotional Check-In     — easy, high story value
6. Streak-Free Score      — easy to build, great for BuildInPublic

NICE TO HAVE (days 6-7):
7. Thought Parking Lot    — if timer is built, this is easy
8. Task Roulette          — 2 hour build, high delight
9. Weekly Brain Report    — strong viral/sharing feature
10. Night Brain Mode      — purely frontend, easy

SKIP FOR NOW (post-competition):
- Body Double Mode        — needs infrastructure
- Capture Replay          — S3 storage complexity
- Capture by Photo        — Vision API complexity
- Collaboration/Sharing   — most complex feature
```

---

*Every feature here solves a real problem that ADHD people face every day.*
*That's not a design choice — it's the entire thesis of NeuroNotes.*