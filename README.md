# Runout

An open island you can keep playing. Drive or steal a car, take a boat from the pier, work the port, invest in stocks, and eat when your energy drops. Port wages stop the moment you leave the port. Getting arrested cuts your cash in half. There are no rounds.

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Controls

- **WASD** or arrow keys to move. The same keys steer a car or boat.
- **Shift** to sprint. Sprinting spends energy, and low energy slows you down.
- **E** to drive a vehicle, clock in at the port, buy a business, or open the stock desk.
- **F** to steal a vehicle without getting in, or to get out. Walking up to one does not start it.
- **Hold R** inside a business you do not own to rob the register.
- **1 / 2 / 3** at the grocery to buy food. **G** eats it and restores energy.
- **Pinch** with two fingers to zoom the island. A trackpad pinch (ctrl + scroll) does the same. You stay in the center of the screen.
- Click the corner **map** to expand it. **M** toggles it too.

## Online

Local play does not need an account. Online play does.

Copy `.env.example` to `.env.local` and add your Clerk and Supabase keys. Run `supabase/schema.sql` in the Supabase project. Signed-in players share positions on the `runout-city` channel and save cash, energy, job, businesses, and vehicles through `/api/profile`.
