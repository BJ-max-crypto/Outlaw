# Runout

An open island you can keep playing. Drive or steal a car, take a boat from the dock, and clock in at the port. The wage pays only while you stay there. Each stock on the desk has its own chart, and you type how many shares to buy or sell. When the cops come, survive for a minute and a half and they break off. Getting arrested cuts your cash in half. There are no rounds.

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Controls

- **WASD** or arrow keys to move. The same keys steer a car or boat.
- **Shift** to sprint. Sprinting spends energy, and low energy slows you down.
- **E** buys a car, drives one you already own, clock in at the port, buy a business, or open the stock desk. While driving, **E** pays to fill the tank.
- **F** steals a car. Buying or stealing drops it on the road just outside the dealership and puts you in the seat. A car stays still until you release the keys and accelerate. **F** gets you out.
- Driving burns gas. The gas bar shows what is left. An empty tank coasts to a stop until you pay to refill.
- Every road is open. Only the building walls block you, and each door faces the road.
- After you clock in, shift pay runs only while you are at the port. Leaving stops the wage. Walk back in and it starts again.
- A chase lasts 90 seconds. The timer at the top is how long until the cops quit.
- **Hold R** inside a business you do not own to rob the register.
- Walk into the grocery and the counter opens. Buy a taco, burger, or drink there. **G** eats what you are carrying and restores energy.
- **Pinch** with two fingers to zoom the island. A trackpad pinch (ctrl + scroll) does the same. You stay in the center of the screen.
- Click the corner **map** to expand it. **M** toggles it too.
- **Esc** returns to the dashboard. Singleplayer pauses there. Continue picks the same island back up.

## Dashboard

The game opens on a dashboard. Choose a username (2–16 characters), then **Singleplayer** or **Multiplayer**.

Singleplayer is the island on its own. There is no yacht. Progress is kept in the browser and posted to `/api/profile`.

Cash, businesses, stocks, and collectibles add up to a net worth on the cash card. The same four buildings can be bought and upgraded through three levels. Each level doubles that building's income, and the income keeps accruing for up to eight hours while you are away. The stock desk shows what the portfolio is worth, what you paid, and the return. Prices move on the server. Daily goals, achievements, and ranks open from the cash card. A world event banner sits under the timer and can be hidden. None of this moves the island, the buildings, or the camera.

Job pay still stops the moment you leave the port. Business income does not. Buying a business, upgrading it, trading shares, claiming a goal, and unlocking an achievement are checked on the server. A client cannot post an arbitrary cash balance after the first save.

Multiplayer opens an invite code. Friends join with that code, and the host presses **Start game**. Each player has an island. Buy a crossing boat for $1,000,000, sail the ocean, and step onto someone else's island to buy it for $1,000,000,000. Their businesses, job, and reinforcements then pay you. Reinforcements are $100,000 and add income on an island you still hold. First place is the richest player who owns every other island. There is no round-end screen.

## Shop

The AdSense loader is in the site head on every page (`app/layout.tsx`, publisher `ca-pub-8078670301082619`). A rewarded shop can double earnings for 30 or 60 seconds, or grant a small cash stake. Those buttons stay hidden until a finished ad can grant the reward (`SHOP_VISIBLE` in `lib/shop/rewards.ts`). The grant route is already live: `POST /api/shop` with `{ "rewardId": "double-earnings" | "overtime" | "stake" }`.

## Online

Local play does not need an account. The dashboard still asks for a username and stores it on this browser.

Copy `.env.example` to `.env.local` and add your Clerk and Supabase keys when you want accounts. Do not run `npx clerk init` from this repo. Run `supabase/schema.sql` in the Supabase project. That script adds `username`, stores cash as `bigint` (island purchases pass two billion), and creates `sessions`, `session_members`, `session_holdings`, and `shop_claims`.

With those keys, sign-up is required before the username step, and profiles are written to Supabase as well as the server memory used for a live invite. A session that is only in memory does not survive a server restart until it is read back from Supabase.
