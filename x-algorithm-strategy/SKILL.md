---
name: X Algorithm Strategy
description: Optimize X (Twitter) posts for the For You feed algorithm - provides scoring rules, content strategy, and post templates for developer audiences
author: Angie Jones
version: "1.0"
status: stable
tags:
  - social-media
  - marketing
  - content-strategy
---

# X Algorithm Content Strategy

This skill helps you create X (Twitter) posts optimized for the For You feed algorithm, specifically targeting developer audiences.

## Algorithm Overview

X's recommendation system uses a **Grok-powered transformer model** that predicts engagement probabilities. The final score is:

```
Final Score = Σ (weight × P(action))
```

## Engagement Signals

### Positive Signals (boost your content)
| Signal | Action |
|--------|--------|
| `P(favorite)` | Likes |
| `P(reply)` | Replies - **high weight** |
| `P(repost)` | Retweets |
| `P(quote)` | Quote tweets - **high weight** |
| `P(share)` | Shares via DM, copy link |
| `P(click)` | Tweet expansion clicks |
| `P(profile_click)` | Profile visits |
| `P(video_view)` | Video quality views (VQV) |
| `P(photo_expand)` | Photo expansion |
| `P(dwell)` | Time spent reading |
| `P(follow_author)` | New followers |

### Negative Signals (hurt your content)
| Signal | Action |
|--------|--------|
| `P(not_interested)` | "Not interested" clicks |
| `P(block_author)` | Blocks |
| `P(mute_author)` | Mutes |
| `P(report)` | Reports |

## Content Strategy Rules

### 1. Optimize for Engagement Depth
Create content that drives multiple engagement types:
- Ask questions to drive replies
- Share insights worth quote-tweeting
- Include content that increases dwell time

### 2. Video Gets Special Treatment
The algorithm has a dedicated `VQV_WEIGHT` for videos. Consider:
- Demo videos of products/features
- Screen recordings of workflows
- Quick tutorials

### 3. Avoid Negative Signals
- Don't spam or over-post (triggers mutes)
- Stay focused on developer value (avoid off-topic controversy)
- Don't be overly promotional

### 4. Author Diversity Penalty
The algorithm penalizes multiple posts from the same author in a feed:
```
multiplier = (1.0 - floor) × decay^position + floor
```
**Quality over quantity** - space out posts, let one perform before posting another.

### 5. In-Network Priority
Content from followed accounts gets priority. Build genuine followers in the dev community.

### 6. Freshness Matters
Posts older than a threshold get filtered. Post when developers are active:
- Weekday mornings (9-11am)
- Lunch breaks (12-1pm)
- After work (5-7pm)

## Content Types for Developers

| Type | Why It Works |
|------|--------------|
| Build logs | High dwell time, replies, profile clicks |
| Hot takes on dev tools | Replies, quote tweets, shares |
| Code snippets with context | Photo expand, dwell |
| "TIL" moments | Relatable, shareable |
| Demo videos | Video quality views, shares |
| Open source updates | Profile clicks, follows, reposts |
| Bug stories | High engagement across all metrics |

## Post Templates

### Build in Public
```
🦆 Just shipped [feature] in [project]

The tricky part was [technical challenge]

Here's how we solved it: [brief explanation]

What would you have done differently?
```

### Developer Pain Point
```
Unpopular opinion: [controversial dev take]

Here's why: [reasoning]

Am I wrong? Tell me why 👇
```

### Show Don't Tell
```
[Video/GIF of product doing something cool]

No setup. No config. Just works.

Try it: [link]
```

### TIL Format
```
TIL: [surprising technical fact]

I always thought [common misconception]

But actually [the truth + why it matters]

Thread 🧵
```

### Bug Story
```
This bug took me [time] to find 😅

Symptoms: [what was happening]
What I tried: [failed attempts]
The actual cause: [surprising root cause]

Lesson learned: [takeaway]
```

## Checklist Before Posting

- [ ] Does this provide genuine value to developers?
- [ ] Is there a hook that encourages replies or quotes?
- [ ] Have I spaced this out from my last post?
- [ ] Is the timing good for developer audiences?
- [ ] Does this avoid triggering mutes/blocks (spam, off-topic controversy)?
- [ ] For threads: Is the first tweet compelling enough to stand alone?

## Keywords to Avoid

Many developers mute these - use sparingly or avoid:
- Excessive emojis or hype language
- "10x", "game-changer", "revolutionary"
- Generic marketing speak
- Crypto/Web3 terms (unless relevant)

## Source

Based on analysis of the open-sourced X algorithm: https://github.com/xai-org/x-algorithm
