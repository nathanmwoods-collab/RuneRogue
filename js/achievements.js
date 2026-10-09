'use strict';
// Achievements, styled on OSRS combat tasks (tier icons and jingle from the OSRS Wiki).
// Names riff on OSRS lore and r/2007scape memes. Each one awards trading sticks once.
// on: the game event that checks it. test(x): x is that event's detail; run, meta etc. are live globals.

const ACH_TIERS = {
  easy: { name: 'Easy', file: 'Combat_Achievements_-_easy_tier_icon.png', sticks: 10 },
  medium: { name: 'Medium', file: 'Combat_Achievements_-_medium_tier_icon.png', sticks: 25 },
  hard: { name: 'Hard', file: 'Combat_Achievements_-_hard_tier_icon.png', sticks: 50 },
  elite: { name: 'Elite', file: 'Combat_Achievements_-_elite_tier_icon.png', sticks: 100 },
  master: { name: 'Master', file: 'Combat_Achievements_-_master_tier_icon.png', sticks: 200 },
  grandmaster: { name: 'Grandmaster', file: 'Combat_Achievements_-_grandmaster_tier_icon.png', sticks: 400 },
};
// game.js exposes the live run and meta through RR (it keeps them private otherwise).
const ACH_JINGLE = 'The_Fight_Continues_(Fight_Cave).ogg';

const killsOf = (id) => (RR.run.killsBy && RR.run.killsBy[id]) || 0;
const bossDown = (id) => (x) => x && x.id === id;
const wearing = (id) => () => Object.values(RR.run.gear).includes(id);
const heroIs = (id) => RR.run.hero.id === id;
const areaNow = () => Math.floor(RR.run.stage / (WAVES_PER_AREA + 1));
const wornCount = () => SLOTS.filter((s) => s !== 'weapon' && RR.run.gear[s]).length;
const hpFrac = () => RR.run.p.hp / RR.stats().maxHp;
const clearedArea = (name) => (x) => x && x.boss && AREAS[x.area].name === name;

