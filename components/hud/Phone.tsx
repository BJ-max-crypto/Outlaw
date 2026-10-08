"use client";

import { useState, type ReactNode } from "react";
import { formatCash } from "@/lib/game/format";
import { BLACK_MARKET, HOME_THEMES, type SocialView } from "@/lib/sandbox/catalog";
import { BUSINESSES } from "@/game/world/catalog";

type PhoneProps = {
  social: SocialView | null;
  open: boolean;
  onClose: () => void;
  onAction: (action: string, extra?: Record<string, unknown>) => void;
};

const TABS = ["STREET", "CARS", "BANK", "CREW", "WORK", "HOME"] as const;

export default function Phone({ social, open, onClose, onAction }: PhoneProps) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("STREET");
  const [crewName, setCrewName] = useState("");
  const [crewCode, setCrewCode] = useState("");
  const [amount, setAmount] = useState("1000");
  const [reward, setReward] = useState("15000");
  if (!open || !social) return null;
  const dollars = Math.max(0, Math.floor(Number(amount) || 0));
  const purse = Math.max(0, Math.floor(Number(reward) || 0));

  return (
    <div className="pointer-events-auto absolute bottom-4 right-4 z-30 flex w-[min(26rem,calc(100%-2rem))] flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#14161b]/96 shadow-2xl">
      <div className="flex items-center justify-between px-4 py-3">
        <p className="text-[11px] font-semibold tracking-[0.32em] text-[#d7c08a]">CITY</p>
        <button type="button" onClick={onClose} className="text-[10px] tracking-[0.16em] text-[#a39e94]">
          CLOSE
        </button>
      </div>
      <div className="flex gap-1 px-3">
        {TABS.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setTab(name)}
            className={`flex-1 rounded-full py-1 text-[8px] font-semibold tracking-[0.08em] ${tab === name ? "bg-[#e25b2a] text-[#1a0d08]" : "text-[#a39e94]"}`}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="max-h-[28rem] space-y-3 overflow-y-auto px-4 py-3 text-sm text-[#f4f1ea]">
        {tab === "STREET" && (
          <>
            <Notice social={social} />
            {social.bountyOnYou > 0 && <p className="text-[#e7b8a4]">A {formatCash(social.bountyOnYou)} bounty is on you.</p>}
            {social.bounties.map((bounty) => (
              <Row key={bounty.id} title={bounty.username} detail={`${bounty.stars} stars · ${formatCash(bounty.reward)}`}>
                <Action label="CATCH" onClick={() => onAction("bounty-claim", { businessId: bounty.id })} />
              </Row>
            ))}
            {social.bounties.length === 0 && <p className="text-[#a39e94]">No open bounties. A robbery of 2 stars or more posts one.</p>}
            {social.race && (
              <p>
                Race checkpoint {social.race.checkpoint} / {social.race.total}. Purse {formatCash(social.race.pot)}.
              </p>
            )}
            {social.raceOpen && (
              <Row title={`${social.raceOpen.by} wants a race`} detail={`Entry ${formatCash(social.raceOpen.entry)}`}>
                <Action label="JOIN" onClick={() => onAction("race-join", { businessId: social.raceOpen?.id })} />
              </Row>
            )}
            <div className="flex gap-2">
              <Action label="RACE THE CLOCK" onClick={() => onAction("race-clock")} />
              <Action label="INVITE A RACE" onClick={() => onAction("race-open")} />
            </div>
            {social.auction && (
              <Row title={social.auction.name} detail={`${social.auction.leader} · ${formatCash(social.auction.bid)} · ${Math.ceil(social.auction.endsIn / 1000)}s`}>
                <Action label="BID +$1000" onClick={() => onAction("bid", { quantity: social.auction ? social.auction.bid + 1000 : 1000 })} />
              </Row>
            )}
            {social.marketOpen ? (
              BLACK_MARKET.map((item) => (
                <Row key={item.id} title={item.name} detail={`${formatCash(item.price)} · ${item.detail}`}>
                  <Action label="BUY" onClick={() => onAction("market-buy", { businessId: item.id })} />
                </Row>
              ))
            ) : (
              <p className="text-[#a39e94]">The black market opens after a robbery or a stolen car.</p>
            )}
          </>
        )}
        {tab === "CARS" && (
          <>
            {social.garage.map((car) => (
              <Row key={car.id} title={`${car.name} · ${car.tier}`} detail={`${formatCash(car.price)} · speed ${car.speed}`}>
                {car.owned ? (
                  <Action label={social.spawned === car.id ? "OUT" : "SPAWN"} onClick={() => onAction("garage-spawn", { businessId: car.id })} />
                ) : (
                  <Action label="BUY" onClick={() => onAction("garage-buy", { businessId: car.id })} />
                )}
              </Row>
            ))}
            {social.spawned && <Action label="STORE THE CAR" onClick={() => onAction("garage-store")} />}
            {social.stolen.map((car) => (
              <Row key={car.id} title={`${car.name} IS HOT`} detail={`Clean the title for ${formatCash(car.cleanCost)}`}>
                <Action label="CLEAN" onClick={() => onAction("clean-title", { businessId: car.id })} />
              </Row>
            ))}
          </>
        )}
        {tab === "BANK" && (
          <>
            {social.loan ? (
              <Row title="LOAN" detail={`${formatCash(social.loan.balance)} left${social.loan.late ? " · LATE" : ""} · due ${Math.ceil(social.loan.dueIn / 60000)} min`}>
                <Action label="PAY" onClick={() => onAction("loan-pay", { quantity: dollars })} />
              </Row>
            ) : (
              <Row title="BORROW" detail={`${formatCash(social.loanOffer)} now, pay back ${formatCash(Math.floor(social.loanOffer * 1.08))}`}>
                <Action label="TAKE LOAN" onClick={() => onAction("loan-take")} />
              </Row>
            )}
            <label className="block text-[10px] tracking-[0.16em] text-[#a39e94]">
              AMOUNT
              <input value={amount} onChange={(event) => setAmount(event.target.value.replace(/[^\d]/g, "").slice(0, 7))} className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-[#f4f1ea] outline-none" />
            </label>
            <Row title="VEHICLE INSURANCE" detail={social.insurance.vehicles ? "Active · $500 a day" : "$500 a day. A bust refunds part of the car."}>
              <Action label={social.insurance.vehicles ? "ON" : "BUY"} onClick={() => onAction("insure", { businessId: "vehicles" })} />
            </Row>
            <Row title="BUSINESS INSURANCE" detail={social.insurance.businesses ? "Active · $2,000 a day" : "$2,000 a day. A crash does not cut shop pay."}>
              <Action label={social.insurance.businesses ? "ON" : "BUY"} onClick={() => onAction("insure", { businessId: "businesses" })} />
            </Row>
            <div className="flex gap-2">
              <Action label="SAFE IN" onClick={() => onAction("safe", { side: "in", quantity: dollars })} />
              <Action label="SAFE OUT" onClick={() => onAction("safe", { side: "out", quantity: dollars })} />
            </div>
            <p className="text-[#a39e94]">Safe holds {formatCash(social.home.safe)}. A bust does not touch it.</p>
          </>
        )}
        {tab === "CREW" && (
          <>
            {social.crew ? (
              <>
                <p className="font-display text-3xl">{social.crew.name}</p>
                <p className="text-[#a39e94]">Code {social.crew.code} · treasury {formatCash(social.crew.treasury)} · worth {formatCash(social.crew.worth)}</p>
                {social.crew.members.map((member) => (
                  <p key={member.name}>
                    {member.name} · put in {formatCash(member.put)}
                  </p>
                ))}
                <Action label="CONTRIBUTE" onClick={() => onAction("crew-pay", { quantity: dollars })} />
                <Action label="LEAVE" onClick={() => onAction("crew-leave")} />
                {social.crewShop ? (
                  <p>
                    {social.crewShop.name} funded {formatCash(social.crewShop.funded)} / {formatCash(social.crewShop.cost)}. Your cut {social.crewShop.yourCut}%.
                  </p>
                ) : (
                  <p className="text-[#a39e94]">Fund a shop together. Pay is split by what each person put in.</p>
                )}
                {BUSINESSES.map((business) => (
                  <Row key={business.id} title={business.name} detail={formatCash(business.price)}>
                    <Action label="FUND" onClick={() => onAction("crew-fund", { businessId: business.id, quantity: dollars })} />
                  </Row>
                ))}
              </>
            ) : (
              <>
                <input value={crewName} onChange={(event) => setCrewName(event.target.value)} placeholder="Crew name" className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 outline-none" />
                <Action label="START CREW $1,000" onClick={() => onAction("crew-create", { eventId: crewName })} />
                <input value={crewCode} onChange={(event) => setCrewCode(event.target.value.toUpperCase())} placeholder="CODE" maxLength={4} className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 outline-none" />
                <Action label="JOIN" onClick={() => onAction("crew-join", { eventId: crewCode })} />
              </>
            )}
            {social.crewBoard.map((row) => (
              <p key={row.name} className="text-[#d9d3c7]">
                {row.name} · {formatCash(row.worth)}
              </p>
            ))}
          </>
        )}
        {tab === "WORK" && (
          <>
            {social.jobs.map((job) => (
              <Row key={job.id} title={job.title} detail={`${job.by} · ${formatCash(job.reward)} · ${job.detail}`}>
                {job.accepted ? (
                  <Action label="I'M THERE" onClick={() => onAction("job-finish", { businessId: job.id })} />
                ) : job.by === "YOU" ? null : (
                  <Action label="TAKE" onClick={() => onAction("job-take", { businessId: job.id })} />
                )}
              </Row>
            ))}
            <label className="block text-[10px] tracking-[0.16em] text-[#a39e94]">
              YOUR REWARD
              <input value={reward} onChange={(event) => setReward(event.target.value.replace(/[^\d]/g, "").slice(0, 6))} className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 outline-none" />
            </label>
            <Action label="POST A PORT DELIVERY" onClick={() => onAction("job-post", { eventId: "delivery", quantity: purse })} />
          </>
        )}
        {tab === "HOME" && (
          <>
            <p>Safe {formatCash(social.home.safe)}</p>
            <p className="text-[#a39e94]">{social.home.trophies.length > 0 ? social.home.trophies.join(" · ") : "Trophies show up here as you earn them."}</p>
            <div className="flex gap-2">
              {HOME_THEMES.map((theme) => (
                <Action key={theme} label={theme.toUpperCase()} onClick={() => onAction("theme", { eventId: theme })} />
              ))}
            </div>
            <div className={`h-16 rounded-2xl ${social.home.theme === "sand" ? "bg-[#c4a574]" : social.home.theme === "night" ? "bg-[#1b2430]" : "bg-[#3a4150]"}`} />
          </>
        )}
      </div>
    </div>
  );
}

function Notice({ social }: { social: SocialView }) {
  return (
    <>
      {social.flash && (
        <p>
          {social.flash.name}. {social.flash.detail}
        </p>
      )}
      {social.drop?.live && <p>A supply drop is on the island. Get there first.</p>}
    </>
  );
}

function Row({ title, detail, children }: { title: string; detail: string; children?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-t border-white/10 pt-2">
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-xs text-[#a39e94]">{detail}</p>
      </div>
      {children}
    </div>
  );
}

function Action({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="shrink-0 rounded-full bg-[#d7c08a] px-3 py-1 text-[10px] font-semibold tracking-[0.12em] text-[#1a1408]">
      {label}
    </button>
  );
}
