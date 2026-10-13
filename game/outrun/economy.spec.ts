import assert from "node:assert/strict";
import { OUTRUN } from "./config";
import { freshSave, grantScore, incomePerMinute, missionPayout, netWorth, purchase, settle, upgrade } from "./economy";

const start = 1_700_000_000_000;
const save = freshSave(start, "Ada");
assert.equal(save.cash, 1000);
assert.equal(incomePerMinute(save), 0);
assert.equal(netWorth(save), 1000);

const broke = purchase(save, "warehouse", start);
assert.equal(broke.error, "Not enough cash.");
assert.equal(broke.save.cash, 1000);

const bought = purchase(save, "convenience", start);
assert.equal(bought.error, undefined);
assert.equal(bought.save.cash, 500);
assert.equal(incomePerMinute(bought.save), 30);
assert.equal(netWorth(bought.save), 500 + 500);

const tenMinutes = settle(bought.save, start + 10 * 60_000);
assert.equal(tenMinutes.cash, 500 + 300);

const tooLong = settle(bought.save, start + 10 * 60 * 60_000);
assert.equal(tooLong.cash, 500 + 30 * (8 * 60));

const again = settle(tenMinutes, tenMinutes.lastSeen);
assert.equal(again.cash, tenMinutes.cash);

const lifted = upgrade(bought.save, "convenience", start);
assert.equal(lifted.save.cash, 150);
assert.equal(incomePerMinute(lifted.save), 55);
assert.equal(upgrade(lifted.save, "convenience", start).error, "Already upgraded.");

const clear = missionPayout(50_000, 0);
assert.equal(clear.payout, 180 + 150 + 200);
const messy = missionPayout(5_000, 2);
assert.ok(messy.payout >= OUTRUN.minimumClearPay);

const scored = grantScore(bought.save, clear.payout, start);
assert.equal(scored.bestScore, clear.payout);
assert.equal(scored.cash, 500 + clear.payout);

const negative = settle({ ...save, cash: -40 }, start);
assert.equal(negative.cash, 0);

console.log("economy ok");
