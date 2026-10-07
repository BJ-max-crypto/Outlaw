# Runout

An open island you can keep playing. Drive or steal a car, take a boat from the dock, clock in at the port, and the wages follow you. Each stock on the desk has its own chart. When the cops come, survive for a minute and a half and they break off. Getting arrested cuts your cash in half. There are no rounds.

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
- After you clock in, shift pay continues anywhere on the island.
- A chase lasts 90 seconds. The timer at the top is how long until the cops quit.
- **Hold R** inside a business you do not own to rob the register.
- **1 / 2 / 3** at the grocery to buy food. **G** eats it and restores energy.
- **Pinch** with two fingers to zoom the island. A trackpad pinch (ctrl + scroll) does the same. You stay in the center of the screen.
- Click the corner **map** to expand it. **M** toggles it too.

## Online

Local play does not need an account. Online play does.

Copy `.env.example` to `.env.local` and add your Clerk and Supabase keys. Run `supabase/schema.sql` in the Supabase project. Signed-in players share positions on the `runout-city` channel and save cash, energy, job, businesses, and vehicles through `/api/profile`.
