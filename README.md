# Pianly

Pianly is a browser app that shows you *what* to play while you play it. Pick a piece, watch the notes scroll toward the keys, and hit them on a on-screen piano, your computer keyboard, a USB MIDI keyboard, or even through your mic (it listens for pitch and tells you if you’re on the right note). Wrong notes show up as misses so you can fix them in the moment instead of drilling bad muscle memory later.

It’s meant for everyday practice: open a song, play, repeat. Not a full lesson platform with grades and curricula — more like a smart sheet-music player that actually reacts to you.

## What you can do

- **Browse a song library** from nursery tunes and hymns up to classical staples (Easy, Medium, and Hard arrangements).
- **Play in the playground** with a falling-note view synced to MIDI, optional autoplay to hear how it should sound, and “free play” if you just want to mess around on the keys.
- **Use what you have** — no special hardware required, but MIDI feels great if you have it.
- **Create a free account** to save progress and use the playground; **Pianly Pro** unlocks the full catalog (all difficulties, not just the free Easy sampler).

Free tier gives you a chunk of Easy songs to try the flow; Pro is for people who want the whole library, including Medium and Hard.

## How it’s put together (for the curious)

The site is a React app talking to a Java/Spring API and a Postgres database. Sign-in uses JWTs; Pro status comes from Stripe subscriptions (checkout in the app, webhooks on the server). Song data is MIDI files bundled in the frontend; the playground renders and scores your input in the browser with Tone.js, Web MIDI, and pitch detection.

```
Browser (React)  →  API (Spring Boot)  →  Postgres
       ↓
    Stripe (subscriptions)
```

That’s the whole product: songs on screen, feedback while you play, accounts and Pro if you want everything unlocked.
