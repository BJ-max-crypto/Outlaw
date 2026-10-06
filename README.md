# Runout

An open city you can keep playing. Work a shift, rob a business, buy or steal a car, buy a boat, and eat when your energy drops. Getting arrested cuts your cash in half. There are no rounds.

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Controls

- **WASD** or arrow keys to move. The same keys steer a car or boat.
- **Shift** to sprint. Sprinting spends energy, and low energy slows you down.
- **E** to buy a car, boat, or business, or to clock in at the night shift.
- **F** to enter a vehicle, steal a car, or get out.
- **Hold R** inside a business you do not own to rob the register.
- **1 / 2 / 3** at the mart to buy food. **G** eats it and restores energy.
- Click the corner **map** to expand it. **M** toggles it too.

## Online

Local play does not need an account. Online play does.

Copy `.env.example` to `.env.local` and add your Clerk and Supabase keys. Run `supabase/schema.sql` in the Supabase project. Signed-in players share positions on the `runout-city` channel and save cash, energy, job, businesses, and vehicles through `/api/profile`.
