# OUTRUN

A top-down getaway you can leave and come back to. Walk a small city, run one package to the exit, and buy two businesses that keep paying while the browser is closed.

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Play

- **WASD** or arrow keys to move
- **Getaway** starts at the parking lot. Pick up the package by the warehouse and reach the south exit before the clock or the third tag
- **Business** buys the convenience store and the warehouse. Each can be upgraded once
- **Ranks** shows your net worth next to sample rivals marked DEMO
- **Reset save** on the business screen wipes this browser

Cash, businesses, upgrades, and your best getaway score stay in local storage. Wages accrue from the last visit, capped at eight hours.

Supabase is still an optional client for a later account sync. Leave `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` empty and the game runs offline. `lib/multiplayer/transport.ts` is the seam for a future session layer.
