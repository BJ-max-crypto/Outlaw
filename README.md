# OUTLAW

A local, top-down heist prototype. Rob Quick Stop, survive the chase, reach the van.

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Controls

- **WASD** or arrow keys to move
- **Hold E** inside Quick Stop to rob the register
- Walk into the marked van in the south lot to escape

## Notes

Supabase is wired as an optional client for later auth and profile saves. Leave `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` empty and the heist still runs offline. Copy `.env.example` when you are ready to connect a project.

Realtime multiplayer is not implemented. `lib/multiplayer/transport.ts` is the seam a later session layer can implement.