const ACHIEVEMENTS = [
  // ---------- Easy ----------
  { id: 'buying_gf', tier: 'easy', name: 'Buying GF 10k', desc: 'Start a run as the Level 3 Newb.', on: 'start', test: () => heroIs('newb') },
  { id: 'chicken', tier: 'easy', name: 'Chicken Tender', desc: 'Kill 10 chickens in one run.', on: 'kill', test: () => killsOf('chicken') >= 10 },
  { id: 'cowhide', tier: 'easy', name: 'Cowhide Tycoon', desc: 'Kill 25 cows in one run. Tanning is next.', on: 'kill', test: () => killsOf('cow') >= 25 },
  { id: 'goblin', tier: 'easy', name: 'Goblin Diplomacy', desc: 'Kill 20 goblins. Diplomacy failed.', on: 'kill', test: () => killsOf('goblin') >= 20 },
  { id: 'brutus', tier: 'easy', name: 'Holy Cow', desc: 'Defeat Brutus.', on: 'boss', test: bossDown('cow_boss') },
  { id: 'oh_dear', tier: 'easy', name: 'Oh Dear, You Are Dead!', desc: 'Die. It happens to the best of us.', on: 'death', test: () => true },
  { id: 'flipper', tier: 'easy', name: 'Grand Exchange Flipper', desc: 'Buy an item from the shop.', on: 'buy', test: () => true },
  { id: 'train', tier: 'easy', name: 'Skilling Pure? Never.', desc: 'Train a skill in the shop.', on: 'train', test: () => true },
  { id: 'pie', tier: 'easy', name: 'Redberry Pie Enjoyer', desc: 'Eat a Redberry pie.', on: 'pie', test: () => true },
  { id: 'pots', tier: 'easy', name: 'Drink Your Pots', desc: 'Drink a potion dropped by an enemy.', on: 'potion', test: () => true },
  { id: 'shark', tier: 'easy', name: 'Food Is Life', desc: 'Eat a shark.', on: 'eat', test: () => true },
  { id: 'pray_melee', tier: 'easy', name: 'Pray Melee', desc: 'Turn on a protection prayer.', on: 'pray', test: () => true },
  { id: 'spec', tier: 'easy', name: 'Spec Transfer Pls', desc: 'Use a special attack.', on: 'spec', test: () => true },
  { id: 'sit', tier: 'easy', name: 'Sit', desc: 'Get hit for 0. Twice in a row would be impressive.', on: 'zero', test: () => true },

  { id: 'lumby_death', tier: 'easy', name: 'Respawn in Lumbridge', desc: 'Die in Lumbridge. The cows saw everything.', on: 'death', test: () => areaNow() === 0 },
  { id: 'sandwich', tier: 'easy', name: 'Sandwiches, Adventurer!', desc: 'Start a run as the Sandwich lady.', on: 'start', test: () => heroIs('sandwich') },

  // ---------- Medium ----------
  { id: 'count', tier: 'medium', name: 'Stake Through the Heart', desc: 'Defeat Count Draynor.', on: 'boss', test: bossDown('count_draynor') },
  { id: 'delrith', tier: 'medium', name: 'Demon Slayer', desc: 'Defeat Delrith.', on: 'boss', test: bossDown('delrith') },
  { id: 'scurrius', tier: 'medium', name: 'Rat King of Varrock', desc: 'Defeat Scurrius.', on: 'boss', test: bossDown('scurrius') },
  { id: 'mole', tier: 'medium', name: 'Bring a Light Source', desc: 'Defeat the Giant Mole.', on: 'boss', test: bossDown('giant_mole') },
  { id: 'sir_clue', tier: 'medium', name: 'Sir, This Is a Clue Scroll', desc: 'Read a clue scroll.', on: 'clue', test: () => true },
  { id: 'casket', tier: 'medium', name: 'Casket Diving', desc: 'Open a reward casket.', on: 'casket', test: () => true },
  { id: 'skip_casket', tier: 'medium', name: 'Skipped Leg Day', desc: 'Skip a reward casket. Bold.', on: 'skipCasket', test: () => true },
  { id: 'boon', tier: 'medium', name: 'Blessed by Saradomin', desc: 'Pick a boon after a boss.', on: 'boon', test: () => true },
  { id: 'slayer_task', tier: 'medium', name: 'Slayer Task Complete', desc: 'Get 100 kills in one run.', on: 'kill', test: () => RR.run.kills >= 100 },
  { id: 'bank_stand', tier: 'medium', name: 'Bank Standing in World 301', desc: 'Hold 10,000 coins at once.', on: 'gold', test: () => RR.run.gold >= 10000 },
  { id: 'whip', tier: 'medium', name: 'Whip It Out', desc: 'Equip an Abyssal whip.', on: 'gear', test: wearing('abyssal_whip') },
  { id: 'draynor_heist', tier: 'medium', name: 'Draynor Bank Heist', desc: 'Clear Draynor Manor as the Wise Old Man.', on: 'stage', test: (x) => heroIs('wom') && clearedArea('Draynor Manor')(x) },
  { id: 'sixty', tier: 'medium', name: 'Wildy Is Dead Content', desc: 'Reach the Wilderness.', on: 'stage', test: (x) => x && x.area >= 7 },
  { id: 'ten_levels', tier: 'medium', name: 'Gz on 40 Att', desc: 'Get any skill to level 40.', on: 'train', test: () => Object.values(RR.run.skills).some((v) => v >= 40) },

  { id: 'pie_addict', tier: 'medium', name: 'Pie Shop Regular', desc: 'Eat 5 Redberry pies in one run.', on: 'pie', test: () => RR.run.piesEaten >= 5 },
  { id: 'spec_spam', tier: 'medium', name: 'Spec Bar Go Brrr', desc: 'Use 15 special attacks in one run.', on: 'spec', test: () => RR.run.specs >= 15 },
  { id: 'banked', tier: 'medium', name: 'Should Have Banked', desc: 'Die holding 25,000 coins or more.', on: 'death', test: () => RR.run.gold >= 25000 },
  { id: 'deaths5', tier: 'medium', name: "Death's Office Regular", desc: 'Die 5 times across all runs. Death knows your name now.', on: 'death', test: () => (RR.meta.deaths || 0) >= 5 },
  { id: 'chicken_menace', tier: 'medium', name: 'The Chicken Menace', desc: 'Kill 40 chickens in one run. They had families.', on: 'kill', test: () => killsOf('chicken') >= 40 },

  // ---------- Hard ----------
  { id: 'elvarg', tier: 'hard', name: 'Dragon Slayer', desc: 'Defeat Elvarg.', on: 'boss', test: bossDown('elvarg') },
  { id: 'no_shield', tier: 'hard', name: 'Who Needs an Anti-Dragon Shield', desc: 'Defeat Elvarg with nothing in your shield slot.', on: 'boss', test: (x) => bossDown('elvarg')(x) && !RR.run.gear.shield },
  { id: 'kq', tier: 'hard', name: 'Bug Spray', desc: 'Defeat the Kalphite Queen.', on: 'boss', test: bossDown('kalphite_queen') },
  { id: 'kbd', tier: 'hard', name: 'Black Dragon Bones', desc: 'Defeat the King Black Dragon.', on: 'boss', test: bossDown('kbd') },
  { id: 'graardor', tier: 'hard', name: 'Bandos Boy', desc: 'Defeat General Graardor.', on: 'boss', test: bossDown('graardor') },
  { id: 'falador', tier: 'hard', name: 'The Falador Massacre', desc: 'Clear Falador as Durial321.', on: 'stage', test: (x) => heroIs('durial') && clearedArea('Falador')(x) },
  { id: 'yama_sign', tier: 'hard', name: 'Read the Fine Print', desc: 'Sign one of Yama\'s contracts.', on: 'yama', test: (x) => x === 'sign' },
  { id: 'yama_no', tier: 'hard', name: 'Not Today, Yama', desc: 'Refuse Yama\'s contract.', on: 'yama', test: (x) => x === 'refuse' },
  { id: 'clue3', tier: 'hard', name: 'Clue Hunter Garb', desc: 'Read 3 clue scrolls in one run.', on: 'clue', test: () => RR.run.clues >= 3 },
  { id: 'cheat_death', tier: 'hard', name: 'Saved by the Redemption', desc: 'Survive a killing blow.', on: 'revive', test: () => true },
  { id: 'claws', tier: 'hard', name: 'Claws Out', desc: 'Use the Dragon claws special attack.', on: 'spec', test: (x) => x === 'dragon_claws' },
  { id: 'bgs', tier: 'hard', name: 'BGS Spec Into a 0', desc: 'Use the Bandos godsword special attack.', on: 'spec', test: (x) => x === 'bandos_godsword' },
  { id: 'nine_nine', tier: 'hard', name: '99 Strength (Finally)', desc: 'Get any skill to level 99.', on: 'train', test: () => Object.values(RR.run.skills).some((v) => v >= 99) },
  { id: 'max_cash', tier: 'hard', name: 'Max Cash Stack Energy', desc: 'Hold 100,000 coins at once.', on: 'gold', test: () => RR.run.gold >= 100000 },
  { id: 'boons5', tier: 'hard', name: 'Overloaded', desc: 'Have 5 boons in one run.', on: 'boon', test: () => Object.values(RR.run.boons).reduce((a, b) => a + b, 0) >= 5 },
  { id: 'clue_obor', tier: 'hard', name: 'Hill Giant Club Enjoyer', desc: 'Beat Obor from a clue scroll.', on: 'kill', test: (x) => x && x.id === 'clue_obor' },

  { id: 'naked_elvarg', tier: 'hard', name: 'Naked Dragon Slayer', desc: 'Defeat Elvarg wearing nothing but your weapon.', on: 'boss', test: (x) => bossDown('elvarg')(x) && wornCount() === 0 },
  { id: 'ironman', tier: 'hard', name: 'Ironman Btw', desc: 'Defeat Elvarg without buying anything from the shop.', on: 'boss', test: (x) => bossDown('elvarg')(x) && !RR.run.bought },
  { id: 'one_def', tier: 'hard', name: '1 Defence Pure', desc: 'Defeat the King Black Dragon with Defence still at 1.', on: 'boss', test: (x) => bossDown('kbd')(x) && RR.run.skills.defence <= 1 },
  { id: 'dharok', tier: 'hard', name: 'Dharok Mode', desc: 'Defeat any route boss with under 10% of your hitpoints left.', on: 'boss', test: () => hpFrac() < 0.1 },
  { id: 'sandwich_kq', tier: 'hard', name: 'Lunch Is Served', desc: 'Defeat the Kalphite Queen as the Sandwich lady.', on: 'boss', test: (x) => heroIs('sandwich') && bossDown('kalphite_queen')(x) },
  { id: 'sick_kills', tier: 'hard', name: 'Mass Murderer of Gielinor', desc: 'Get 400 kills in one run.', on: 'kill', test: () => RR.run.kills >= 400 },

  // ---------- Elite ----------
  { id: 'zulrah', tier: 'elite', name: 'Snakeboss', desc: 'Defeat Zulrah.', on: 'boss', test: bossDown('zulrah') },
  { id: 'jad', tier: 'elite', name: 'Fire Cape', desc: 'Defeat TzTok-Jad.', on: 'boss', test: bossDown('jad') },
  { id: 'jad_clean', tier: 'elite', name: 'Prayer Flicker Supreme', desc: 'Defeat TzTok-Jad without taking any damage.', on: 'boss', test: (x) => bossDown('jad')(x) && !RR.run.bossHurt },
  { id: 'vorkath', tier: 'elite', name: 'Vork Is Free Money', desc: 'Defeat Vorkath.', on: 'boss', test: bossDown('vorkath') },
  { id: 'purple', tier: 'elite', name: 'PURPLE!', desc: 'Get an ultra rare item.', on: 'gear', test: () => Object.values(RR.run.gear).some((id) => ITEMS[id] && ITEMS[id].rarity === 'ultra') },
  { id: 'nine_lives', tier: 'elite', name: 'Nine Lives', desc: 'Cheat death as Bob the Jagex cat.', on: 'revive', test: () => heroIs('bob') },
  { id: 'corp', tier: 'elite', name: 'Corp Is a Gear Check', desc: 'Beat the Corporeal Beast from a clue scroll.', on: 'kill', test: (x) => x && x.id === 'clue_corp' },
  { id: 'barrows', tier: 'elite', name: 'Brother, Where Is My Chest', desc: 'Beat Dharok from a clue scroll.', on: 'kill', test: (x) => x && x.id === 'clue_dharok' },
  { id: 'no_dmg_boss', tier: 'elite', name: 'Perfect Kill', desc: 'Defeat any route boss without taking damage.', on: 'boss', test: () => !RR.run.bossHurt },

  { id: 'naked_bandos', tier: 'elite', name: 'Bandos Is a Gear Check', desc: 'Defeat General Graardor wearing at most 3 pieces of gear besides your weapon.', on: 'boss', test: (x) => bossDown('graardor')(x) && wornCount() <= 3 },
  { id: 'ironman_jad', tier: 'elite', name: 'HCIM Fire Cape', desc: 'Defeat TzTok-Jad without buying anything from the shop.', on: 'boss', test: (x) => bossDown('jad')(x) && !RR.run.bought },
  { id: 'sandwich_jad', tier: 'elite', name: 'Jad Wanted a Kebab', desc: 'Defeat TzTok-Jad as the Sandwich lady.', on: 'boss', test: (x) => heroIs('sandwich') && bossDown('jad')(x) },
  { id: 'durial_wildy', tier: 'elite', name: 'Rogue Mod Abuse', desc: 'Clear the Wilderness as Durial321.', on: 'stage', test: (x) => heroIs('durial') && clearedArea('Wilderness')(x) },
  { id: 'no_pray_zulrah', tier: 'elite', name: 'Just Walk Around It', desc: 'Defeat Zulrah without ever using a protection prayer this run.', on: 'boss', test: (x) => bossDown('zulrah')(x) && !RR.run.prayedEver },

  // ---------- Master ----------
  { id: 'wardens', tier: 'master', name: 'Invocation Enjoyer', desc: 'Defeat Tumeken\'s Warden.', on: 'boss', test: bossDown('wardens') },
  { id: 'olm', tier: 'master', name: 'Olm Rhymes With Home', desc: 'Defeat the Great Olm.', on: 'boss', test: bossDown('olm') },
  { id: 'verzik', tier: 'master', name: 'Theatre Kid', desc: 'Defeat Verzik Vitur.', on: 'boss', test: bossDown('verzik') },
  { id: 'nex', tier: 'master', name: 'Nihil Plz', desc: 'Defeat Nex.', on: 'boss', test: bossDown('nex') },
  { id: 'mega', tier: 'master', name: 'Mega Rare Moment', desc: 'Equip a mega rare: Scythe, Twisted bow or Tumeken\'s shadow.', on: 'gear', test: () => Object.values(RR.run.gear).some((id) => ITEMS[id] && ITEMS[id].rarity === 'mega') },
  { id: 'newb_wildy', tier: 'master', name: 'Level 3 Skiller Btw', desc: 'Clear the Wilderness as the Level 3 Newb.', on: 'stage', test: (x) => heroIs('newb') && clearedArea('Wilderness')(x) },
  { id: 'clue10', tier: 'master', name: 'Clue Addict', desc: 'Read 10 clue scrolls across all runs.', on: 'clue', test: () => (RR.meta.clues || 0) >= 10 },
  { id: 'two_contracts', tier: 'master', name: 'Soul Mortgage', desc: 'Sign two of Yama\'s contracts in one run.', on: 'yama', test: () => Object.keys(RR.run.contracts).length >= 2 },
  { id: 'nightmare', tier: 'master', name: 'Sleep Paralysis', desc: 'Beat The Nightmare from a clue scroll.', on: 'kill', test: (x) => x && x.id === 'clue_nightmare' },

  { id: 'woox', tier: 'master', name: 'Woox Walk', desc: 'Defeat Vorkath without taking any damage.', on: 'boss', test: (x) => bossDown('vorkath')(x) && !RR.run.bossHurt },
  { id: 'spoon', tier: 'master', name: 'Spooned', desc: 'Equip a mega rare before reaching the Wilderness.', on: 'gear', test: () => areaNow() < 7 && Object.values(RR.run.gear).some((id) => ITEMS[id] && ITEMS[id].rarity === 'mega') },
  { id: 'deaths50', tier: 'master', name: 'Gravestone Collector', desc: 'Die 50 times across all runs. Have you tried praying?', on: 'death', test: () => (RR.meta.deaths || 0) >= 50 },
  { id: 'newb_jad', tier: 'master', name: 'Level 3 Fire Cape', desc: 'Defeat TzTok-Jad as the Level 3 Newb.', on: 'boss', test: (x) => heroIs('newb') && bossDown('jad')(x) },

  // ---------- Grandmaster ----------
  { id: 'zuk', tier: 'grandmaster', name: 'Infernal Cape', desc: 'Defeat TzKal-Zuk.', on: 'boss', test: bossDown('zuk') },
  { id: 'gf_cape', tier: 'grandmaster', name: 'Buying Infernal Cape GF', desc: 'Win a run as the Level 3 Newb.', on: 'win', test: () => heroIs('newb') },
  { id: 'bob_win', tier: 'grandmaster', name: 'Bob Is Cool', desc: 'Win a run as Bob the Jagex cat.', on: 'win', test: () => heroIs('bob') },
  { id: 'soul_win', tier: 'grandmaster', name: 'Fine Print Champion', desc: 'Win a run with two Yama contracts signed.', on: 'win', test: () => Object.keys(RR.run.contracts).length >= 2 },
  { id: 'no_pray_win', tier: 'grandmaster', name: 'Prayer Is for the Weak', desc: 'Win a run without ever using a protection prayer.', on: 'win', test: () => !RR.run.prayedEver },
  { id: 'sandwich_win', tier: 'grandmaster', name: 'Sandwiches for Zuk', desc: 'Win a run as the Sandwich lady.', on: 'win', test: () => heroIs('sandwich') },
  { id: 'ironman_win', tier: 'grandmaster', name: 'UIM Btw', desc: 'Win a run without buying anything from the shop.', on: 'win', test: () => !RR.run.bought },
  { id: 'naked_zuk', tier: 'grandmaster', name: 'Naked Inferno', desc: 'Defeat Zuk wearing at most 2 pieces of gear besides your weapon.', on: 'boss', test: (x) => bossDown('zuk')(x) && wornCount() <= 2 },
  { id: 'no_boon_zuk', tier: 'grandmaster', name: 'Raw Dog the Inferno', desc: 'Defeat Zuk with no boons.', on: 'boss', test: (x) => bossDown('zuk')(x) && !Object.keys(RR.run.boons).length },
];
