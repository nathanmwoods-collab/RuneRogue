// RuneRogue data: heroes, items, skills, monsters and the route of areas.
// Every image and music file loads live from the Old School RuneScape Wiki.
// Filenames were checked against their File: pages on the wiki (see CREDITS.md).
'use strict';

const LANE_ICON = { melee: 'Attack_icon.png', ranged: 'Ranged_icon.png', magic: 'Magic_icon.png' };
const LANE_NAME = { melee: 'Melee', ranged: 'Ranged', magic: 'Magic' };

// ---------------------------------------------------------------------------
// Heroes. lane is the natural skill they start boosted in; any hero can use any item.
// quotes: real lines from their in-game dialogue (Durial321 and the Newb have none recorded).
// ---------------------------------------------------------------------------
const HEROES = [
  { id: 'newb', name: 'Level 3 Newb', file: 'Wooden_shield_equipped.png', lane: 'melee', weapon: 'bronze_sword',
    perk: 'Fresh off Tutorial Island in starter clothes. Skill levels cost 25% less.', mods: { skillCost: 0.75 },
    skills: { attack: 3, strength: 3, defence: 3 }, quotes: [] },
  { id: 'durial', name: 'Durial321', file: 'Durial321.png', lane: 'melee', weapon: 'rune_scimitar', unlock: { area: 2 }, gear: { head: 'iron_full_helm', body: 'black_platebody' },
    perk: 'Star of the Falador Massacre. Deals 30% more damage but takes 15% more.', mods: { dmg: 1.3, taken: 1.15 },
    skills: { attack: 8, strength: 10 }, quotes: [] },
  { id: 'sedridor', name: 'Archmage Sedridor', file: 'Archmage_Sedridor.png', lane: 'magic', weapon: 'staff_of_air', unlock: { area: 1 }, gear: { head: 'blue_wizard_hat' },
    perk: 'Head of the Wizards\' Tower from Rune Mysteries. Spells splash 40% wider.', mods: { splash: 1.4 },
    skills: { magic: 10 }, quotes: ['Senventior disthine molenko!', 'Strange and powerful magicks lurk here.', 'Nothing more than Zamorakian hearsay!'] },
  { id: 'wom', name: 'Wise Old Man', file: 'Wise_Old_Man.png', lane: 'magic', weapon: 'staff_of_air', unlock: { area: 5 }, gear: { head: 'mystic_hat', body: 'mystic_robe_top', legs: 'mystic_robe_bottom', neck: 'amulet_of_magic' },
    perk: 'Once robbed Draynor bank. Earns 40% more gold.', mods: { gold: 1.4 },
    skills: { magic: 12 }, quotes: ["Less of the 'old' man, if you please!", 'Deary deary me...', "I'm an old man! I walk with a stick!"] },
  { id: 'arianwyn', name: 'Arianwyn', file: 'Arianwyn.png', lane: 'ranged', weapon: 'shortbow', unlock: { area: 9 },
    kits: [
      { name: 'Elven scout', weapon: 'magic_longbow', gear: { head: 'robin_hood_hat', body: 'hardleather_body', legs: 'leather_chaps', feet: 'ranger_boots', ammo: 'rune_arrow', ring: 'archers_ring' } },
      { name: 'Crossbow sniper', weapon: 'rune_crossbow', gear: { head: 'coif', body: 'hardleather_body', hands: 'leather_vambraces', feet: 'snakeskin_boots', neck: 'amulet_of_glory', cape: 'cape_of_legends' } },
    ],
    perk: 'Elf scout from Regicide. Moves 15% faster and shoots 20% further.', mods: { speed: 1.15, range: 1.2 },
    skills: { ranged: 8, agility: 5 }, quotes: ['Not yet, I will try to send word if we find out anything new.'] },
  { id: 'sandwich', name: 'Sandwich lady', file: 'Sandwich_lady.png', lane: 'ranged', weapon: 'sandwich_tray', unlock: { area: 3 }, gear: { feet: 'leather_boots', neck: 'amulet_of_power' },
    perk: 'The random event who will not take no for an answer. Throws sandwiches, finds pies twice as often and they heal 50% more.', mods: { pieChance: 2, pieHeal: 1.5 },
    skills: { ranged: 9, hitpoints: 12 }, quotes: ["Hey, I didn't say you could have that!", 'Maybe later.'] },
  // Every run starts as the Level 3 Newb until you progress. unlock.area: clear that area's boss once to unlock.
  // Later heroes start with more gear, and the hardest to reach let you pick a starting kit.
  { id: 'zanik', name: 'Zanik', file: 'Zanik.png', lane: 'ranged', weapon: 'dorgeshuun_crossbow', unlock: { area: 0 }, gear: { body: 'leather_body' },
    perk: 'Cave goblin heroine of the Dorgeshuun, found under Lumbridge in The Lost Tribe. Moves 10% faster and takes 10% less damage.', mods: { speed: 1.1, taken: 0.9 },
    skills: { ranged: 8, agility: 6 }, quotes: [] },
  { id: 'amik', name: 'Sir Amik Varze', file: 'Sir_Amik_Varze.png', lane: 'melee', weapon: 'rune_scimitar', unlock: { area: 4 }, gear: { head: 'rune_full_helm', body: 'rune_platebody', legs: 'rune_platelegs', shield: 'rune_kiteshield' },
    perk: 'Leader of the White Knights of Falador. +20 max hitpoints and prayer drains 30% slower.', mods: { hp: 20, ppDrain: 0.7 },
    skills: { attack: 10, strength: 10, defence: 10 }, quotes: [] },
  { id: 'osmumten', name: 'Osmumten', file: 'Osmumten.png', lane: 'melee', weapon: 'abyssal_tentacle', unlock: { area: 13 },
    kits: [
      { name: 'Tomb raider', weapon: 'abyssal_tentacle', gear: { head: 'berserker_helm', body: 'fighter_torso', legs: 'dragon_platelegs', shield: 'dragon_defender', hands: 'barrows_gloves', feet: 'dragon_boots', neck: 'amulet_of_fury', cape: 'fire_cape' } },
      { name: 'Spear of the sands', weapon: 'zamorakian_spear', gear: { head: 'helm_of_neitiznot', body: 'bandos_chestplate', legs: 'bandos_tassets', shield: 'dragon_defender', hands: 'barrows_gloves', feet: 'dragon_boots', ring: 'berserker_ring' } },
      { name: 'Crusher', weapon: 'abyssal_bludgeon', gear: { head: 'helm_of_neitiznot', body: 'fighter_torso', legs: 'dragon_platelegs', hands: 'dragon_gloves', feet: 'guardian_boots', neck: 'amulet_of_torture', cape: 'mythical_cape', ring: 'warrior_ring' } },
    ],
    perk: 'The archaeologist of the Tombs of Amascut. Dragonfire and other magic hit 30% softer, and +30 max hitpoints.', mods: { magicTaken: 0.7, hp: 30 },
    skills: { attack: 30, strength: 30, defence: 20 }, quotes: [] },
  { id: 'merlin', name: 'Merlin', file: 'Merlin.png', lane: 'magic', weapon: 'staff_of_fire', unlock: { area: 11 },
    kits: [
      { name: 'Camelot archmage', weapon: 'trident_of_the_seas', gear: { head: 'infinity_hat', body: 'infinity_top', legs: 'infinity_bottoms', feet: 'infinity_boots', neck: 'occult_necklace', ring: 'seers_ring' } },
      { name: 'Ancient scholar', weapon: 'ancient_staff', gear: { head: 'mystic_hat', body: 'mystic_robe_top', legs: 'mystic_robe_bottom', shield: 'book_of_darkness', hands: 'mystic_gloves', neck: 'amulet_of_glory', cape: 'imbued_saradomin_cape' } },
      { name: 'Wand duelist', weapon: 'master_wand', gear: { head: 'infinity_hat', body: 'infinity_top', legs: 'infinity_bottoms', shield: 'book_of_darkness', feet: 'mystic_boots', ring: 'ring_of_recoil' } },
    ],
    perk: 'The great wizard of Camelot from Merlin\'s Crystal. Spells splash 20% wider and hit bosses 25% harder.', mods: { splash: 1.2, bossDmg: 1.25 },
    skills: { magic: 16 }, quotes: [] },
  { id: 'nieve', name: 'Nieve', file: 'Nieve.png', lane: 'melee', weapon: 'leaf_bladed_sword', unlock: { area: 7 }, gear: { head: 'slayer_helmet', body: 'adamant_platebody', legs: 'rune_platelegs', feet: 'climbing_boots', ring: 'ring_of_recoil' },
    perk: 'Slayer master of the Gnome Stronghold. 10% extra critical hits and Slayer starts at 10.', mods: { crit: 0.1 },
    skills: { attack: 12, strength: 12, slayer: 10 }, quotes: [] },
  { id: 'bob', name: 'Bob the Jagex cat', file: 'Bob_the_Jagex_cat.png', lane: 'magic', weapon: 'staff_of_air', unlock: { area: 15 },
    kits: [
      { name: 'Nine lives', weapon: 'trident_of_the_swamp', gear: { head: 'ancestral_hat', body: 'ancestral_robe_top', legs: 'ancestral_robe_bottom', hands: 'tormented_bracelet', feet: 'eternal_boots', neck: 'occult_necklace', cape: 'imbued_zamorak_cape', ring: 'seers_ring_i', shield: 'arcane_spirit_shield' } },
      { name: 'Cat burglar', weapon: 'toxic_staff_of_the_dead', gear: { head: 'virtus_mask', body: 'virtus_robe_top', legs: 'virtus_robe_bottom', hands: 'regen_bracelet', feet: 'eternal_boots', neck: 'amulet_of_glory', ring: 'ring_of_wealth', shield: 'spectral_spirit_shield' } },
      { name: 'Jagex HQ', weapon: 'kodai_wand', gear: { head: 'infinity_hat', body: 'infinity_top', legs: 'infinity_bottoms', feet: 'infinity_boots', neck: 'amulet_of_fury', cape: 'max_cape', shield: 'book_of_darkness' } },
    ],
    perk: 'The famous cat of Gielinor. Nine lives: once per run, survive a killing blow with half your hitpoints.', mods: { lives: 1, gold: 1.3 },
    skills: { magic: 6, agility: 15, thieving: 15 }, quotes: [] },
  { id: 'woox', name: 'Woox', file: 'Mysterious_Adventurer.png', lane: 'ranged', weapon: 'toxic_blowpipe', unlock: { boss: 'clue_corp', secret: 'A wanderer in search of a new challenge. Prove you can stand alone against a beast few would face.' },
    perk: 'Jagex\'s Mysterious Adventurer, a tribute to Woox, the first player to solo the Corporeal Beast. Bosses take 20% more damage, +10% critical hits, and he moves 10% faster.', mods: { bossDmg: 1.2, crit: 0.1, speed: 1.1 },
    skills: { ranged: 20, agility: 10 }, quotes: ['He stares off stoically into the distance. In search of a new challenge, perhaps?'] },
  { id: 'cow31337killer', name: 'Cow31337Killer', file: 'Cow31337Killer.png', lane: 'melee', weapon: 'dharoks_greataxe', gear: { head: 'dharoks_helm', body: 'rune_platebody', legs: 'rune_platelegs', feet: 'rune_boots' },
    unlock: { cows: 1000, secret: 'He hates cows so much.' },
    perk: 'The legendary cow hunter from Animal Magnetism, in his own Dharok\'s helm and greataxe. Cows and the cow boss take 5× damage, and every other enemy takes 10% more.', mods: { cowDmg: 5, dmg: 1.1 },
    skills: { attack: 15, strength: 20, hitpoints: 15 }, quotes: ['He hates cows so much.'] },
];

// ---------------------------------------------------------------------------
// Items. tier = the area index where it starts appearing in shops.
// rarity: common | uncommon | rare | ultra | mega. Price follows tier and rarity.
// Slots match the OSRS Worn Equipment screen.
// ---------------------------------------------------------------------------
const SLOTS = ['head', 'cape', 'neck', 'ammo', 'weapon', 'body', 'shield', 'legs', 'hands', 'feet', 'ring'];
const SLOT_NAME = { head: 'Head', cape: 'Cape', neck: 'Neck', ammo: 'Ammo', weapon: 'Weapon', body: 'Body', shield: 'Shield', legs: 'Legs', hands: 'Hands', feet: 'Feet', ring: 'Ring' };
const RARITY_MULT = { common: 1, uncommon: 1.4, rare: 2.6, ultra: 4, thirdage: 5, mega: 6 };
const RARITY_WEIGHT = { common: 1, uncommon: 0.6, rare: 0.2, ultra: 0.012, thirdage: 0.003, mega: 0.012 };
// How much each rarity's odds grow from the first wave (x1) to the last (x(1+n)).
const RARITY_GROWTH = { common: 0, uncommon: 1, rare: 3, ultra: 6, thirdage: 6, mega: 10 };
const RARITY_NAME = { common: 'Common', uncommon: 'Uncommon', rare: 'Rare', ultra: 'Ultra rare', thirdage: 'Third age', mega: 'Mega rare' };

const ITEMS = {};
function item(id, name, lane, slot, tier, rarity, stats, file) {
  // Price climbs faster than power: top-tier gear is a real saving goal (Nathan found the game too easy).
  const base = Math.round(30 * Math.pow(1.46, tier));
  // Rarity is at least what the item's tier implies: raid and top boss gear is ultra rare, mid-game boss gear rare.
  const RANK = ['common', 'uncommon', 'rare', 'ultra', 'thirdage', 'mega'];
  const byTier = tier >= 10 ? 'ultra' : tier >= 7 ? 'rare' : tier >= 4 ? 'uncommon' : 'common';
  if (RANK.indexOf(byTier) > RANK.indexOf(rarity)) rarity = byTier;
  ITEMS[id] = { id, name, lane, slot, tier, rarity, ...stats, file: file || name.replace(/ /g, '_') + '.png',
    price: stats.price !== undefined ? stats.price : Math.round(base * RARITY_MULT[rarity] / 5) * 5 };
}
// w: kind swing|shot|spell. dmg per hit, cd seconds, reach/range px.
// --- Melee weapons
item('bronze_sword', 'Bronze sword', 'melee', 'weapon', 0, 'common', { price: 0, start: true, w: { kind: 'swing', dmg: 6, cd: 0.75, reach: 72, arc: 1.7 } });
item('rune_scimitar', 'Rune scimitar', 'melee', 'weapon', 1, 'common', { w: { kind: 'swing', dmg: 11, cd: 0.6, reach: 80, arc: 1.8 } });
item('dragon_scimitar', 'Dragon scimitar', 'melee', 'weapon', 3, 'common', { w: { kind: 'swing', dmg: 16, cd: 0.55, reach: 85, arc: 1.9 } });
item('granite_maul', 'Granite maul', 'melee', 'weapon', 4, 'uncommon', { w: { kind: 'swing', dmg: 40, cd: 1.15, reach: 100, arc: 6.3, knock: 90 } });
item('abyssal_whip', 'Abyssal whip', 'melee', 'weapon', 5, 'common', { w: { kind: 'swing', dmg: 23, cd: 0.5, reach: 125, arc: 1.3 } });
item('dragon_claws', 'Dragon claws', 'melee', 'weapon', 7, 'rare', { w: { kind: 'swing', dmg: 22, cd: 0.42, reach: 85, arc: 1.9, hits: 2 } });
item('bandos_godsword', 'Bandos godsword', 'melee', 'weapon', 8, 'rare', { w: { kind: 'swing', dmg: 70, cd: 1.0, reach: 115, arc: 2.6, knock: 50 } });
item('armadyl_godsword', 'Armadyl godsword', 'melee', 'weapon', 9, 'rare', { w: { kind: 'swing', dmg: 88, cd: 1.0, reach: 115, arc: 2.6 } });
item('ghrazi_rapier', 'Ghrazi rapier', 'melee', 'weapon', 11, 'uncommon', { w: { kind: 'swing', dmg: 46, cd: 0.42, reach: 95, arc: 1.2 } });
item('osmumtens_fang', "Osmumten's fang", 'melee', 'weapon', 12, 'uncommon', { w: { kind: 'swing', dmg: 52, cd: 0.42, reach: 90, arc: 1.3 } });
item('inquisitors_mace', "Inquisitor's mace", 'melee', 'weapon', 12, 'rare', { w: { kind: 'swing', dmg: 58, cd: 0.45, reach: 90, arc: 1.8 } });
item('elder_maul', 'Elder maul', 'melee', 'weapon', 13, 'rare', { w: { kind: 'swing', dmg: 130, cd: 1.05, reach: 110, arc: 6.3, knock: 80 } });
item('scythe_of_vitur', 'Scythe of Vitur', 'melee', 'weapon', 13, 'mega', { w: { kind: 'swing', dmg: 70, cd: 0.6, reach: 140, arc: 3.2, hits: 3 } });
// --- Ranged weapons
item('shortbow', 'Shortbow', 'ranged', 'weapon', 0, 'common', { price: 0, start: true, w: { kind: 'shot', dmg: 5, cd: 0.6, range: 380, speed: 760, pierce: 1, count: 1 } });
// The Sandwich lady's sandwiches: each throw is one of the foods she offers in the random event.
item('sandwich_tray', 'Sandwiches', 'ranged', 'weapon', 0, 'common', { price: 0, start: true, w: { kind: 'shot', dmg: 6, cd: 0.55, range: 360, speed: 620, pierce: 1, count: 1, knock: 3,
  foods: ['Baguette.png', 'Triangle_sandwich.png', 'Square_sandwich.png', 'Chocolate_bar.png', 'Kebab.png', 'Roll.png', 'Meat_pie.png'] } }, 'Triangle_sandwich.png');
item('dorgeshuun_crossbow', 'Dorgeshuun crossbow', 'ranged', 'weapon', 0, 'common', { price: 0, start: true, w: { kind: 'shot', dmg: 8, cd: 0.8, range: 400, speed: 950, pierce: 2, count: 1, bolt: true } });
item('magic_shortbow', 'Magic shortbow', 'ranged', 'weapon', 1, 'common', { w: { kind: 'shot', dmg: 8, cd: 0.36, range: 420, speed: 900, pierce: 1, count: 1 } });
item('rune_crossbow', 'Rune crossbow', 'ranged', 'weapon', 3, 'common', { w: { kind: 'shot', dmg: 22, cd: 0.8, range: 460, speed: 1050, pierce: 3, count: 1, bolt: true } });
item('dark_bow', 'Dark bow', 'ranged', 'weapon', 4, 'uncommon', { w: { kind: 'shot', dmg: 21, cd: 0.95, range: 430, speed: 900, pierce: 2, count: 2, spread: 0.14 } });
item('toxic_blowpipe', 'Toxic blowpipe', 'ranged', 'weapon', 9, 'uncommon', { w: { kind: 'shot', dmg: 20, cd: 0.22, range: 360, speed: 1000, pierce: 1, count: 1, dart: true } });
item('bow_of_faerdhinen', 'Bow of Faerdhinen', 'ranged', 'weapon', 11, 'rare', { w: { kind: 'shot', dmg: 48, cd: 0.5, range: 520, speed: 1150, pierce: 2, count: 1 } });
item('zaryte_crossbow', 'Zaryte crossbow', 'ranged', 'weapon', 12, 'uncommon', { w: { kind: 'shot', dmg: 70, cd: 0.7, range: 500, speed: 1200, pierce: 4, count: 1, bolt: true } });
item('venator_bow', 'Venator bow', 'ranged', 'weapon', 12, 'rare', { w: { kind: 'shot', dmg: 40, cd: 0.55, range: 480, speed: 1100, pierce: 1, count: 1, bounce: 3 } });
item('twisted_bow', 'Twisted bow', 'ranged', 'weapon', 13, 'mega', { w: { kind: 'shot', dmg: 85, cd: 0.6, range: 560, speed: 1250, pierce: 3, count: 1, tbow: true } });
// --- Magic weapons (staves cast their spell; spell icon flies as the projectile)
item('staff_of_air', 'Staff of air', 'magic', 'weapon', 0, 'common', { price: 0, start: true, w: { kind: 'spell', spell: 'Wind Strike', icon: 'Wind_Strike.png', dmg: 7, cd: 0.8, range: 360, speed: 520, splash: 34, color: '#d8f4ff' } });
item('staff_of_fire', 'Staff of fire', 'magic', 'weapon', 1, 'common', { w: { kind: 'spell', spell: 'Fire Bolt', icon: 'Fire_Bolt.png', dmg: 13, cd: 0.78, range: 380, speed: 560, splash: 48, color: '#ff7a1a' } });
item('ibans_staff', "Iban's staff", 'magic', 'weapon', 3, 'common', { w: { kind: 'spell', spell: 'Iban Blast', icon: 'Iban_Blast.png', dmg: 22, cd: 0.85, range: 400, speed: 600, splash: 62, color: '#b04bff' } });
item('ancient_staff', 'Ancient staff', 'magic', 'weapon', 4, 'uncommon', { w: { kind: 'spell', spell: 'Ice Barrage', icon: 'Ice_Barrage.png', dmg: 22, cd: 0.95, range: 410, speed: 650, splash: 90, color: '#9fe8ff', freeze: 1.4 } });
item('trident_of_the_seas', 'Trident of the Seas', 'magic', 'weapon', 6, 'common', { w: { kind: 'spell', spell: 'Trident', dmg: 34, cd: 0.7, range: 420, speed: 700, splash: 50, color: '#3fd0ff' } });
item('trident_of_the_swamp', 'Trident of the Swamp', 'magic', 'weapon', 9, 'uncommon', { w: { kind: 'spell', spell: 'Swamp trident', dmg: 46, cd: 0.7, range: 430, speed: 700, splash: 55, color: '#57d64a' } });
item('sanguinesti_staff', 'Sanguinesti staff', 'magic', 'weapon', 11, 'rare', { w: { kind: 'spell', spell: 'Sanguinesti', dmg: 58, cd: 0.7, range: 440, speed: 720, splash: 60, color: '#d01a2a', leech: 0.08 } });
item('harmonised_nightmare_staff', 'Harmonised Nightmare staff', 'magic', 'weapon', 12, 'rare', { w: { kind: 'spell', spell: 'Fire Surge', icon: 'Fire_Surge.png', dmg: 60, cd: 0.45, range: 430, speed: 760, splash: 60, color: '#ff5a1a' } });
item('kodai_wand', 'Kodai wand', 'magic', 'weapon', 12, 'uncommon', { w: { kind: 'spell', spell: 'Ice Barrage', icon: 'Ice_Barrage.png', dmg: 62, cd: 0.7, range: 440, speed: 720, splash: 95, color: '#9fe8ff', freeze: 1.6 } });
item('tumekens_shadow', "Tumeken's shadow", 'magic', 'weapon', 13, 'mega', { w: { kind: 'spell', spell: "Tumeken's shadow", dmg: 120, cd: 0.6, range: 520, speed: 820, splash: 100, color: '#ffd24a' } });

// --- Melee armour
item('bronze_full_helm', 'Bronze full helm', 'melee', 'head', 0, 'common', { def: 2 });
item('rune_full_helm', 'Rune full helm', 'melee', 'head', 2, 'common', { def: 5 });
item('helm_of_neitiznot', 'Helm of Neitiznot', 'melee', 'head', 5, 'common', { def: 7, dmg: 0.04 });
item('neitiznot_faceguard', 'Neitiznot faceguard', 'melee', 'head', 10, 'uncommon', { def: 10, dmg: 0.06, hp: 10 });
item('torva_full_helm', 'Torva full helm', 'melee', 'head', 14, 'rare', { def: 14, dmg: 0.08, hp: 20 });
item('bronze_platebody', 'Bronze platebody', 'melee', 'body', 0, 'common', { def: 3 });
item('rune_platebody', 'Rune platebody', 'melee', 'body', 2, 'common', { def: 8, hp: 5 });
item('fighter_torso', 'Fighter torso', 'melee', 'body', 4, 'common', { def: 8, dmg: 0.12 });
item('bandos_chestplate', 'Bandos chestplate', 'melee', 'body', 8, 'uncommon', { def: 14, dmg: 0.1, hp: 10 });
item('torva_platebody', 'Torva platebody', 'melee', 'body', 14, 'rare', { def: 20, dmg: 0.14, hp: 25 });
item('bronze_platelegs', 'Bronze platelegs', 'melee', 'legs', 0, 'common', { def: 2 });
item('rune_platelegs', 'Rune platelegs', 'melee', 'legs', 2, 'common', { def: 6 });
item('dragon_platelegs', 'Dragon platelegs', 'melee', 'legs', 5, 'common', { def: 8, dmg: 0.03 });
item('bandos_tassets', 'Bandos tassets', 'melee', 'legs', 8, 'uncommon', { def: 11, dmg: 0.07 });
item('torva_platelegs', 'Torva platelegs', 'melee', 'legs', 14, 'rare', { def: 16, dmg: 0.1, hp: 15 });
item('wooden_shield', 'Wooden shield', 'melee', 'shield', 0, 'common', { def: 2 });
item('rune_kiteshield', 'Rune kiteshield', 'melee', 'shield', 2, 'common', { def: 6 });
item('dragon_defender', 'Dragon defender', 'melee', 'shield', 4, 'common', { def: 4, aspd: 0.12 });
item('dragonfire_shield', 'Dragonfire shield', 'melee', 'shield', 7, 'uncommon', { def: 12, hp: 10 });
item('avernic_defender', 'Avernic defender', 'melee', 'shield', 11, 'uncommon', { def: 8, aspd: 0.18, dmg: 0.06 });
item('elysian_spirit_shield', 'Elysian spirit shield', 'any', 'shield', 15, 'rare', { def: 22, hp: 40, taken: 0.8 });
item('leather_gloves', 'Leather gloves', 'any', 'hands', 0, 'common', { def: 1 });
item('barrows_gloves', 'Barrows gloves', 'any', 'hands', 5, 'common', { def: 4, dmg: 0.08, aspd: 0.04 });
item('ferocious_gloves', 'Ferocious gloves', 'melee', 'hands', 10, 'uncommon', { def: 3, dmg: 0.14 });
item('leather_boots', 'Leather boots', 'any', 'feet', 0, 'common', { def: 1, speed: 0.03 });
item('rune_boots', 'Rune boots', 'melee', 'feet', 3, 'common', { def: 4 });
item('dragon_boots', 'Dragon boots', 'melee', 'feet', 5, 'common', { def: 4, dmg: 0.05 });
item('primordial_boots', 'Primordial boots', 'melee', 'feet', 10, 'uncommon', { def: 6, dmg: 0.1 });
item('obsidian_cape', 'Obsidian cape', 'melee', 'cape', 3, 'common', { def: 3, dmg: 0.05 });
item('fire_cape', 'Fire cape', 'any', 'cape', 11, 'uncommon', { def: 5, dmg: 0.1, hp: 10 });
item('infernal_cape', 'Infernal cape', 'any', 'cape', 15, 'rare', { def: 8, dmg: 0.16, hp: 15 });
// Max capes: the best capes for each style (the imbued god max cape is the best magic cape)
item('max_cape', 'Max cape', 'any', 'cape', 12, 'ultra', { def: 6, dmg: 0.06, pp: 4, hp: 10 });
item('infernal_max_cape', 'Infernal max cape', 'melee', 'cape', 16, 'ultra', { def: 9, dmg: 0.2, hp: 18, pp: 4 });
item('imbued_saradomin_max_cape', 'Imbued Saradomin max cape', 'magic', 'cape', 13, 'ultra', { def: 6, dmg: 0.18, hp: 10, pp: 4 }, 'Imbued_Saradomin_max_cape.png');
item('masori_assembler_max_cape', 'Masori assembler max cape', 'ranged', 'cape', 16, 'ultra', { aspd: 0.18, range: 0.25, dmg: 0.15, pp: 4 });
item('amulet_of_strength', 'Amulet of strength', 'melee', 'neck', 1, 'common', { dmg: 0.08 });
item('amulet_of_fury', 'Amulet of fury', 'any', 'neck', 6, 'uncommon', { def: 4, dmg: 0.1, pp: 5 });
item('amulet_of_torture', 'Amulet of torture', 'melee', 'neck', 10, 'uncommon', { dmg: 0.18, aspd: 0.05 });
item('berserker_ring', 'Berserker ring', 'melee', 'ring', 5, 'common', { dmg: 0.1 });
item('ultor_ring', 'Ultor ring', 'melee', 'ring', 13, 'rare', { dmg: 0.2 });
// --- Ranged armour
item('leather_cowl', 'Leather cowl', 'ranged', 'head', 0, 'common', { def: 1 });
item('coif', 'Coif', 'ranged', 'head', 1, 'common', { def: 2, dmg: 0.03 });
item('robin_hood_hat', 'Robin Hood hat', 'ranged', 'head', 5, 'uncommon', { def: 4, dmg: 0.08 });
item('armadyl_helmet', 'Armadyl helmet', 'ranged', 'head', 8, 'uncommon', { def: 6, dmg: 0.08 });
item('masori_mask', 'Masori mask', 'ranged', 'head', 14, 'rare', { def: 9, dmg: 0.12, hp: 10 });
item('leather_body', 'Leather body', 'ranged', 'body', 0, 'common', { def: 3 });
item('green_dhide_body', "Green d'hide body", 'ranged', 'body', 2, 'common', { def: 5, dmg: 0.08 });
item('black_dhide_body', "Black d'hide body", 'ranged', 'body', 5, 'common', { def: 8, dmg: 0.12 });
item('armadyl_chestplate', 'Armadyl chestplate', 'ranged', 'body', 8, 'uncommon', { def: 12, dmg: 0.2, hp: 10 });
item('masori_body', 'Masori body', 'ranged', 'body', 14, 'rare', { def: 15, dmg: 0.26, hp: 15 });
item('leather_chaps', 'Leather chaps', 'ranged', 'legs', 0, 'common', { def: 2 });
item('green_dhide_chaps', "Green d'hide chaps", 'ranged', 'legs', 2, 'common', { def: 4, dmg: 0.05 });
item('black_dhide_chaps', "Black d'hide chaps", 'ranged', 'legs', 5, 'common', { def: 6, dmg: 0.08 });
item('armadyl_chainskirt', 'Armadyl chainskirt', 'ranged', 'legs', 8, 'uncommon', { def: 9, dmg: 0.12 });
item('masori_chaps', 'Masori chaps', 'ranged', 'legs', 14, 'rare', { def: 12, dmg: 0.16, hp: 10 });
item('leather_vambraces', 'Leather vambraces', 'ranged', 'hands', 0, 'common', { def: 1, dmg: 0.03 });
item('green_dhide_vambraces', "Green d'hide vambraces", 'ranged', 'hands', 2, 'common', { def: 2, dmg: 0.05 });
item('black_dhide_vambraces', "Black d'hide vambraces", 'ranged', 'hands', 5, 'common', { def: 3, dmg: 0.08 });
item('zaryte_vambraces', 'Zaryte vambraces', 'ranged', 'hands', 12, 'uncommon', { def: 5, dmg: 0.16 });
item('snakeskin_boots', 'Snakeskin boots', 'ranged', 'feet', 2, 'common', { def: 2, speed: 0.04 });
item('ranger_boots', 'Ranger boots', 'ranged', 'feet', 5, 'uncommon', { def: 2, dmg: 0.08, speed: 0.06 });
item('pegasian_boots', 'Pegasian boots', 'ranged', 'feet', 10, 'uncommon', { def: 4, dmg: 0.12, speed: 0.08 });
item('twisted_buckler', 'Twisted buckler', 'ranged', 'shield', 9, 'uncommon', { def: 8, dmg: 0.08 });
item('avas_attractor', "Ava's attractor", 'ranged', 'cape', 1, 'common', { range: 0.1 });
item('avas_accumulator', "Ava's accumulator", 'ranged', 'cape', 4, 'common', { aspd: 0.1, range: 0.15 });
item('avas_assembler', "Ava's assembler", 'ranged', 'cape', 10, 'uncommon', { aspd: 0.14, range: 0.2, dmg: 0.06 });
item('dizanas_quiver', "Dizana's quiver", 'ranged', 'cape', 15, 'rare', { aspd: 0.16, range: 0.25, dmg: 0.12 });
item('necklace_of_anguish', 'Necklace of anguish', 'ranged', 'neck', 10, 'uncommon', { dmg: 0.18, aspd: 0.05 });
item('archers_ring', 'Archers ring', 'ranged', 'ring', 5, 'common', { dmg: 0.1 });
item('venator_ring', 'Venator ring', 'ranged', 'ring', 13, 'rare', { dmg: 0.2 });
item('bronze_arrow', 'Bronze arrow', 'ranged', 'ammo', 0, 'common', { dmg: 0.03 }, 'Bronze_arrow_5.png');
item('adamant_arrow', 'Adamant arrow', 'ranged', 'ammo', 2, 'common', { dmg: 0.07 }, 'Adamant_arrow_5.png');
item('rune_arrow', 'Rune arrow', 'ranged', 'ammo', 3, 'common', { dmg: 0.1 }, 'Rune_arrow_5.png');
item('amethyst_arrow', 'Amethyst arrow', 'ranged', 'ammo', 6, 'common', { dmg: 0.14, pierce: 1 }, 'Amethyst_arrow_5.png');
item('dragon_arrow', 'Dragon arrow', 'ranged', 'ammo', 10, 'uncommon', { dmg: 0.22, pierce: 1 }, 'Dragon_arrow_5.png');
// Enchanted dragon bolts: each has its real bolt effect (proc) from the wiki.
item('dragonstone_dragon_bolts_e', 'Dragonstone dragon bolts (e)', 'ranged', 'ammo', 7, 'uncommon', { dmg: 0.15, proc: 'dragonstone' }, 'Dragonstone_dragon_bolts_(e)_detail.png');
item('ruby_dragon_bolts_e', 'Ruby dragon bolts (e)', 'ranged', 'ammo', 8, 'rare', { dmg: 0.16, proc: 'ruby' }, 'Ruby_dragon_bolts_(e)_detail.png');
item('diamond_dragon_bolts_e', 'Diamond dragon bolts (e)', 'ranged', 'ammo', 9, 'rare', { dmg: 0.18, proc: 'diamond' }, 'Diamond_dragon_bolts_(e)_1.png');
item('onyx_dragon_bolts_e', 'Onyx dragon bolts (e)', 'ranged', 'ammo', 11, 'rare', { dmg: 0.2, proc: 'onyx' }, 'Onyx_dragon_bolts_(e)_1.png');
// --- Magic armour
item('blue_wizard_hat', 'Blue wizard hat', 'magic', 'head', 0, 'common', { def: 1, dmg: 0.03 });
item('mystic_hat', 'Mystic hat', 'magic', 'head', 2, 'common', { def: 2, dmg: 0.05 });
item('ahrims_hood', "Ahrim's hood", 'magic', 'head', 6, 'uncommon', { def: 5, dmg: 0.08 });
item('ancestral_hat', 'Ancestral hat', 'magic', 'head', 10, 'uncommon', { def: 6, dmg: 0.12 });
item('virtus_mask', 'Virtus mask', 'magic', 'head', 10, 'rare', { def: 7, dmg: 0.09, hp: 10 });
item('blue_wizard_robe', 'Blue wizard robe', 'magic', 'body', 0, 'common', { def: 1, dmg: 0.06 });
item('mystic_robe_top', 'Mystic robe top', 'magic', 'body', 2, 'common', { def: 3, dmg: 0.1 });
item('ahrims_robetop', "Ahrim's robetop", 'magic', 'body', 6, 'uncommon', { def: 7, dmg: 0.15 });
item('ancestral_robe_top', 'Ancestral robe top', 'magic', 'body', 10, 'uncommon', { def: 9, dmg: 0.24 });
item('virtus_robe_top', 'Virtus robe top', 'magic', 'body', 10, 'rare', { def: 11, dmg: 0.19, hp: 15 });
item('blue_skirt', 'Blue skirt', 'magic', 'legs', 0, 'common', { def: 1, dmg: 0.03 });
item('mystic_robe_bottom', 'Mystic robe bottom', 'magic', 'legs', 2, 'common', { def: 2, dmg: 0.06 });
item('ahrims_robeskirt', "Ahrim's robeskirt", 'magic', 'legs', 6, 'uncommon', { def: 6, dmg: 0.1 });
item('ancestral_robe_bottom', 'Ancestral robe bottom', 'magic', 'legs', 10, 'uncommon', { def: 8, dmg: 0.16 });
item('virtus_robe_bottom', 'Virtus robe bottom', 'magic', 'legs', 10, 'rare', { def: 9, dmg: 0.12, hp: 10 });
item('mystic_gloves', 'Mystic gloves', 'magic', 'hands', 2, 'common', { def: 1, dmg: 0.04 });
item('tormented_bracelet', 'Tormented bracelet', 'magic', 'hands', 10, 'uncommon', { dmg: 0.14 });
item('wizard_boots', 'Wizard boots', 'magic', 'feet', 1, 'uncommon', { dmg: 0.04, speed: 0.03 });
item('mystic_boots', 'Mystic boots', 'magic', 'feet', 2, 'common', { def: 1, dmg: 0.03 });
item('eternal_boots', 'Eternal boots', 'magic', 'feet', 10, 'uncommon', { def: 3, dmg: 0.1 });
item('mages_book', "Mage's book", 'magic', 'shield', 4, 'common', { dmg: 0.1 });
item('arcane_spirit_shield', 'Arcane spirit shield', 'magic', 'shield', 11, 'rare', { def: 12, dmg: 0.16 });
item('saradomin_cape', 'Saradomin cape', 'magic', 'cape', 3, 'common', { dmg: 0.06 });
item('imbued_saradomin_cape', 'Imbued Saradomin cape', 'magic', 'cape', 8, 'uncommon', { dmg: 0.12 });
item('imbued_zamorak_cape', 'Imbued Zamorak cape', 'magic', 'cape', 9, 'uncommon', { dmg: 0.12, def: 2 });
item('amulet_of_magic', 'Amulet of magic', 'magic', 'neck', 1, 'common', { dmg: 0.08 });
item('occult_necklace', 'Occult necklace', 'magic', 'neck', 6, 'uncommon', { dmg: 0.2 });
item('seers_ring', 'Seers ring', 'magic', 'ring', 5, 'common', { dmg: 0.1 });
item('magus_ring', 'Magus ring', 'magic', 'ring', 13, 'rare', { dmg: 0.2 });
// --- Neutral
item('amulet_of_glory', 'Amulet of glory', 'any', 'neck', 2, 'common', { def: 3, dmg: 0.06 }, 'Amulet_of_glory.png');
item('ring_of_wealth', 'Ring of wealth', 'any', 'ring', 1, 'common', { gold: 0.25 });
item('holy_blessing', 'Holy blessing', 'any', 'ammo', 2, 'common', { pp: 10, def: 1 });
item('radas_blessing_4', "Rada's blessing 4", 'any', 'ammo', 6, 'uncommon', { pp: 20, def: 2, gold: 0.08 }, "Rada's_blessing_4.png");
item('shark', 'Shark', 'any', 'food', 0, 'common', { price: 22, desc: 'Heals 20 hitpoints. Eat with E. Carry up to 5.' });
item('ppot', 'Prayer potion', 'any', 'food', 0, 'common', { price: 26, desc: 'Restores 20 prayer points. Drink with Q. Carry up to 5.' }, 'Prayer_potion(4).png');

// --- More gear from the wiki's slot tables (any hero can wear any of it)
// Melee weapons
item('adamant_scimitar', 'Adamant scimitar', 'melee', 'weapon', 1, 'common', { w: { kind: 'swing', dmg: 9, cd: 0.6, reach: 78, arc: 1.8 } });
item('dragon_dagger', 'Dragon dagger', 'melee', 'weapon', 2, 'common', { w: { kind: 'swing', dmg: 8, cd: 0.42, reach: 66, arc: 1.4, hits: 2 } });
item('dragon_longsword', 'Dragon longsword', 'melee', 'weapon', 3, 'common', { w: { kind: 'swing', dmg: 21, cd: 0.7, reach: 95, arc: 2.0 } });
item('zamorakian_spear', 'Zamorakian spear', 'melee', 'weapon', 5, 'uncommon', { w: { kind: 'swing', dmg: 26, cd: 0.6, reach: 130, arc: 0.9, knock: 70 } });
item('dragon_warhammer', 'Dragon warhammer', 'melee', 'weapon', 6, 'uncommon', { w: { kind: 'swing', dmg: 46, cd: 0.95, reach: 90, arc: 2.2, knock: 40 } });
item('saradomin_sword', 'Saradomin sword', 'melee', 'weapon', 6, 'uncommon', { w: { kind: 'swing', dmg: 38, cd: 0.7, reach: 110, arc: 2.4 } });
item('abyssal_tentacle', 'Abyssal tentacle', 'melee', 'weapon', 7, 'common', { w: { kind: 'swing', dmg: 30, cd: 0.5, reach: 130, arc: 1.3 } });
item('abyssal_bludgeon', 'Abyssal bludgeon', 'melee', 'weapon', 9, 'uncommon', { w: { kind: 'swing', dmg: 60, cd: 0.8, reach: 100, arc: 6.3 } });
item('saradomin_godsword', 'Saradomin godsword', 'melee', 'weapon', 9, 'rare', { w: { kind: 'swing', dmg: 76, cd: 1.0, reach: 115, arc: 2.6, leech: 0.1 } });
item('blade_of_saeldor', 'Blade of Saeldor', 'melee', 'weapon', 11, 'rare', { w: { kind: 'swing', dmg: 50, cd: 0.42, reach: 100, arc: 1.8 } });
// Ranged weapons
item('maple_shortbow', 'Maple shortbow', 'ranged', 'weapon', 1, 'common', { w: { kind: 'shot', dmg: 7, cd: 0.45, range: 400, speed: 820, pierce: 1, count: 1 } });
item('magic_longbow', 'Magic longbow', 'ranged', 'weapon', 2, 'common', { w: { kind: 'shot', dmg: 14, cd: 0.7, range: 560, speed: 950, pierce: 2, count: 1 } });
item('dragon_crossbow', 'Dragon crossbow', 'ranged', 'weapon', 6, 'common', { w: { kind: 'shot', dmg: 32, cd: 0.75, range: 470, speed: 1080, pierce: 3, count: 1, bolt: true } });
item('crawss_bow', "Craw's bow", 'ranged', 'weapon', 7, 'uncommon', { w: { kind: 'shot', dmg: 26, cd: 0.45, range: 460, speed: 1000, pierce: 1, count: 1 } }, "Craw's_bow.png");
item('dragon_hunter_crossbow', 'Dragon hunter crossbow', 'ranged', 'weapon', 7, 'uncommon', { w: { kind: 'shot', dmg: 38, cd: 0.7, range: 480, speed: 1100, pierce: 3, count: 1, bolt: true } });
item('armadyl_crossbow', 'Armadyl crossbow', 'ranged', 'weapon', 8, 'uncommon', { w: { kind: 'shot', dmg: 44, cd: 0.7, range: 480, speed: 1100, pierce: 3, count: 1, bolt: true } });
item('heavy_ballista', 'Heavy ballista', 'ranged', 'weapon', 10, 'uncommon', { w: { kind: 'shot', dmg: 110, cd: 1.3, range: 600, speed: 1300, pierce: 5, count: 1, bolt: true } });
// Magic weapons
item('staff_of_water', 'Staff of water', 'magic', 'weapon', 0, 'common', { w: { kind: 'spell', spell: 'Water Strike', icon: 'Water_Strike.png', dmg: 9, cd: 0.8, range: 360, speed: 520, splash: 36, color: '#4aa0ff' } });
item('staff_of_earth', 'Staff of earth', 'magic', 'weapon', 1, 'common', { w: { kind: 'spell', spell: 'Earth Bolt', icon: 'Earth_Bolt.png', dmg: 12, cd: 0.75, range: 380, speed: 560, splash: 46, color: '#8a6a3a' } });
item('master_wand', 'Master wand', 'magic', 'weapon', 5, 'common', { w: { kind: 'spell', spell: 'Fire Wave', icon: 'Fire_Wave.png', dmg: 30, cd: 0.8, range: 420, speed: 640, splash: 66, color: '#ff7a1a' } });
item('thammarons_sceptre', "Thammaron's sceptre", 'magic', 'weapon', 7, 'uncommon', { w: { kind: 'spell', spell: 'Ice Blitz', icon: 'Ice_Blitz.png', dmg: 34, cd: 0.75, range: 420, speed: 680, splash: 50, color: '#9fe8ff', freeze: 1.2 } });
item('toxic_staff_of_the_dead', 'Toxic Staff of the Dead', 'magic', 'weapon', 8, 'uncommon', { w: { kind: 'spell', spell: 'Fire Wave', icon: 'Fire_Wave.png', dmg: 40, cd: 0.75, range: 430, speed: 680, splash: 70, color: '#57d64a' } });
item('volatile_nightmare_staff', 'Volatile Nightmare staff', 'magic', 'weapon', 12, 'rare', { w: { kind: 'spell', spell: 'Volatile', dmg: 140, cd: 1.3, range: 480, speed: 760, splash: 120, color: '#ff4a8a' } });
// --- Weapon ladders (wiki): the full metal ladder for each melee type, wood bows, and elemental staves.
// wt = weapon type, which sets how it plays (WEAPON_TYPES). Existing ladder items keep their stats and gain a type.
const WEAPON_TYPES = {
  dagger: { name: 'Dagger', info: 'very fast stabs; each hit lunges you forward', cd: 0.42, reach: 62, arc: 1.2, f: 0.95 },
  sword: { name: 'Sword', info: 'a long straight thrust that runs through a line of enemies', cd: 0.6, reach: 105, arc: 0.45, f: 1.0 },
  scimitar: { name: 'Scimitar', info: 'quick wide slashes', cd: 0.55, reach: 85, arc: 1.9, f: 1.0 },
  longsword: { name: 'Longsword', info: 'a slow half-circle cleave in front of you', cd: 0.75, reach: 95, arc: 3.1, f: 1.05 },
  mace: { name: 'Mace', info: 'crushing blows that stun and weaken', cd: 0.7, reach: 80, arc: 1.4, f: 1.0 },
  battleaxe: { name: 'Battleaxe', info: 'heavy chops that make enemies bleed', cd: 0.95, reach: 88, arc: 2.2, f: 1.1 },
  twoh: { name: '2h sword', info: 'a slow full spin that knocks enemies back', cd: 1.15, reach: 100, arc: 6.3, f: 1.15, knock: 60 },
  halberd: { name: 'Halberd', info: 'slow, very long sweeps that hit everything far in front of you', cd: 1.0, reach: 150, arc: 1.5, f: 1.1 },
  spear: { name: 'Spear', info: 'long jabs that run through a line of enemies and push them back', cd: 0.65, reach: 125, arc: 0.4, f: 1.0, knock: 25 },
  claws: { name: 'Claws', info: 'two quick slashes per swing; the second one lands if the first misses', cd: 0.5, reach: 70, arc: 1.6, f: 0.95, hits: 2 },
  whip: { name: 'Whip', info: 'fast lashes from far away; each hit slows the enemy a little', cd: 0.5, reach: 125, arc: 1.3, f: 1.0 },
  xbow: { name: 'Crossbow', info: 'heavy bolts that pierce several enemies' },
  knife: { name: 'Throwing knife', info: 'very fast throws at short range' },
  dart: { name: 'Dart', info: 'the fastest throws in the game, but very short range' },
  thrownaxe: { name: 'Thrownaxe', info: 'each axe bounces on to a second enemy' },
  chin: { name: 'Chinchompa', info: 'explodes and hits every enemy around the target' },
  short: { name: 'Shortbow', info: 'rapid fire; every 4th shot looses two arrows' },
  long: { name: 'Longbow', info: 'slow, long range; arrows hit harder the further they fly' },
};
const METALS = [['bronze', 'Bronze', 0], ['iron', 'Iron', 0], ['steel', 'Steel', 1], ['black', 'Black', 1], ['mithril', 'Mithril', 2], ['adamant', 'Adamant', 3], ['rune', 'Rune', 4], ['dragon', 'Dragon', 5]];
const METAL_NAMES = { dagger: 'dagger', sword: 'sword', scimitar: 'scimitar', longsword: 'longsword', mace: 'mace', battleaxe: 'battleaxe', twoh: '2h sword', halberd: 'halberd', spear: 'spear', claws: 'claws' };
METALS.forEach(([mid, mname, tier], m) => {
  const dps = 8 * Math.pow(1.22, m);
  for (const [wt, suffix] of Object.entries(METAL_NAMES)) {
    const id = `${mid}_${suffix.replace(/ /g, '_')}`;
    if (ITEMS[id]) { ITEMS[id].w.wt = wt; continue; }
    const T = WEAPON_TYPES[wt];
    const w = { kind: 'swing', wt, dmg: Math.max(3, Math.round(dps * T.f * T.cd)), cd: T.cd, reach: T.reach, arc: T.arc };
    if (T.knock) w.knock = T.knock;
    if (T.hits) { w.hits = T.hits; w.dmg = Math.max(2, Math.round(w.dmg / 1.6)); }
    item(id, `${mname} ${suffix}`, 'melee', 'weapon', tier, 'common', { w });
  }
});
// Thrown weapons: knives, darts and thrownaxes (no black thrownaxe exists), plus chinchompas
METALS.forEach(([mid, mname, tier], m) => {
  const dps = 8.5 * Math.pow(1.22, m);
  const T = { knife: [0.34, 300, 1], dart: [0.24, 230, 1], thrownaxe: [0.55, 330, 1] };
  for (const [wt, [cd, range, pierce]] of Object.entries(T)) {
    if (wt === 'thrownaxe' && mid === 'black') continue;
    const id = `${mid}_${wt}`;
    if (ITEMS[id]) continue;
    item(id, `${mname} ${wt}`, 'ranged', 'weapon', tier, 'common', { w: { kind: 'shot', wt, dmg: Math.max(2, Math.round(dps * cd * (wt === 'thrownaxe' ? 0.85 : 1))), cd, range, speed: 900, pierce, count: 1, dart: wt === 'dart', bounce: wt === 'thrownaxe' ? 1 : 0 } });
  }
});
[['chinchompa', 'Chinchompa', 2, 14], ['red_chinchompa', 'Red chinchompa', 4, 22], ['black_chinchompa', 'Black chinchompa', 7, 36]].forEach(([id, name, tier, dmg]) =>
  item(id, name, 'ranged', 'weapon', tier, 'uncommon', { w: { kind: 'shot', wt: 'chin', dmg, cd: 0.9, range: 360, speed: 700, pierce: 1, count: 1, splash: 80 } }));
// Crossbows bronze to dragon (rune and dragon exist above)
[['bronze', 'Bronze', 0], ['iron', 'Iron', 0], ['steel', 'Steel', 1], ['mithril', 'Mithril', 2], ['adamant', 'Adamant', 3]].forEach(([mid, mname, tier], m) =>
  item(`${mid}_crossbow`, `${mname} crossbow`, 'ranged', 'weapon', tier, 'common', { w: { kind: 'shot', wt: 'xbow', dmg: Math.round(9 * Math.pow(1.22, m * 1.4) * 0.85), cd: 0.85, range: 430, speed: 1000, pierce: 3, count: 1, bolt: true } }));
for (const id of ['rune_crossbow', 'dragon_crossbow', 'dragon_hunter_crossbow', 'armadyl_crossbow', 'zaryte_crossbow', 'karils_crossbow', 'dorgeshuun_crossbow']) if (ITEMS[id]) ITEMS[id].w.wt = 'xbow';
for (const id of ['abyssal_whip', 'abyssal_tentacle']) if (ITEMS[id]) ITEMS[id].w.wt = 'whip';
if (ITEMS.dragon_claws) ITEMS.dragon_claws.w.wt = 'claws';
// God staves and god spells (Mage Arena). Charge makes god spells hit 50% harder, like 20 to 30 max hit in the game.
const GOD_SPELLS = {
  saradomin: { spell: 'Saradomin Strike', icon: 'Saradomin_Strike.png', color: '#ffe680', info: 'each hit restores 1 prayer point' },
  guthix: { spell: 'Claws of Guthix', icon: 'Claws_of_Guthix.png', color: '#5fd04a', info: 'hits lower the enemy\'s defence: +10% damage taken for 4 sec' },
  zamorak: { spell: 'Flames of Zamorak', icon: 'Flames_of_Zamorak.png', color: '#ff4a2a', info: 'hits lower the enemy\'s Magic: it hits you 20% softer for 4 sec' },
};
for (const [id, name, god, tier, dmg, cd] of [
  ['saradomin_staff', 'Saradomin staff', 'saradomin', 3, 24, 0.85], ['guthix_staff', 'Guthix staff', 'guthix', 3, 24, 0.85], ['zamorak_staff', 'Zamorak staff', 'zamorak', 3, 24, 0.85],
  ['staff_of_balance', 'Staff of balance', 'guthix', 5, 32, 0.78], ['staff_of_light', 'Staff of light', 'saradomin', 6, 34, 0.72], ['staff_of_the_dead', 'Staff of the dead', 'zamorak', 6, 38, 0.78],
]) {
  const G = GOD_SPELLS[god];
  item(id, name, 'magic', 'weapon', tier, tier >= 5 ? 'uncommon' : 'common', { w: { kind: 'spell', god, spell: G.spell, icon: G.icon, dmg, cd, range: 410, speed: 640, splash: 56, color: G.color } },
    { staff_of_balance: 'Staff_of_Balance.png', staff_of_light: 'Staff_of_Light.png', staff_of_the_dead: 'Staff_of_the_Dead.png' }[id]);
}
item('saradomin_cape', 'Saradomin cape', 'magic', 'cape', 3, 'common', { dmg: 0.06, def: 1 });
item('guthix_cape', 'Guthix cape', 'magic', 'cape', 3, 'common', { dmg: 0.06, def: 1 });
item('zamorak_cape', 'Zamorak cape', 'magic', 'cape', 3, 'common', { dmg: 0.06, def: 1 });
// Bows: normal, oak, willow, maple, yew and magic, short and long
const WOODS = [['', 'Shortbow', 'Longbow', 0], ['oak', 'Oak shortbow', 'Oak longbow', 0], ['willow', 'Willow shortbow', 'Willow longbow', 1], ['maple', 'Maple shortbow', 'Maple longbow', 1], ['yew', 'Yew shortbow', 'Yew longbow', 2], ['magic', 'Magic shortbow', 'Magic longbow', 3]];
WOODS.forEach(([wid, sname, lname, tier], i) => {
  const dps = 9 * Math.pow(1.22, i);
  const sid = (wid ? wid + '_' : '') + 'shortbow', lid = (wid ? wid + '_' : '') + 'longbow';
  if (ITEMS[sid]) ITEMS[sid].w.wt = 'short';
  else item(sid, sname, 'ranged', 'weapon', tier, 'common', { w: { kind: 'shot', wt: 'short', dmg: Math.max(3, Math.round(dps * 0.42)), cd: 0.42, range: 380 + i * 8, speed: 820, pierce: 1, count: 1 } });
  if (ITEMS[lid]) ITEMS[lid].w.wt = 'long';
  else item(lid, lname, 'ranged', 'weapon', tier, 'common', { w: { kind: 'shot', wt: 'long', dmg: Math.max(4, Math.round(dps * 0.85 * 0.85)), cd: 0.85, range: 500 + i * 12, speed: 950, pierce: 2, count: 1 } });
});
// Staves: plain staff, battlestaves (Blast spells) and mystic staves (Wave spells). Air is quick, water slows,
// earth knocks back, fire hits hardest.
const ELEMENTS = [['air', 'Wind', '#d8f4ff', { cd: 0.85 }], ['water', 'Water', '#4aa0ff', { freeze: 0.35 }], ['earth', 'Earth', '#8a6a3a', { knock: 35 }], ['fire', 'Fire', '#ff7a1a', { dmg: 1.15 }]];
item('staff', 'Staff', 'magic', 'weapon', 0, 'common', { w: { kind: 'spell', spell: 'Wind Strike', icon: 'Wind_Strike.png', dmg: 6, cd: 0.85, range: 350, speed: 520, splash: 30, color: '#d8f4ff' } });
for (const [eid, spell, color, fx] of ELEMENTS) {
  for (const [kind, tier, sp, dmg, splash] of [['battlestaff', 2, 'Blast', 20, 54], ['mystic', 4, 'Wave', 32, 64]]) {
    const id = kind === 'battlestaff' ? `${eid}_battlestaff` : `mystic_${eid}_staff`;
    const name = kind === 'battlestaff' ? `${eid[0].toUpperCase() + eid.slice(1)} battlestaff` : `Mystic ${eid} staff`;
    item(id, name, 'magic', 'weapon', tier, 'common', { w: { kind: 'spell', spell: `${spell} ${sp}`, icon: `${spell}_${sp}.png`, dmg: Math.round(dmg * (fx.dmg || 1)), cd: eid === 'air' ? 0.68 : 0.8, range: 400, speed: 620, splash, color, freeze: fx.freeze, knock: fx.knock } });
  }
}
// Head
item('iron_full_helm', 'Iron full helm', 'melee', 'head', 0, 'common', { def: 3 });
item('adamant_full_helm', 'Adamant full helm', 'melee', 'head', 1, 'common', { def: 4 });
item('berserker_helm', 'Berserker helm', 'melee', 'head', 4, 'common', { def: 6, dmg: 0.03 });
item('dragon_full_helm', 'Dragon full helm', 'melee', 'head', 6, 'uncommon', { def: 9 });
item('dharoks_helm', "Dharok's helm", 'melee', 'head', 7, 'uncommon', { def: 9, hp: 5 });
item('inquisitors_great_helm', "Inquisitor's great helm", 'melee', 'head', 12, 'rare', { def: 6, dmg: 0.1 });
item('crystal_helm', 'Crystal helm', 'ranged', 'head', 9, 'uncommon', { def: 6, dmg: 0.09, pp: 2 });
item('karils_coif', "Karil's coif", 'ranged', 'head', 6, 'uncommon', { def: 5, dmg: 0.06 });
item('infinity_hat', 'Infinity hat', 'magic', 'head', 5, 'uncommon', { def: 2, dmg: 0.07 });
item('justiciar_faceguard', 'Justiciar faceguard', 'any', 'head', 12, 'rare', { def: 14, pp: 2, taken: 0.96 });
// Body
item('bronze_chainbody', 'Bronze chainbody', 'melee', 'body', 0, 'common', { def: 2, aspd: 0.02 });
item('iron_platebody', 'Iron platebody', 'melee', 'body', 0, 'common', { def: 4 });
item('black_platebody', 'Black platebody', 'melee', 'body', 1, 'common', { def: 5 });
item('adamant_platebody', 'Adamant platebody', 'melee', 'body', 2, 'common', { def: 7 });
item('dragon_chainbody', 'Dragon chainbody', 'melee', 'body', 4, 'common', { def: 10 });
item('dharoks_platebody', "Dharok's platebody", 'melee', 'body', 7, 'uncommon', { def: 15, hp: 10 });
item('inquisitors_hauberk', "Inquisitor's hauberk", 'melee', 'body', 12, 'rare', { def: 11, dmg: 0.16 });
item('hardleather_body', 'Hardleather body', 'ranged', 'body', 1, 'common', { def: 4, dmg: 0.04 });
item('blue_dhide_body', "Blue d'hide body", 'ranged', 'body', 3, 'common', { def: 6, dmg: 0.1 });
item('karils_leathertop', "Karil's leathertop", 'ranged', 'body', 6, 'uncommon', { def: 10, dmg: 0.14 });
item('infinity_top', 'Infinity top', 'magic', 'body', 5, 'uncommon', { def: 3, dmg: 0.13 });
item('elite_void_top', 'Elite void top', 'any', 'body', 7, 'uncommon', { def: 10, dmg: 0.08, pp: 3 });
item('justiciar_chestguard', 'Justiciar chestguard', 'any', 'body', 12, 'rare', { def: 24, pp: 4, taken: 0.94 });
// Legs
item('karils_leatherskirt', "Karil's leatherskirt", 'ranged', 'legs', 6, 'uncommon', { def: 7, dmg: 0.08 });
item('infinity_bottoms', 'Infinity bottoms', 'magic', 'legs', 5, 'uncommon', { def: 2, dmg: 0.09 });
item('justiciar_legguards', 'Justiciar legguards', 'any', 'legs', 12, 'rare', { def: 18, pp: 2, taken: 0.95 });
// Shield
item('granite_shield', 'Granite shield', 'melee', 'shield', 4, 'common', { def: 9 });
item('book_of_darkness', 'Book of Darkness', 'magic', 'shield', 5, 'common', { dmg: 0.08, pp: 5 });
item('spectral_spirit_shield', 'Spectral spirit shield', 'any', 'shield', 9, 'uncommon', { def: 15, pp: 5, taken: 0.92 });
// Hands
item('dragon_gloves', 'Dragon gloves', 'melee', 'hands', 4, 'common', { def: 3, dmg: 0.09 });
item('regen_bracelet', 'Regen bracelet', 'any', 'hands', 6, 'uncommon', { dmg: 0.04, regen: 1.2 });
// Feet
item('climbing_boots', 'Climbing boots', 'melee', 'feet', 0, 'common', { dmg: 0.03 });
item('infinity_boots', 'Infinity boots', 'magic', 'feet', 5, 'uncommon', { def: 2, dmg: 0.05 });
item('guardian_boots', 'Guardian boots', 'melee', 'feet', 9, 'uncommon', { def: 8, dmg: 0.02, pp: 1 });
// Cape
item('black_cape', 'Black cape', 'any', 'cape', 0, 'common', { def: 1 });
item('ghostly_cloak', 'Ghostly cloak', 'magic', 'cape', 1, 'common', { dmg: 0.05 });
item('cape_of_legends', 'Cape of Legends', 'any', 'cape', 3, 'common', { def: 5 });
item('mythical_cape', 'Mythical cape', 'melee', 'cape', 6, 'common', { def: 6, dmg: 0.03 });
item('bandos_cloak', 'Bandos cloak', 'any', 'cape', 8, 'common', { def: 3, pp: 3 });
item('ardougne_cloak_4', 'Ardougne cloak 4', 'any', 'cape', 7, 'uncommon', { def: 3, dmg: 0.04, pp: 6 });
// Third age: its own rarity, a quarter as likely as ultra rare, in shops and caskets from area 10.
const TA = (extra) => extra;
item('3rd_age_full_helmet', '3rd Age full helmet', 'melee', 'head', 10, 'thirdage', TA({ def: 12, hp: 10 }));
item('3rd_age_platebody', '3rd Age platebody', 'melee', 'body', 10, 'thirdage', TA({ def: 22, hp: 20 }));
item('3rd_age_platelegs', '3rd Age platelegs', 'melee', 'legs', 10, 'thirdage', TA({ def: 17, hp: 10 }));
item('3rd_age_plateskirt', '3rd Age plateskirt', 'melee', 'legs', 10, 'thirdage', TA({ def: 17, hp: 10 }));
item('3rd_age_kiteshield', '3rd Age kiteshield', 'melee', 'shield', 10, 'thirdage', TA({ def: 16, hp: 10 }));
item('3rd_age_longsword', '3rd Age longsword', 'melee', 'weapon', 10, 'thirdage', TA({ w: { kind: 'swing', dmg: 44, cd: 0.55, reach: 105, arc: 1.8 } }));
item('3rd_age_range_coif', '3rd Age range coif', 'ranged', 'head', 10, 'thirdage', TA({ def: 6, dmg: 0.06 }));
item('3rd_age_range_top', '3rd Age range top', 'ranged', 'body', 10, 'thirdage', TA({ def: 12, dmg: 0.14, hp: 10 }));
item('3rd_age_range_legs', '3rd Age range legs', 'ranged', 'legs', 10, 'thirdage', TA({ def: 9, dmg: 0.08 }));
item('3rd_age_vambraces', '3rd Age vambraces', 'ranged', 'hands', 10, 'thirdage', TA({ def: 4, dmg: 0.1 }));
item('3rd_age_bow', '3rd Age bow', 'ranged', 'weapon', 10, 'thirdage', TA({ w: { kind: 'shot', dmg: 38, cd: 0.5, range: 480, speed: 1100, pierce: 2, count: 1 } }));
item('3rd_age_mage_hat', '3rd Age mage hat', 'magic', 'head', 10, 'thirdage', TA({ def: 5, dmg: 0.06 }));
item('3rd_age_robe_top', '3rd Age robe top', 'magic', 'body', 10, 'thirdage', TA({ def: 8, dmg: 0.14, hp: 10 }));
item('3rd_age_robe', '3rd Age robe', 'magic', 'legs', 10, 'thirdage', TA({ def: 6, dmg: 0.1 }));
item('3rd_age_amulet', '3rd Age amulet', 'magic', 'neck', 10, 'thirdage', TA({ def: 3, dmg: 0.12 }));
item('3rd_age_wand', '3rd Age wand', 'magic', 'weapon', 10, 'thirdage', TA({ w: { kind: 'spell', spell: 'Fire Wave', icon: 'Fire_Wave.png', dmg: 44, cd: 0.7, range: 430, speed: 700, splash: 60, color: '#ff7a1a' } }));
item('3rd_age_druidic_robe_top', '3rd Age druidic robe top', 'any', 'body', 10, 'thirdage', TA({ def: 6, pp: 8, hp: 10 }));
item('3rd_age_druidic_robe_bottoms', '3rd Age druidic robe bottoms', 'any', 'legs', 10, 'thirdage', TA({ def: 5, pp: 6 }));
item('3rd_age_druidic_staff', '3rd Age druidic staff', 'magic', 'weapon', 10, 'thirdage', TA({ w: { kind: 'spell', spell: 'Fire Wave', icon: 'Fire_Wave.png', dmg: 36, cd: 0.7, range: 420, speed: 680, splash: 55, color: '#d8c060' }, pp: 6 }));
item('ring_of_3rd_age', 'Ring of 3rd Age', 'any', 'ring', 10, 'thirdage', TA({ def: 2, gold: 0.3 }));
// Neck
item('amulet_of_accuracy', 'Amulet of accuracy', 'any', 'neck', 0, 'common', { dmg: 0.03 });
item('amulet_of_defence', 'Amulet of defence', 'any', 'neck', 0, 'common', { def: 4 });
item('holy_symbol', 'Holy symbol', 'any', 'neck', 1, 'common', { def: 1, pp: 8 });
item('amulet_of_power', 'Amulet of power', 'any', 'neck', 1, 'common', { def: 3, dmg: 0.05 });
item('berserker_necklace', 'Berserker necklace', 'melee', 'neck', 5, 'common', { dmg: 0.14, def: -4 });
item('salve_amulet_ei', 'Salve amulet(ei)', 'any', 'neck', 3, 'uncommon', { def: 1, dmg: 0.1 }, 'Salve_amulet(ei).png');
item('dragonbone_necklace', 'Dragonbone necklace', 'any', 'neck', 8, 'uncommon', { dmg: 0.06, pp: 12 });
item('amulet_of_blood_fury', 'Amulet of blood fury', 'melee', 'neck', 11, 'rare', { def: 6, dmg: 0.14, regen: 1.5 });
item('necklace_of_rupture', 'Necklace of rupture', 'ranged', 'neck', 14, 'rare', { dmg: 0.24, aspd: 0.05 });
item('amulet_of_rancour', 'Amulet of rancour', 'melee', 'neck', 14, 'rare', { dmg: 0.25, aspd: 0.06 });
// Ring
item('explorers_ring_1', "Explorer's ring 1", 'any', 'ring', 0, 'common', { pp: 3 }, "Explorer's_ring_1.png");
item('ring_of_recoil', 'Ring of recoil', 'any', 'ring', 0, 'common', { def: 2, taken: 0.97 });
item('warrior_ring', 'Warrior ring', 'melee', 'ring', 4, 'common', { dmg: 0.07, aspd: 0.03 });
item('granite_ring', 'Granite ring', 'any', 'ring', 5, 'common', { def: 6 });
item('ring_of_the_gods', 'Ring of the gods', 'any', 'ring', 7, 'uncommon', { def: 2, pp: 8 });
item('treasonous_ring', 'Treasonous ring', 'melee', 'ring', 7, 'uncommon', { aspd: 0.1 });
item('tyrannical_ring', 'Tyrannical ring', 'melee', 'ring', 7, 'uncommon', { dmg: 0.08, def: 2 });
item('berserker_ring_i', 'Berserker ring (i)', 'melee', 'ring', 9, 'uncommon', { dmg: 0.16 });
item('archers_ring_i', 'Archers ring (i)', 'ranged', 'ring', 9, 'uncommon', { dmg: 0.16 });
item('seers_ring_i', 'Seers ring (i)', 'magic', 'ring', 9, 'uncommon', { dmg: 0.16 });
item('brimstone_ring', 'Brimstone ring', 'any', 'ring', 9, 'uncommon', { dmg: 0.1 });
item('ring_of_suffering', 'Ring of suffering', 'any', 'ring', 9, 'uncommon', { def: 8, hp: 10, taken: 0.95 });
item('lightbearer', 'Lightbearer', 'any', 'ring', 10, 'uncommon', { aspd: 0.08 });
item('bellator_ring', 'Bellator ring', 'melee', 'ring', 13, 'rare', { dmg: 0.16, aspd: 0.06 });

// ---------------------------------------------------------------------------
// Skills: gold buys levels. Combat skills boost whichever style your weapon uses.
// ---------------------------------------------------------------------------
const SKILLS = [
  { id: 'attack', name: 'Attack', file: 'Attack_icon.png', lane: 'melee', start: 1, info: '+1% melee damage, fewer misses (none at 99)' },
  { id: 'strength', name: 'Strength', file: 'Strength_icon.png', lane: 'melee', start: 1, info: '+3% melee damage, +1% speed' },
  { id: 'ranged', name: 'Ranged', file: 'Ranged_icon.png', lane: 'ranged', start: 1, info: '+3% ranged damage, +1% speed' },
  { id: 'magic', name: 'Magic', file: 'Magic_icon.png', lane: 'magic', start: 1, info: '+3% magic damage, +1% splash' },
  { id: 'defence', name: 'Defence', file: 'Defence_icon.png', lane: 'any', start: 1, info: 'blocks more damage' },
  { id: 'hitpoints', name: 'Hitpoints', file: 'Hitpoints_icon.png', lane: 'any', start: 10, info: '+5 max hitpoints' },
  { id: 'prayer', name: 'Prayer', file: 'Prayer_icon.png', lane: 'any', start: 1, info: '+2 prayer, slower drain' },
  { id: 'agility', name: 'Agility', file: 'Agility_icon.png', lane: 'any', start: 1, info: '+0.6% run speed' },
  { id: 'thieving', name: 'Thieving', file: 'Thieving_icon.png', lane: 'any', start: 1, info: '+2% gold from kills' },
  { id: 'slayer', name: 'Slayer', file: 'Slayer_icon.png', lane: 'any', start: 1, info: '+0.5% critical hits. Real slayer drops need their Slayer level' },
];

// ---------------------------------------------------------------------------
// Monsters. style decides which protection prayer blocks it.
// caster: shoots from range. size: drawn height in px.
// ---------------------------------------------------------------------------
const MONSTERS = {};
function mon(id, name, file, lvl, hp, spd, dmg, size, gold, style, extra) {
  MONSTERS[id] = { id, name, file, lvl, hp, spd, dmg, size, gold, style, ...(extra || {}) };
}
const MAGIC_BOLT = (color) => ({ range: 290, cd: 2.2, color, speed: 300 });
const ARROW = (color) => ({ range: 320, cd: 2.0, color, speed: 420 });
// Lumbridge
mon('chicken', 'Chicken', 'Chicken_(1).png', 1, 4, 95, 1, 36, 2, 'melee');
mon('cow', 'Cow', 'Cow_(1).png', 2, 8, 80, 1, 58, 2, 'melee');
mon('giant_rat', 'Giant rat', 'Giant_rat.png', 3, 6, 115, 1, 38, 2, 'melee');
mon('goblin', 'Goblin', 'Goblin.png', 2, 9, 105, 2, 46, 3, 'melee');
mon('man', 'Man', 'Man_(blue).png', 2, 10, 100, 2, 60, 3, 'melee', { elite: true });
// Draynor Manor
mon('zombie', 'Zombie', 'Zombie_(Level_13).png', 13, 18, 85, 3, 60, 3, 'melee');
mon('skeleton', 'Skeleton', 'Skeleton_(level_21,_1).png', 21, 20, 98, 3, 56, 4, 'melee');
mon('ghost', 'Ghost', 'Ghost.png', 19, 22, 110, 3, 60, 4, 'melee');
mon('giant_bat', 'Giant bat', 'Giant_bat.png', 27, 18, 150, 3, 48, 4, 'melee');
mon('dark_wizard', 'Dark wizard', 'Dark_wizard.png', 20, 26, 72, 4, 58, 6, 'magic', { elite: true, caster: MAGIC_BOLT('#c040ff') });
// Varrock
mon('guard', 'Guard', 'Guard_(Varrock,_1).png', 21, 32, 100, 4, 62, 5, 'melee');
mon('barbarian', 'Barbarian', 'Barbarian_(Blue_Moon_Inn).png', 17, 28, 105, 4, 62, 5, 'melee');
mon('black_knight', 'Black Knight', 'Black_Knight_(male).png', 33, 60, 96, 6, 64, 8, 'melee', { elite: true });
// Varrock Sewers
mon('moss_giant', 'Moss giant', 'Moss_giant.png', 42, 48, 72, 5, 84, 8, 'melee');
// Falador
mon('dwarf', 'Dwarf', 'Dwarf.png', 10, 30, 100, 4, 46, 5, 'melee');
mon('white_knight', 'White Knight', 'White_Knight_(initiate,_male).png', 36, 60, 96, 6, 64, 8, 'melee', { elite: true });
mon('hill_giant', 'Hill Giant', 'Hill_Giant.png', 28, 62, 76, 6, 86, 7, 'melee', { elite: true });
// Crandor
mon('lesser_demon', 'Lesser demon', 'Lesser_demon.png', 82, 110, 86, 8, 86, 12, 'melee', { elite: true });
// Kalphite Lair
mon('kalphite_worker', 'Kalphite Worker', 'Kalphite_Worker.png', 28, 40, 120, 5, 50, 6, 'melee');
mon('kalphite_soldier', 'Kalphite Soldier', 'Kalphite_Soldier.png', 85, 90, 105, 9, 70, 10, 'melee');
mon('kalphite_guardian', 'Kalphite Guardian', 'Kalphite_Guardian.png', 141, 170, 90, 12, 90, 16, 'melee', { elite: true });
// Wilderness
mon('green_dragon', 'Green dragon', 'Green_dragon.png', 79, 120, 80, 9, 100, 13, 'magic', { caster: { range: 220, cd: 2.6, color: '#ff7a1a', speed: 320 } });
mon('ankou', 'Ankou', 'Ankou.png', 75, 90, 105, 9, 64, 11, 'melee');
mon('greater_demon', 'Greater demon', 'Greater_demon.png', 92, 160, 90, 12, 92, 15, 'melee', { elite: true });
mon('black_demon', 'Black demon', 'Black_demon.png', 172, 240, 90, 15, 100, 20, 'melee', { elite: true });
// God Wars Dungeon (Bandos)
mon('ork', 'Ork', 'Ork.png', 107, 160, 100, 13, 70, 14, 'melee');
mon('ogre', 'Ogre', 'Ogre.png', 53, 150, 80, 12, 92, 14, 'melee');
mon('hobgoblin', 'Hobgoblin', 'Hobgoblin.png', 28, 110, 108, 11, 58, 12, 'melee');
mon('sergeant_strongstack', 'Sergeant Strongstack', 'Sergeant_Strongstack.png', 141, 300, 95, 16, 64, 25, 'melee', { elite: true });
mon('sergeant_steelwill', 'Sergeant Steelwill', 'Sergeant_Steelwill.png', 142, 280, 80, 15, 64, 25, 'magic', { caster: { range: 300, cd: 1.8, color: '#ffd23a', speed: 340 } });
mon('sergeant_grimspike', 'Sergeant Grimspike', 'Sergeant_Grimspike.png', 142, 280, 80, 21, 64, 25, 'ranged', { caster: { range: 340, cd: 1.6, color: '#b0a080', speed: 460 } });
// Zul-Andra
mon('snakeling', 'Snakeling', 'Snakeling.png', 90, 60, 140, 12, 40, 10, 'magic');
mon('lizardman', 'Lizardman', 'Lizardman_(level_53).png', 53, 140, 100, 13, 70, 14, 'ranged', { caster: ARROW('#7ad04a') });
mon('lizardman_brute', 'Lizardman brute', 'Lizardman_brute.png', 73, 220, 95, 16, 80, 18, 'melee', { elite: true });
// Fight Caves
mon('tz_kih', 'Tz-Kih', 'Tz-Kih.png', 22, 120, 130, 12, 46, 10, 'melee', { drain: 3 });
mon('tz_kek', 'Tz-Kek', 'Tz-Kek_(level_45).png', 45, 200, 95, 15, 64, 14, 'melee');
mon('tok_xil', 'Tok-Xil', 'Tok-Xil_(1).png', 90, 260, 85, 17, 84, 18, 'ranged', { caster: ARROW('#ffb040') });
mon('yt_mejkot', 'Yt-MejKot', 'Yt-MejKot_(1).png', 180, 420, 85, 22, 100, 24, 'melee', { elite: true });
mon('ket_zek', 'Ket-Zek', 'Ket-Zek_(1).png', 360, 560, 75, 26, 120, 30, 'magic', { elite: true, caster: MAGIC_BOLT('#ff5a1a') });
mon('yt_hurkot', 'Yt-HurKot', 'Yt-HurKot.png', 108, 300, 95, 6, 70, 8, 'melee');
// Ungael
mon('brutal_black_dragon', 'Brutal black dragon', 'Brutal_black_dragon.png', 318, 600, 85, 26, 120, 32, 'magic', { elite: true, caster: { range: 260, cd: 2.4, color: '#ff4a1a', speed: 340 } });
mon('zombified_spawn', 'Zombified spawn', 'Zombified_Spawn.png', 64, 40, 70, 60, 44, 0, 'melee', { explode: true });
// Tombs of Amascut
mon('scarab_swarm', 'Scarab swarm', 'Scarab_Swarm.png', 98, 140, 140, 18, 40, 16, 'melee');
mon('baboon_brawler', 'Baboon brawler', 'Baboon_Brawler_(level-56).png', 56, 360, 110, 24, 64, 24, 'melee');
mon('baboon_thrower', 'Baboon thrower', 'Baboon_Thrower_(level-56).png', 56, 300, 100, 22, 64, 24, 'ranged', { caster: ARROW('#c89a50') });
mon('baboon_mage', 'Baboon mage', 'Baboon_Mage_(level-56).png', 56, 300, 100, 22, 64, 24, 'magic', { elite: true, caster: MAGIC_BOLT('#4aa0ff') });
// Chambers of Xeric
mon('deathly_ranger', 'Deathly ranger', 'Deathly_ranger.png', 187, 500, 85, 28, 70, 30, 'ranged', { caster: ARROW('#9adf6a') });
mon('deathly_mage', 'Deathly mage', 'Deathly_mage.png', 187, 500, 85, 28, 70, 30, 'magic', { caster: MAGIC_BOLT('#6a9adf') });
mon('lizardman_shaman', 'Lizardman shaman', 'Lizardman_shaman_(1).png', 150, 700, 90, 30, 90, 34, 'ranged', { elite: true, caster: ARROW('#5fd34a') });
mon('skeletal_mystic', 'Skeletal Mystic', 'Skeletal_mystic_(1).png', 187, 600, 90, 30, 70, 34, 'magic', { elite: true, caster: MAGIC_BOLT('#b04bff') });
// Theatre of Blood
mon('nylocas_ischyros', 'Nylocas Ischyros', 'Nylocas_Ischyros.png', 162, 400, 120, 30, 50, 28, 'melee');
mon('nylocas_toxobolos', 'Nylocas Toxobolos', 'Nylocas_Toxobolos.png', 162, 400, 110, 30, 50, 28, 'ranged', { caster: ARROW('#5fd34a') });
mon('nylocas_hagios', 'Nylocas Hagios', 'Nylocas_Hagios.png', 162, 400, 110, 30, 50, 28, 'magic', { caster: MAGIC_BOLT('#4aa0ff') });
// Ancient Prison (Nex)
mon('spiritual_warrior', 'Spiritual warrior', 'Spiritual_warrior_(Zamorak).png', 134, 600, 105, 34, 66, 34, 'melee');
mon('spiritual_ranger', 'Spiritual ranger', 'Spiritual_ranger_(Zamorak).png', 127, 560, 95, 34, 66, 34, 'ranged', { caster: ARROW('#c8a060') });
mon('spiritual_mage', 'Spiritual mage', 'Spiritual_mage_(Zamorak).png', 121, 520, 95, 34, 66, 34, 'magic', { caster: MAGIC_BOLT('#b04bff') });
mon('fumus', 'Fumus', 'Fumus.png', 285, 1100, 70, 38, 80, 60, 'magic', { elite: true, caster: MAGIC_BOLT('#7a7a7a') });
mon('glacies', 'Glacies', 'Glacies.png', 285, 1100, 70, 38, 80, 60, 'magic', { elite: true, caster: MAGIC_BOLT('#9fe8ff') });
// Inferno
mon('jal_nib', 'Jal-Nib', 'Jal-Nib.png', 32, 120, 140, 20, 36, 10, 'melee');
mon('jal_mejrah', 'Jal-MejRah', 'Jal-MejRah.png', 85, 400, 150, 30, 60, 30, 'ranged', { caster: ARROW('#ff8a3a') });
mon('jal_ak', 'Jal-Ak', 'Jal-Ak.png', 165, 700, 85, 38, 80, 40, 'magic', { caster: MAGIC_BOLT('#ff5a1a') });
mon('jal_imkot', 'Jal-ImKot', 'Jal-ImKot.png', 240, 900, 80, 44, 100, 45, 'melee', { elite: true });
mon('jal_xil', 'Jal-Xil', 'Jal-Xil.png', 370, 900, 75, 44, 110, 50, 'ranged', { elite: true, caster: ARROW('#ffb040') });
mon('jal_zek', 'Jal-Zek', 'Jal-Zek.png', 490, 1200, 70, 50, 130, 60, 'magic', { elite: true, caster: MAGIC_BOLT('#ff3a1a') });

// Bosses. kind selects the AI in game.js.
mon('cow_boss', 'Brutus', 'Brutus.png', 30, 420, 95, 6, 130, 60, 'melee', { boss: 'cow' });
mon('count_draynor', 'Count Draynor', 'Count_Draynor.png', 34, 700, 95, 8, 80, 80, 'melee', { boss: 'count' });
mon('delrith', 'Delrith', 'Delrith.png', 27, 900, 85, 9, 110, 100, 'magic', { boss: 'delrith' });
mon('scurrius', 'Scurrius', 'Scurrius.png', 200, 1300, 90, 12, 150, 130, 'melee', { boss: 'scurrius' });
mon('giant_mole', 'Giant Mole', 'Giant_Mole.png', 230, 1700, 100, 14, 150, 150, 'melee', { boss: 'mole' });
mon('elvarg', 'Elvarg', 'Elvarg.png', 83, 2800, 95, 20, 190, 180, 'melee', { boss: 'dragon' });
mon('kalphite_queen', 'Kalphite Queen', 'Kalphite_Queen.png', 333, 3000, 95, 24, 190, 220, 'melee', { boss: 'kq', noPray: true });
const KQ_FORM2_FILE = 'Kalphite_Queen_2nd_form.png'; // her airborne second form
const KQ_MORPH = 4; // seconds she spends collapsing and rising between forms
mon('kbd', 'King Black Dragon', 'King_Black_Dragon.png', 276, 4400, 85, 26, 220, 260, 'melee', { boss: 'kbd' });
mon('graardor', 'General Graardor', 'General_Graardor.png', 624, 5000, 150, 28, 200, 320, 'melee', { boss: 'graardor' });
mon('zulrah', 'Zulrah', 'Zulrah_(serpentine).png', 725, 5600, 0, 30, 200, 380, 'ranged', { boss: 'zulrah' });
mon('jad', 'TzTok-Jad', 'TzTok-Jad.png', 702, 6400, 55, 32, 230, 420, 'melee', { boss: 'jad' });
mon('vorkath', 'Vorkath', 'Vorkath.png', 732, 7600, 0, 34, 230, 480, 'magic', { boss: 'vorkath' });
mon('wardens', "Tumeken's Warden", "Tumeken's_Warden.png", 544, 10000, 0, 38, 230, 540, 'magic', { boss: 'wardens' });
mon('olm', 'Great Olm', 'Great_Olm.png', 1043, 11500, 0, 40, 240, 600, 'magic', { boss: 'olm' });
mon('verzik', 'Verzik Vitur', 'Verzik_Vitur.png', 1040, 13000, 70, 44, 230, 680, 'magic', { boss: 'verzik' });
mon('nex', 'Nex', 'Nex.png', 1001, 8800, 95, 36, 190, 760, 'magic', { boss: 'nex' });
mon('zuk', 'TzKal-Zuk', 'TzKal-Zuk.png', 1400, 16000, 0, 60, 280, 0, 'magic', { boss: 'zuk' });

// Zulrah's three forms
// Raid rooms: the bosses before each raid's final boss (sub: shorter fights), with their minions (wiki images).
// CoX bosses have no fixed combat level (they scale with the party), so they show none.
mon('baba', 'Ba-Ba', 'Ba-Ba.png', 359, 5000, 90, 36, 200, 260, 'melee', { boss: 'baba', sub: true });
mon('kephri', 'Kephri', 'Kephri.png', 341, 5000, 0, 34, 210, 260, 'magic', { boss: 'kephri', sub: true });
mon('akkha', 'Akkha', 'Akkha.png', 337, 5000, 80, 36, 210, 260, 'magic', { boss: 'akkha', sub: true });
mon('zebak', 'Zebak', 'Zebak.png', 371, 5000, 0, 38, 220, 260, 'magic', { boss: 'zebak', sub: true });
mon('tekton', 'Tekton', 'Tekton.png', null, 5000, 85, 40, 210, 280, 'melee', { boss: 'tekton', sub: true });
mon('vanguard_melee', 'Vanguard (melee)', 'Vanguard_(melee).png', null, 3000, 70, 34, 150, 160, 'melee', { boss: 'vanguard', sub: true });
mon('vanguard_ranged', 'Vanguard (ranged)', 'Vanguard_(ranged).png', null, 3000, 0, 30, 150, 160, 'ranged', { boss: 'vanguard', sub: true });
mon('vanguard_magic', 'Vanguard (magic)', 'Vanguard_(magic).png', null, 3000, 0, 30, 150, 160, 'magic', { boss: 'vanguard', sub: true });
mon('vasa', 'Vasa Nistirio', 'Vasa_Nistirio.png', null, 5000, 60, 36, 210, 280, 'ranged', { boss: 'vasa', sub: true });
mon('vespula', 'Vespula', 'Vespula.png', null, 5000, 70, 34, 200, 280, 'ranged', { boss: 'vespula', sub: true });
mon('muttadile_small', 'Muttadile (small)', 'Muttadile.png', null, 4000, 90, 34, 150, 200, 'melee', { boss: 'muttadile', sub: true });
mon('muttadile_large', 'Muttadile (large)', 'Muttadile.png', null, 5000, 80, 40, 230, 300, 'melee', { boss: 'muttadile', sub: true });
mon('maiden', 'The Maiden of Sugadinti', 'The_Maiden_of_Sugadinti.png', 940, 5000, 0, 38, 220, 300, 'magic', { boss: 'maiden', sub: true });
mon('bloat', 'Pestilent Bloat', 'Pestilent_Bloat.png', 870, 5000, 0, 36, 200, 300, 'melee', { boss: 'bloat', sub: true });
mon('vasilias', 'Nylocas Vasilias', 'Nylocas_Vasilias_(melee).png', 800, 5000, 90, 38, 200, 300, 'melee', { boss: 'vasilias', sub: true });
mon('sotetseg', 'Sotetseg', 'Sotetseg.png', 995, 5000, 0, 40, 220, 320, 'magic', { boss: 'sotetseg', sub: true });
mon('xarpus', 'Xarpus', 'Xarpus.png', 960, 5000, 0, 40, 220, 320, 'magic', { boss: 'xarpus', sub: true });
mon('jaltok_jad', 'JalTok-Jad', 'JalTok-Jad.png', 900, 6400, 55, 40, 230, 400, 'melee', { boss: 'jad', sub: true });
const VASILIAS_FORMS = { melee: 'Nylocas_Vasilias_(melee).png', ranged: 'Nylocas_Vasilias_(ranged).png', magic: 'Nylocas_Vasilias_(magic).png' };
mon('soldier_scarab', 'Soldier scarab', 'Soldier_Scarab.png', 89, 420, 110, 26, 60, 20, 'melee');
mon('spitting_scarab', 'Spitting scarab', 'Spitting_Scarab.png', 89, 380, 90, 20, 60, 20, 'ranged', { caster: ARROW('#5fd34a'), noPray: true, onHit: { poison: 6 } });
mon('arcane_scarab', 'Arcane scarab', 'Arcane_Scarab.png', 89, 380, 90, 30, 60, 20, 'magic', { caster: MAGIC_BOLT('#ff4a4a') });
mon('akkha_shadow', "Akkha's Shadow", "Akkha's_Shadow.png", 108, 600, 100, 24, 110, 30, 'magic', { caster: MAGIC_BOLT('#8a4aff') });
mon('vasa_crystal', 'Glowing crystal', 'Glowing_crystal.png', null, 300, 0, 0, 80, 10, 'melee', { harmless: true });
mon('lux_grub', 'Lux grub', 'Lux_grub.png', null, 150, 0, 0, 50, 6, 'melee', { harmless: true });
mon('vespine_soldier', 'Vespine soldier', 'Vespine_soldier.png', null, 360, 120, 24, 70, 20, 'melee', { onHit: { poison: 8 } });
mon('blood_spawn', 'Blood spawn', 'Blood_spawn.png', 55, 80, 70, 10, 50, 6, 'magic');
const ZULRAH_FORMS = [
  { style: 'ranged', name: 'serpentine', file: 'Zulrah_(serpentine).png', color: '#5fd34a' },
  { style: 'melee', name: 'magma', file: 'Zulrah_(magma).png', color: '#ff5a1a' },
  { style: 'magic', name: 'tanzanite', file: 'Zulrah_(tanzanite).png', color: '#4aa0ff' },
];

// ---------------------------------------------------------------------------
// The route: each area has two waves, then its own boss.
// map: [mapId, plane, x, y, scale] for the top-down OSRS Wiki world map, centred on game tile x,y.
// bg: a wiki screenshot of the place (used if the map tiles can't load). music: the in-game track.
// look: fallback tile colours if the screenshot can't load.
// ---------------------------------------------------------------------------
const AREAS = [
  { name: 'Lumbridge', map: [0, 0, 3222, 3218, 1], bg: 'Lumbridge.png', music: 'Harmony.ogg', hordes: ['chicken', 'cow', 'giant_rat', 'goblin'], elites: ['man'], boss: 'cow_boss', look: ['#4a7a30', '#3f6a2a', '#5b8c3a'] },
  { name: 'Draynor Manor', map: [0, 0, 3109, 3353, 1], bg: 'Draynor_Manor.png', music: 'Spooky.ogg', hordes: ['zombie', 'skeleton', 'ghost', 'giant_bat'], elites: ['dark_wizard'], boss: 'count_draynor', look: ['#3a3a2e', '#2e2e25', '#46463a'] },
  { name: 'Varrock', map: [0, 0, 3212, 3425, 1], bg: 'Varrock.png', music: 'Adventure.ogg', hordes: ['guard', 'barbarian', 'man'], elites: ['dark_wizard', 'black_knight'], boss: 'delrith', look: ['#6a6458', '#5a5448', '#7a7468'] },
  { name: 'Varrock Sewers', map: [12, 0, 3237, 9890, 1.5], bg: 'Varrock_Sewers.png', music: 'Oh_Rats!.ogg', hordes: ['giant_rat', 'zombie', 'skeleton'], elites: ['moss_giant'], boss: 'scurrius', look: ['#3e4a36', '#333d2c', '#4a5940'] },
  { name: 'Falador', map: [0, 0, 2965, 3378, 1], bg: 'Falador.png', music: 'Fanfare.ogg', hordes: ['dwarf', 'guard', 'giant_rat'], elites: ['white_knight', 'black_knight', 'hill_giant'], boss: 'giant_mole', look: ['#4f8536', '#43732d', '#5f9a40'] },
  { name: 'Crandor', map: [0, 0, 2845, 3260, 1], bg: 'Crandor.png', music: 'The_Shadow.ogg', hordes: ['skeleton', 'moss_giant'], elites: ['lesser_demon'], boss: 'elvarg', look: ['#5a4a3a', '#4b3c2f', '#6b3a22'] },
  { name: 'Kalphite Lair', map: [0, 0, 3230, 3110, 1], bg: 'Fighting_Kalphite_Queen.png', music: 'Insect_Queen.ogg', hordes: ['kalphite_worker', 'kalphite_soldier'], elites: ['kalphite_guardian'], boss: 'kalphite_queen', look: ['#7a6440', '#6a5434', '#8a744e'] },
  { name: 'Wilderness', map: [0, 0, 3110, 3790, 1], bg: 'Wilderness.png', music: 'Attack_5.ogg', hordes: ['ankou', 'green_dragon', 'skeleton'], elites: ['greater_demon', 'black_demon'], boss: 'kbd', look: ['#5a4a32', '#4b3d29', '#6b5a3f'] },
  { name: 'God Wars Dungeon', map: [7, 2, 2878, 5318, 1.3], bg: 'God_Wars_Dungeon_Entrance.png', music: 'Bandos_Battalion.ogg', hordes: ['goblin', 'hobgoblin', 'ork', 'ogre'], elites: ['sergeant_strongstack'], boss: 'graardor', look: ['#5a4232', '#4a3628', '#6a5040'] },
  { name: 'Zul-Andra', map: [0, 0, 2250, 3090, 1], bg: 'Zul-Andra.png', music: 'Coil.ogg', hordes: ['snakeling', 'lizardman'], elites: ['lizardman_brute'], boss: 'zulrah', look: ['#2e5a4a', '#244a3c', '#3a6a58'] },
  { name: 'Fight Caves', map: [23, 0, 2440, 5150, 1], bg: 'TzHaar_Fight_Cave.png', music: 'TzHaar!.ogg', hordes: ['tz_kih', 'tz_kek', 'tok_xil'], elites: ['yt_mejkot', 'ket_zek'], boss: 'jad', look: ['#3a1a10', '#2b130b', '#6b2a0e'] },
  { name: 'Ungael', map: [0, 0, 2272, 4062, 1.6], bg: 'Ungael.png', music: 'On_Thin_Ice.ogg', hordes: ['zombie', 'skeleton'], elites: ['brutal_black_dragon'], boss: 'vorkath', look: ['#5a6a7a', '#4a5a6a', '#6a7a8a'] },
  { name: 'Ancient Prison', map: [7, 2, 2912, 5335, 1.3], bg: 'Fighting_Nex.png', music: 'The_Ancient_Prison.ogg', hordes: ['spiritual_warrior', 'spiritual_ranger', 'spiritual_mage'], elites: ['fumus', 'glacies'], boss: 'nex', look: ['#3a2a4a', '#2e223c', '#4a3a5a'] },
  { name: 'Tombs of Amascut', map: [0, 0, 3262, 2785, 1.3], bg: "Tombs_of_Amascut_-_fighting_Tumeken's_Warden.png", music: "Amascut's_Promise.ogg", hordes: ['scarab_swarm', 'baboon_brawler', 'baboon_thrower'], elites: ['baboon_mage'], boss: 'wardens', raid: [['baba', 'kephri'], ['akkha', 'zebak']], look: ['#8a6a3a', '#7a5a2e', '#9a7a48'] },
  { name: 'Chambers of Xeric', map: [0, 0, 1250, 3560, 1], bg: 'Fighting_Great_Olm.png', music: 'Fire_in_the_Deep.ogg', hordes: ['deathly_ranger', 'deathly_mage'], elites: ['lizardman_shaman', 'skeletal_mystic'], boss: 'olm', raid: [['tekton', ['vanguard_melee', 'vanguard_ranged', 'vanguard_magic'], 'vasa'], ['vespula', 'muttadile_small', 'muttadile_large']], look: ['#2e3a4a', '#25303c', '#3a4858'] },
  { name: 'Theatre of Blood', map: [0, 0, 3660, 3220, 1], bg: 'Fighting_Verzik_Vitur.png', music: 'The_Fat_Lady_Sings.ogg', hordes: ['nylocas_ischyros', 'nylocas_toxobolos', 'nylocas_hagios'], elites: [], boss: 'verzik', raid: [['maiden', 'bloat'], ['vasilias', 'sotetseg', 'xarpus']], look: ['#4a1a1a', '#3a1414', '#5a2424'] },
  { name: 'The Inferno', map: [23, 0, 2500, 5100, 1], bg: 'Inferno_arena_overview.png', music: 'Inferno.ogg', hordes: ['jal_nib', 'jal_mejrah', 'jal_ak'], elites: ['jal_imkot', 'jal_xil', 'jal_zek'], boss: 'zuk', raid: [null, [['jaltok_jad', 'jaltok_jad', 'jaltok_jad']]], finaleMobs: 0, look: ['#4a1408', '#3a1006', '#6a200a'] },
];
const WAVES_PER_AREA = 2;
// Top-down map tiles from the wiki's world map (zoom 3: 256px per 32x32 game tiles, no icons).
const MAP_TILES = 'https://maps.runescape.wiki/osrs/tiles/';
const MAP_VERSION = '2019-10-31_1';

// Music for menus
const MUSIC_TITLE = 'Scape_Main.ogg';
const MUSIC_SHOP = 'Sea_Shanty_2.ogg';

// Overhead quotes said by monsters and bosses (real in-game lines).
const QUOTES = {
  cow_boss: ['*snort*', '*growls*'],
  graardor: ['Death to our enemies!', 'Brargh!', 'Break their bones!', 'For the glory of the Big High War God!', 'Split their skulls!', 'Crush them underfoot!', 'All glory to Bandos!', 'CHAAARGE!', 'We feast on the bones of our enemies tonight!'],
  verzik: ['You think you can defeat me?', 'Behold my true nature!', "I'm not finished with you just yet!", 'You think this is over?!'],
  nex: ['AT LAST!', 'Fear the shadow!', 'Taste my wrath!'],
  nex_smoke: ['Fill my soul with smoke!'],
  nex_shadow: ['Darken my shadow!'],
  nex_blood: ['Flood my lungs with blood!'],
  nex_ice: ['Infuse me with the power of ice!'],
  nex_zaros: ['NOW, THE POWER OF ZAROS!'],
};

// Treasure Trails: a rare clue scroll drop summons a random real boss from outside the route.
// Their hitpoints and damage grow with the run (see spawnMonster), and the kill drops a reward casket.
mon('clue_obor', 'Obor', 'Obor.png', 106, 0, 85, 0, 130, 60, 'melee', { clue: true, clueMult: 1.2 });
mon('clue_bryophyta', 'Bryophyta', 'Bryophyta.png', 128, 0, 80, 0, 130, 60, 'magic', { clue: true, clueMult: 1.2, caster: MAGIC_BOLT('#5fd34a') });
mon('clue_chaos_elemental', 'Chaos Elemental', 'Chaos_Elemental.png', 305, 0, 95, 0, 140, 60, 'magic', { clue: true, clueMult: 1.3, caster: MAGIC_BOLT('#ff4ad0') });
mon('clue_callisto', 'Callisto', 'Callisto.png', 470, 0, 95, 0, 150, 60, 'melee', { clue: true, clueMult: 1.5 });
mon('clue_kraken', 'Kraken', 'Kraken.png', 291, 0, 0, 0, 150, 60, 'magic', { clue: true, clueMult: 1.3, caster: { range: 520, cd: 1.6, color: '#3fa0ff', speed: 360 } });
mon('clue_dagannoth_supreme', 'Dagannoth Supreme', 'Dagannoth_Supreme.png', 303, 0, 90, 0, 120, 60, 'ranged', { clue: true, clueMult: 1.3, caster: ARROW('#c8e0ff') });
mon('clue_pestilent_bloat', 'Pestilent Bloat', 'Pestilent_Bloat.png', 312, 0, 70, 0, 130, 60, 'melee', { clue: true, clueMult: 1.4 });
mon('clue_umbra', 'Umbra', 'Umbra.png', 285, 0, 90, 0, 90, 60, 'magic', { clue: true, clueMult: 1.1, caster: MAGIC_BOLT('#333') });
mon('clue_cruor', 'Cruor', 'Cruor.png', 285, 0, 90, 0, 90, 60, 'magic', { clue: true, clueMult: 1.1, caster: MAGIC_BOLT('#c01a1a') });
// More clue bosses (images and signature mechanics from each boss's wiki page). mech drives their special:
// slam (default), bombs (scattered blasts), volley (projectile fan), summon (minions), bind (roots you),
// pierce (hits through prayer), drain (prayer drain), leech (heals on hit), rage (hits harder as it weakens), gaze (huge unblockable hit you must dodge).
const MB = (c) => ({ range: 360, cd: 1.7, color: c, speed: 380 });
mon('clue_dharok', 'Dharok the Wretched', 'Dharok_the_Wretched.png', 115, 0, 95, 0, 100, 60, 'melee', { clue: true, clueMult: 1.3, mech: 'rage' });
mon('clue_ahrim', 'Ahrim the Blighted', 'Ahrim_the_Blighted.png', 98, 0, 75, 0, 100, 60, 'magic', { clue: true, clueMult: 1.1, mech: 'volley', caster: MB('#7a3aff') });
mon('clue_karil', 'Karil the Tainted', 'Karil_the_Tainted.png', 98, 0, 80, 0, 100, 60, 'ranged', { clue: true, clueMult: 1.1, mech: 'volley', caster: MB('#c8a060') });
mon('clue_verac', 'Verac the Defiled', 'Verac_the_Defiled.png', 115, 0, 90, 0, 100, 60, 'melee', { clue: true, clueMult: 1.2, mech: 'pierce', noPray: true });
mon('clue_guthan', 'Guthan the Infested', 'Guthan_the_Infested.png', 115, 0, 90, 0, 100, 60, 'melee', { clue: true, clueMult: 1.2, mech: 'leech' });
mon('clue_torag', 'Torag the Corrupted', 'Torag_the_Corrupted.png', 115, 0, 85, 0, 100, 60, 'melee', { clue: true, clueMult: 1.3, mech: 'slam' });
mon('clue_sarachnis', 'Sarachnis', 'Sarachnis.png', 318, 0, 85, 0, 130, 60, 'melee', { clue: true, clueMult: 1.4, mech: 'bind', summons: 'scarab_swarm' });
mon('clue_venenatis', 'Venenatis', 'Venenatis.png', 464, 0, 90, 0, 150, 60, 'magic', { clue: true, clueMult: 1.5, mech: 'drain', caster: MB('#5fd34a') });
mon('clue_vetion', "Vet'ion", "Vet'ion.png", 454, 0, 85, 0, 150, 60, 'magic', { clue: true, clueMult: 1.5, mech: 'bombs' });
mon('clue_scorpia', 'Scorpia', 'Scorpia.png', 225, 0, 100, 0, 120, 60, 'melee', { clue: true, clueMult: 1.3, mech: 'drain' });
mon('clue_chaos_fanatic', 'Chaos Fanatic', 'Chaos_Fanatic.png', 202, 0, 70, 0, 100, 60, 'magic', { clue: true, clueMult: 1.2, mech: 'bombs', caster: MB('#5fd34a') });
mon('clue_crazy_arch', 'Crazy archaeologist', 'Crazy_archaeologist.png', 204, 0, 70, 0, 100, 60, 'ranged', { clue: true, clueMult: 1.2, mech: 'bombs', say: 'Rain of knowledge!', caster: MB('#c8a060') });
mon('clue_zilyana', 'Commander Zilyana', 'Commander_Zilyana.png', 596, 0, 140, 0, 120, 60, 'melee', { clue: true, clueMult: 1.6, mech: 'fast' });
mon('clue_kril', "K'ril Tsutsaroth", "K'ril_Tsutsaroth.png", 650, 0, 90, 0, 170, 60, 'melee', { clue: true, clueMult: 1.7, mech: 'pierce' });
mon('clue_kreearra', "Kree'arra", "Kree'arra.png", 580, 0, 70, 0, 170, 60, 'ranged', { clue: true, clueMult: 1.7, mech: 'volley', caster: MB('#9fd8ff') });
mon('clue_corp', 'Corporeal Beast', 'Corporeal_Beast.png', 785, 0, 60, 0, 190, 60, 'magic', { clue: true, clueMult: 2.2, mech: 'pierce', caster: MB('#d8f4ff') });
mon('clue_cerberus', 'Cerberus', 'Cerberus.png', 318, 0, 95, 0, 160, 60, 'melee', { clue: true, clueMult: 1.6, mech: 'summon', summons: 'spiritual_warrior' });
mon('clue_sire', 'Abyssal Sire', 'Abyssal_Sire_(phase_1).png', 350, 0, 40, 0, 180, 60, 'melee', { clue: true, clueMult: 1.8, mech: 'summon', summons: 'black_demon' });
mon('clue_hydra', 'Alchemical Hydra', 'Alchemical_Hydra_(serpentine).png', 426, 0, 70, 0, 170, 60, 'ranged', { clue: true, clueMult: 1.8, mech: 'volley', caster: MB('#5fd34a') });
mon('clue_smoke_devil', 'Thermonuclear smoke devil', 'Thermonuclear_smoke_devil.png', 301, 0, 70, 0, 120, 60, 'magic', { clue: true, clueMult: 1.3, mech: 'volley', caster: MB('#888888') });
mon('clue_rex', 'Dagannoth Rex', 'Dagannoth_Rex.png', 303, 0, 95, 0, 130, 60, 'melee', { clue: true, clueMult: 1.4, mech: 'slam' });
mon('clue_prime', 'Dagannoth Prime', 'Dagannoth_Prime.png', 303, 0, 70, 0, 130, 60, 'magic', { clue: true, clueMult: 1.4, mech: 'bombs', caster: MB('#3fd0ff') });
mon('clue_skotizo', 'Skotizo', 'Skotizo.png', 321, 0, 85, 0, 160, 60, 'melee', { clue: true, clueMult: 1.6, mech: 'summon', summons: 'lesser_demon' });
mon('clue_muspah', 'Phantom Muspah', 'Phantom_Muspah_(ranged).png', 541, 0, 70, 0, 160, 60, 'ranged', { clue: true, clueMult: 1.8, mech: 'bombs', caster: MB('#7a5aff') });
mon('clue_nightmare', 'The Nightmare', 'The_Nightmare.png', 814, 0, 70, 0, 190, 60, 'magic', { clue: true, clueMult: 2.2, mech: 'bombs', caster: MB('#9a5aff') });
mon('clue_sucellus', 'Duke Sucellus', 'Duke_Sucellus.png', 1131, 0, 0, 0, 190, 60, 'magic', { clue: true, clueMult: 2.2, mech: 'gaze', caster: MB('#5fd34a') });
mon('clue_leviathan', 'The Leviathan', 'The_Leviathan.png', 1062, 0, 0, 0, 200, 60, 'ranged', { clue: true, clueMult: 2.2, mech: 'volley', caster: MB('#3fa0ff') });
mon('clue_whisperer', 'The Whisperer', 'The_Whisperer.png', 1035, 0, 60, 0, 190, 60, 'magic', { clue: true, clueMult: 2.2, mech: 'volley', caster: MB('#2a8aff') });
mon('clue_vardorvis', 'Vardorvis', 'Vardorvis.png', 1110, 0, 110, 0, 160, 60, 'melee', { clue: true, clueMult: 2.2, mech: 'drain' });
mon('clue_hespori', 'Hespori', 'Hespori.png', 284, 0, 0, 0, 170, 60, 'magic', { clue: true, clueMult: 1.4, mech: 'bind', caster: MB('#5fd34a') });
mon('clue_tormented', 'Tormented Demon', 'Tormented_Demon_(1).png', 450, 0, 90, 0, 150, 60, 'melee', { clue: true, clueMult: 1.6, mech: 'bind' });
mon('clue_araxxor', 'Araxxor', 'Araxxor.png', 1025, 0, 85, 0, 190, 60, 'melee', { clue: true, clueMult: 2.1, mech: 'bombs', summons: 'scarab_swarm' });
mon('clue_amoxliatl', 'Amoxliatl', 'Amoxliatl.png', 300, 0, 85, 0, 140, 60, 'magic', { clue: true, clueMult: 1.5, mech: 'pierce', caster: MB('#9fe8ff') });
mon('clue_hueycoatl', 'The Hueycoatl', 'The_Hueycoatl.png', 666, 0, 0, 0, 200, 60, 'magic', { clue: true, clueMult: 1.9, mech: 'bombs', caster: MB('#5fd3ff') });
mon('clue_sol', 'Sol Heredit', 'Sol_Heredit.png', 1003, 0, 100, 0, 170, 60, 'melee', { clue: true, clueMult: 2.4, mech: 'pierce' });
mon('clue_dusk', 'Dusk', 'Dusk.png', 328, 0, 90, 0, 150, 60, 'melee', { clue: true, clueMult: 1.6, mech: 'gaze' });
const CLUE_BOSSES = Object.keys(MONSTERS).filter((id) => MONSTERS[id].clue);
const CLUE_FILE = 'Clue_scroll_(hard).png';
const CASKET_FILE = 'Reward_casket_(hard).png';
// Clue tiers (wiki images). Normal drops follow the area; clue bosses can drop a clue one tier higher on top of their casket.
const CLUE_TIERS = [
  { id: 'beginner', name: 'Beginner', mult: 0.7, casketLift: 1, weight: 1 },
  { id: 'easy', name: 'Easy', mult: 0.8, casketLift: 2, weight: 1.2 },
  { id: 'medium', name: 'Medium', mult: 0.9, casketLift: 2, weight: 1.4 },
  { id: 'hard', name: 'Hard', mult: 1, casketLift: 3, weight: 1.6 },
  { id: 'elite', name: 'Elite', mult: 1.25, casketLift: 4, weight: 2.2 },
  { id: 'master', name: 'Master', mult: 1.55, casketLift: 5, weight: 3.2 },
];
const clueFile = (t) => `Clue_scroll_(${CLUE_TIERS[t].id}).png`;
const casketFile = (t) => `Reward_casket_(${CLUE_TIERS[t].id}).png`;
const CLUE_UPGRADE_CHANCE = 0.3;
const DOOR_FILE = 'Exit_door.png'; // appears once every enemy is dead; walk through it to end the round

// ---------------------------------------------------------------------------
// Trading sticks: earned every run (win or lose) and spent on permanent upgrades.
// per = bonus for each level. cost grows each level.
// ---------------------------------------------------------------------------
const STICKS_FILE = 'Trading_sticks_1000.png';
const UPGRADES = [
  { id: 'dmg', name: 'Damage', file: 'Strength_icon.png', per: 0.05, max: 10, base: 30, info: (v) => `+${Math.round(v * 100)}% damage` },
  { id: 'gold', name: 'Gold gain', file: 'Coins_10000.png', per: 0.08, max: 10, base: 25, info: (v) => `+${Math.round(v * 100)}% gold` },
  { id: 'luck', name: 'Luck', file: 'Ring_of_wealth.png', per: 0.15, max: 10, base: 40, info: (v) => `+${Math.round(v * 100)}% rare items and clue scrolls` },
  { id: 'hp', name: 'Hitpoints', file: 'Hitpoints_icon.png', per: 6, max: 10, base: 25, info: (v) => `+${v} max hitpoints` },
  { id: 'def', name: 'Toughness', file: 'Defence_icon.png', per: 0.02, max: 10, base: 30, info: (v) => `-${Math.round(v * 100)}% damage taken` },
  { id: 'aspd', name: 'Attack speed', file: 'Attack_icon.png', per: 0.03, max: 10, base: 35, info: (v) => `+${Math.round(v * 100)}% attack speed` },
  { id: 'crit', name: 'Critical hits', file: 'Slayer_icon.png', per: 0.015, max: 10, base: 35, info: (v) => `+${(v * 100).toFixed(1)}% crit chance` },
  { id: 'speed', name: 'Run speed', file: 'Agility_icon.png', per: 0.03, max: 8, base: 25, info: (v) => `+${Math.round(v * 100)}% run speed` },
  { id: 'prayer', name: 'Prayer', file: 'Prayer_icon.png', per: 5, max: 8, base: 20, info: (v) => `+${v} prayer points` },
  { id: 'startGold', name: 'Starting coins', file: 'Coins_10000.png', per: 30, max: 10, base: 20, info: (v) => `start with ${v} coins` },
  { id: 'shark', name: 'Packed lunch', file: 'Shark.png', per: 1, max: 3, base: 40, info: (v) => `start with ${v} extra shark${v === 1 ? '' : 's'}` },
  { id: 'reroll', name: 'Free rerolls', file: STICKS_FILE, per: 1, max: 3, base: 50, info: (v) => `${v} free shop reroll${v === 1 ? '' : 's'} each visit` },
];

// Potion drops: short buffs picked up from the ground (on top of the permanent trading-stick upgrades).
const POTIONS = {
  super_attack: { name: 'Super attack', file: 'Super_attack(4).png', stat: 'aspd', amount: 0.4, secs: 15, info: '40% faster attacks with any weapon' },
  super_strength: { name: 'Super strength', file: 'Super_strength(4).png', stat: 'dmg_melee', style: 'melee', amount: 0.35, secs: 15, info: '35% more melee damage' },
  ranging: { name: 'Ranging potion', file: 'Ranging_potion(4).png', stat: 'dmg_ranged', style: 'ranged', amount: 0.35, secs: 15, info: '35% more ranged damage' },
  magic: { name: 'Magic potion', file: 'Magic_potion(4).png', stat: 'dmg_magic', style: 'magic', amount: 0.35, secs: 15, info: '35% more magic damage' },
  stamina: { name: 'Stamina potion', file: 'Stamina_potion(4).png', stat: 'speed', amount: 0.3, secs: 15, info: '30% faster running' },
};
// Special attacks (OSRS names and energy costs from the wiki). Press Space or tap the Special button.
// Spec energy is 0-100 and refills 10% every 3 seconds (ten times the game's 10% every 30 seconds),
// so a 25% spec is back in under 8 seconds and a 100% spec takes 30.
// melee: hits = damage multipliers per hit on the target; arc = hits everyone in reach.
// shot/spell: arrows/bolts fired with mult; aoe = explosion radius; heal = share of damage healed.
// weaken = target takes that much more damage for 10s; bind = freezes (not bosses) for n seconds.
const SPEC_REGEN = 10 / 3; // energy per second
const SPECS = {
  dragon_dagger: { name: 'Puncture', cost: 25, hits: [1.15, 1.15], info: 'two quick stabs' },
  dragon_longsword: { name: 'Cleave', cost: 25, hits: [1.5], arc: true, info: 'a heavy cleave through everything in reach' },
  dragon_scimitar: { name: 'Sever', cost: 55, hits: [1.6], weaken: 0.15, info: 'a big slash that weakens the target' },
  zamorakian_spear: { name: 'Shove', cost: 25, hits: [0.5], arc: true, bind: 2.5, knock: 90, info: 'shoves enemies back and stuns them' },
  granite_maul: { name: 'Quick Smash', cost: 50, hits: [1.4], instant: true, info: 'an instant extra smash' },
  abyssal_whip: { name: 'Energy Drain', cost: 50, hits: [1.3], bind: 1.5, info: 'a lash that roots the target' },
  abyssal_tentacle: { name: 'Binding Tentacle', cost: 50, hits: [1.4], bind: 2.5, info: 'binds the target in place' },
  dragon_claws: { name: 'Slice and Dice', cost: 50, hits: [1.0, 0.5, 0.5, 0.5], info: 'four rapid hits' },
  dragon_warhammer: { name: 'Smash', cost: 50, hits: [1.5], weaken: 0.3, info: 'crushes defence: the target takes 30% more damage' },
  saradomin_sword: { name: "Saradomin's Lightning", cost: 100, hits: [1.1], arc: true, aoe: 160, info: 'lightning strikes everyone near you' },
  bandos_godsword: { name: 'Warstrike', cost: 50, hits: [1.8], weaken: 0.25, info: 'a huge hit that weakens the target' },
  armadyl_godsword: { name: 'The Judgement', cost: 50, hits: [2.4], info: 'one enormous hit' },
  saradomin_godsword: { name: 'Healing Blade', cost: 50, hits: [1.6], heal: 0.5, info: 'heals you for half the damage' },
  abyssal_bludgeon: { name: 'Penance', cost: 50, hits: [1.7], arc: true, info: 'a crushing blow to all in reach' },
  osmumtens_fang: { name: 'Unleash', cost: 25, hits: [1.5], info: 'a precise stab that never misses' },
  dorgeshuun_crossbow: { name: 'Snipe', cost: 75, arrows: 1, mult: 2.2, weaken: 0.2, info: 'a sure bolt that weakens the target' },
  magic_shortbow: { name: 'Snapshot', cost: 55, arrows: 2, mult: 1.3, info: 'two arrows at once' },
  magic_longbow: { name: 'Powershot', cost: 35, arrows: 1, mult: 1.8, info: 'one arrow that never misses' },
  dark_bow: { name: 'Descent of Darkness', cost: 55, arrows: 2, mult: 1.8, info: 'two dragon-fire arrows' },
  dragon_crossbow: { name: 'Annihilate', cost: 60, arrows: 1, mult: 1.6, aoe: 110, info: 'an exploding bolt' },
  armadyl_crossbow: { name: 'Armadyl Eye', cost: 40, arrows: 1, mult: 2.0, info: 'a pinpoint bolt' },
  toxic_blowpipe: { name: 'Toxic Siphon', cost: 50, arrows: 1, mult: 1.6, heal: 0.5, info: 'heals you for half the damage' },
  heavy_ballista: { name: 'Power Shot', cost: 65, arrows: 1, mult: 2.4, info: 'a massive javelin' },
  zaryte_crossbow: { name: 'Evoke', cost: 75, arrows: 1, mult: 2.8, aoe: 90, info: 'a bolt that bursts on impact' },
  volatile_nightmare_staff: { name: 'Immolate', cost: 55, mult: 3.2, info: 'a huge burst of nightmare magic' },
  toxic_staff_of_the_dead: { name: 'Lock', cost: 100, lock: 20, info: 'halves damage you take for 20 seconds' },
};
// Yama's contracts (names from the wiki's Yama contracts). A strong boon with a steep price, for the rest of the run.
// At the end of a round there's a YAMA_CHANCE he appears; at most YAMA_MAX per run, and always by round YAMA_PITY.
const YAMA = { name: 'Yama', file: 'Yama.png', quotes: [
  'A binding contract. As luck would have it, I had one of my scribes draft one up for just such an occasion.',
  'Perhaps you should have expressed that opinion before signing.',
  'I take your soul. For all of eternity.',
] };
const YAMA_CHANCE = 0.12, YAMA_MAX = 2, YAMA_PITY = 13;
const CONTRACTS = [
  { id: 'severance', name: 'Contract of Divine Severance', gain: '+60% damage', cost: 'No protection prayers, enemies hit 15% harder and big boss attacks 30% harder' },
  { id: 'bloodied', name: 'Contract of Bloodied Blows', gain: '+50% attack speed', cost: 'Your max hitpoints are halved and sharks heal half as much' },
  { id: 'breath', name: 'Contract of Forfeit Breath', gain: '+75% gold and +50% luck', cost: 'Nothing heals you: no sharks, pies, rests, regeneration or lifesteal' },
  { id: 'clouding', name: 'Contract of Sensory Clouding', gain: '+1 Multishot', cost: 'Enemies hit 35% harder' },
  { id: 'glyphic', name: 'Contract of Glyphic Attenuation', gain: '+25% critical hit chance and a full special attack bar', cost: 'Enemies have 40% more hitpoints' },
];
// Invocations, after the Tombs of Amascut (names, raid levels and icons from the wiki's Invocations page).
// Picked on the title screen before a run. Each adds raid levels; the total raises trading sticks and luck.
// group: only one invocation per group can be on. needs: another invocation that must be on first.
const INVO_ICON = {
  attempts: 'Invocations_-_attempts_icon.png', time: 'Invocations_-_time_limit_icon.png', help: 'Invocations_-_helpful_spirit_icon.png',
  prayer: 'Invocations_-_prayer_effectiveness_icon.png', diet: 'Invocations_-_On_a_Diet_icon.png', dehy: 'Invocations_-_Dehydration_icon.png',
  drain: 'Invocations_-_Overly_Draining_icon.png', cox: 'Chambers_of_Xeric_Challenge_Mode_icon.png', tob: 'Verzik_Vitur.png',
  gauntlet: 'Corrupted_Hunllef.png', colosseum: 'Sol_Heredit.png', kephri: 'Kephri_icon.png', zebak: 'Zebak_icon.png', akkha: 'Akkha_icon.png', baba: 'Ba-Ba_icon.png', warden: "Tumeken's_Warden_icon.png",
};
const INVOCATIONS = [
  { id: 'softcore', name: 'Softcore Run', lvl: 15, icon: 'attempts', group: 'attempts', info: 'You can cheat death at most once' },
  { id: 'hardcore', name: 'Hardcore Run', lvl: 25, icon: 'attempts', group: 'attempts', info: 'No cheating death at all, not even Bob\'s nine lives' },
  { id: 'walk', name: 'Walk for It', lvl: 10, icon: 'time', group: 'time', secs: 150, info: 'Each wave has 2:30 (bosses 5:00). After that, enemies enrage' },
  { id: 'jog', name: 'Jog for It', lvl: 15, icon: 'time', group: 'time', secs: 120, info: 'Each wave has 2:00 (bosses 4:00). After that, enemies enrage' },
  { id: 'run', name: 'Run for It', lvl: 20, icon: 'time', group: 'time', secs: 90, info: 'Each wave has 1:30 (bosses 3:00). After that, enemies enrage' },
  { id: 'sprint', name: 'Sprint for It', lvl: 25, icon: 'time', group: 'time', secs: 70, info: 'Each wave has 1:10 (bosses 2:20). After that, enemies enrage' },
  { id: 'help1', name: 'Need Some Help?', lvl: 15, icon: 'help', group: 'help', supply: 0.66, info: 'Sharks, prayer potions and pies: 66% as many, in your pack, drops and shops' },
  { id: 'help2', name: 'Need Less Help?', lvl: 25, icon: 'help', group: 'help', supply: 0.33, info: 'Sharks, prayer potions and pies: 33% as many, in your pack, drops and shops' },
  { id: 'help3', name: 'No Help Needed', lvl: 40, icon: 'help', group: 'help', supply: 0.1, info: 'Almost no sharks, prayer potions or pies' },
  { id: 'quiet', name: 'Quiet Prayers', lvl: 20, icon: 'prayer', info: 'Protection prayers block half the damage instead of 70%' },
  { id: 'deadly', name: 'Deadly Prayers', lvl: 20, icon: 'prayer', info: 'Every hit you take drains prayer by 20% of its damage' },
  { id: 'diet', name: 'On a Diet', lvl: 15, icon: 'diet', info: 'You can\'t eat sharks or pies' },
  { id: 'dehydration', name: 'Dehydration', lvl: 30, icon: 'dehy', info: 'You can\'t drink prayer potions' },
  { id: 'draining', name: 'Overly Draining', lvl: 15, icon: 'drain', info: 'Every special attack uses all of your energy' },
  { id: 'medic', name: 'Medic!', lvl: 15, icon: 'kephri', info: 'Scarab swarms join every wave' },
  { id: 'overlords', name: 'More Overlords', lvl: 15, icon: 'kephri', info: 'Waves have 40% more enemies, with more alive at once' },
  { id: 'aerial', name: 'Aerial Assault', lvl: 10, icon: 'kephri', info: 'Kephri\'s dung bombs fall where you stand during waves' },
  { id: 'upset', name: 'Upset Stomach', lvl: 15, icon: 'zebak', info: 'Slain enemies sometimes leave a pool of acid' },
  { id: 'arterial', name: 'Arterial Spray', lvl: 10, icon: 'zebak', info: 'Enemies heal for the damage they deal you' },
  { id: 'boulder', name: 'Boulderdash', lvl: 10, icon: 'baba', info: 'Ba-Ba\'s boulders roll across the arena' },
  { id: 'vigilant', name: 'Stay Vigilant', lvl: 15, icon: 'akkha', info: 'Archers and casters swap attack style at random, so one prayer won\'t cover them' },
  { id: 'haste', name: 'Ancient Haste', lvl: 10, icon: 'warden', info: 'All enemies move 20% faster' },
  { id: 'penetration', name: 'Penetration', lvl: 10, icon: 'warden', info: 'During boss fights, an obelisk switches your protection prayer off every 12 seconds' },
  { id: 'oc1', name: 'Overclocked', lvl: 10, icon: 'warden', info: 'Bosses attack 15% faster' },
  { id: 'oc2', name: 'Overclocked 2', lvl: 10, icon: 'warden', needs: 'oc1', info: 'Bosses attack another 15% faster' },
  { id: 'insanity', name: 'Insanity', lvl: 50, icon: 'warden', needs: 'oc2', info: 'Bosses from all over Gielinor tear into normal waves at random' },
  // Other raids and challenges (effects follow the wiki's descriptions of each mode)
  { id: 'cm', name: 'Challenge Mode', raid: 'Chambers of Xeric', lvl: 40, icon: 'cox', info: 'Every monster except the area bosses has 50% more hitpoints and hits 20% harder' },
  { id: 'hmt', name: 'Hard Mode', raid: 'Theatre of Blood', lvl: 40, icon: 'tob', info: 'Bosses have 30% more hitpoints, and Verzik heals 30% once when nearly dead' },
  { id: 'corrupted', name: 'Corrupted', raid: 'The Gauntlet', lvl: 35, icon: 'gauntlet', info: 'Enter with nothing: your trading-stick upgrades don\'t count this run' },
  { id: 'bees', name: 'Bees!', raid: 'Fortis Colosseum', lvl: 10, icon: 'colosseum', info: 'A bee swarm chases you in every fight' },
  { id: 'blasphemy', name: 'Blasphemy', raid: 'Fortis Colosseum', lvl: 15, icon: 'colosseum', info: 'Taking damage drains prayer, even hits your prayer blocks' },
  { id: 'doom', name: 'Doom', raid: 'Fortis Colosseum', lvl: 20, icon: 'colosseum', info: 'Each hit adds a Doom stack. At 12 stacks you lose half your max hitpoints. Stacks fade slowly' },
  { id: 'duo', name: 'Dynamic Duo', raid: 'Fortis Colosseum', lvl: 15, icon: 'colosseum', info: 'Elite monsters spawn in pairs' },
  { id: 'frailty', name: 'Frailty', raid: 'Fortis Colosseum', lvl: 10, icon: 'colosseum', info: 'Your max hitpoints are 20% lower' },
  { id: 'myopia', name: 'Myopia', raid: 'Fortis Colosseum', lvl: 10, icon: 'colosseum', info: 'Your bows and spells reach 25% less far' },
  { id: 'relentless', name: 'Relentless', raid: 'Fortis Colosseum', lvl: 15, icon: 'colosseum', info: 'Enemy hits ignore your Defence and armour' },
  { id: 'solarflare', name: 'Solarflare', raid: 'Fortis Colosseum', lvl: 15, icon: 'colosseum', info: 'A blazing orb circles the arena and burns you on contact' },
  { id: 'quartet', name: 'Quartet', raid: 'Fortis Colosseum', lvl: 10, icon: 'colosseum', info: 'An extra elite joins every wave' },
  { id: 'volatility', name: 'Volatility', raid: 'Fortis Colosseum', lvl: 15, icon: 'colosseum', info: 'Enemies explode when they die. Don\'t finish them up close' },
];
for (const v of INVOCATIONS) v.raid = v.raid || 'Tombs of Amascut';
// Raid level bands from the Tombs of Amascut.
function raidMode(lvl) { return lvl >= 300 ? 'Expert' : lvl >= 150 ? 'Normal' : 'Entry'; }

// The Wilderness skull. Choose it when you enter the Wilderness; it lasts until you leave.
const SKULL = { file: 'Skull_(status)_icon.png', gold: 2, luck: 0.75 };
// PKers hunt skulled players. They switch attack styles like real PKers, freeze you with Ice Barrage and dump special attacks.
// Durial321 is left out when you are playing as him.
// OSRS experience table: OSRS_XP[n] is the XP needed for level n. Level 92 is about half of 99's XP.
const OSRS_XP = (() => { const xp = [0, 0]; let pts = 0; for (let l = 1; l < 99; l++) { pts += Math.floor(l + 300 * Math.pow(2, l / 7)); xp[l + 1] = Math.floor(pts / 4); } return xp; })();
const LEVEL_GP_PER_XP = 0.0045; // gp per XP point for high levels
const PK_HP = 2.5, PK_DMG = 1.6; // PKers get this much more HP and damage than their base stats
const PKERS = ['pk_durial', 'pk_pkmaster', 'pk_purepker', 'pk_pete', 'pk_revenant', 'pk_dark_warrior', 'pk_rogue'];
mon('pk_durial', 'Durial321', 'Durial321.png', 115, 260, 175, 13, 64, 40, 'melee', { elite: true, pker: true });
// Player spoofs from the game: PKMaster0036 cut down the Falador gate guards (Garden of Tranquillity),
// Purepker895 was at the Draynor bank robbery, and Pete Kayer is the PvP tutor of the Ferox Enclave.
mon('pk_pkmaster', 'PKMaster0036', 'PKMaster0036.png', 87, 280, 165, 14, 64, 40, 'melee', { elite: true, pker: true });
mon('pk_purepker', 'Purepker895', 'Purepker895.png', 52, 170, 190, 15, 62, 30, 'melee', { elite: true, pker: true });
mon('pk_pete', 'Pete Kayer', 'Pete_Kayer.png', 126, 340, 160, 15, 66, 50, 'melee', { elite: true, pker: true });
mon('pk_revenant', 'Revenant knight', 'Revenant_knight.png', 126, 300, 140, 14, 72, 40, 'melee', { elite: true, pker: true });
mon('pk_dark_warrior', 'Dark warrior', 'Dark_warrior.png', 62, 220, 160, 12, 62, 30, 'melee', { elite: true, pker: true });
mon('pk_rogue', 'Rogue', 'Rogue.png', 15, 180, 185, 10, 60, 25, 'melee', { elite: true, pker: true });

// ---------------------------------------------------------------------------
// Random events: all 24 current ones from the wiki's Random events page, each with the NPC who brings it.
// type: talk (walk to them in time), pick (a quick puzzle screen with a timer), or an arena event.
// ---------------------------------------------------------------------------
const RANDOM_EVENTS = [
  { id: 'beekeeper', name: 'Beekeeper', npc: 'Bee keeper', file: 'Bee_keeper.png', type: 'pick' },
  { id: 'arnav', name: "Capt' Arnav's Chest", npc: "Capt' Arnav", file: "Capt'_Arnav.png", type: 'pick' },
  { id: 'certer', name: 'Certers', npc: 'Niles', file: 'Niles.png', type: 'pick' },
  { id: 'count', name: 'Count Check', npc: 'Count Check', file: 'Count_Check.png', type: 'talk', line: 'I am certainly not just a role-playing enthusiast in a costume! Never question that!' },
  { id: 'drill', name: 'Drill Demon', npc: 'Sergeant Damien', file: 'Sergeant_Damien.png', type: 'drill', line: 'Do you think you can be the best?' },
  { id: 'dwarf', name: 'Drunken Dwarf', npc: 'Drunken Dwarf', file: 'Drunken_Dwarf.png', type: 'talk' },
  { id: 'evilbob', name: 'Evil Bob', npc: 'Evil Bob', file: 'Evil_Bob.png', type: 'pick' },
  { id: 'twin', name: 'Evil twin', npc: 'Molly', file: 'Molly.png', type: 'pick' },
  { id: 'forester', name: 'Freaky Forester', npc: 'Freaky Forester', file: 'Freaky_Forester.png', type: 'forester' },
  { id: 'genie', name: 'Genie', npc: 'Genie', file: 'Genie.png', type: 'talk' },
  { id: 'gravedigger', name: 'Gravedigger', npc: 'Leo', file: 'Leo.png', type: 'pick' },
  { id: 'jekyll', name: 'Jekyll and Hyde', npc: 'Dr Jekyll', file: 'Dr_Jekyll.png', type: 'talk' },
  { id: 'frog', name: 'Kiss the frog', npc: 'Frog prince', file: 'Frog_(Kiss_the_frog,_crown)_chathead.png', type: 'pick' },
  { id: 'maze', name: 'Maze', npc: 'Mysterious Old Man', file: 'Mysterious_Old_Man.png', type: 'maze' },
  { id: 'mime', name: 'Mime', npc: 'Mime', file: 'Mime.png', type: 'pick' },
  { id: 'oldman', name: 'Mysterious Old Man', npc: 'Mysterious Old Man', file: 'Mysterious_Old_Man.png', type: 'talk' },
  { id: 'pillory', name: 'Pillory', npc: 'Pillory Guard', file: 'Pillory_Guard_chathead.png', type: 'pick' },
  { id: 'pinball', name: 'Pinball', npc: 'Flippa', file: 'Flippa.png', type: 'pinball' },
  { id: 'prisonpete', name: 'Prison Pete', npc: 'Prison Pete', file: 'Prison_Pete.png', type: 'pick' },
  { id: 'quiz', name: 'Quiz Master', npc: 'Quiz Master', file: 'Quiz_Master.png', type: 'pick' },
  { id: 'rick', name: 'Rick Turpentine', npc: 'Rick Turpentine', file: 'Rick_Turpentine.png', type: 'talk' },
  { id: 'sandwich', name: 'Sandwich lady', npc: 'Sandwich lady', file: 'Sandwich_lady.png', type: 'pick' },
  { id: 'plant', name: 'Strange plant', npc: 'Strange plant', file: 'Strange_plant.png', type: 'talk' },
  { id: 'exam', name: 'Surprise Exam', npc: 'Mr. Mordaut', file: 'Mr._Mordaut.png', type: 'pick' },
];
const RANDOM_EVENT_CHANCE = 0.35; // per normal wave, from the second wave of the run
// Props for the puzzles (item files checked on the wiki)
const SANDWICH_FOOD = [['Baguette', 'Baguette.png'], ['Triangle sandwich', 'Triangle_sandwich.png'], ['Square sandwich', 'Square_sandwich.png'], ['Chocolate bar', 'Chocolate_bar.png'], ['Kebab', 'Kebab.png'], ['Roll', 'Roll.png'], ['Meat pie', 'Meat_pie.png']];
const GRAVE_JOBS = [['Farmer', 'Rake.png'], ['Miner', 'Bronze_pickaxe.png'], ['Potter', 'Soft_clay.png'], ['Lumberjack', 'Bronze_axe.png'], ['Cook', 'Pot.png']];
const MIME_EMOTES = ['Think', 'Laugh', 'Cry', 'Dance', 'Climb Rope', 'Lean', 'Glass Box', 'Glass Wall'];
const DRILL_MATS = ['Sit up', 'Push up', 'Star jump', 'Jog'];
const ARNAV_ITEMS = [['Coins', 'Coins_100.png'], ['Gold ring', 'Gold_ring.png'], ['Gold necklace', 'Gold_necklace.png'], ['Gold bar', 'Gold_bar.png']];
const BALLOONS = ['Cat', 'Dog', 'Goat', 'Sheep'];
const PILLORY_SHAPES = [['Diamond', '◆'], ['Triangle', '▲'], ['Circle', '●'], ['Square', '■']];
const BOB_FISH = [['Raw shrimps', 'Raw_shrimps.png'], ['Raw sardine', 'Raw_sardine.png'], ['Raw herring', 'Raw_herring.png'], ['Raw anchovies', 'Raw_anchovies.png']];
const HIVE_PARTS = ['Lid', 'Body', 'Entrance', 'Legs']; // top to bottom
// Dr Jekyll's potions for each herb (wiki), mapped to this game's potion buffs
const JEKYLL_HERBS = [['Guam leaf', 'super_strength'], ['Tarromin', 'super_attack'], ['Ranarr weed', 'stamina'], ['Avantoe', 'super_attack'], ['Snapdragon', 'super_strength'], ['Dwarf weed', 'magic'], ['Torstol', 'stamina']];
mon('pheasant', 'Pheasant', 'Pheasant_(1_tail).png', 1, 1, 70, 0, 40, 0, 'melee', { harmless: true });
mon('mr_hyde', 'Mr Hyde', 'Dr_Jekyll.png', 90, 130, 135, 10, 66, 25, 'melee', { elite: true });

// The Revenant Caves: a bonus round offered only after Wilderness waves (20% each). Revenants drop ancient artefacts, and a PKer is always hunting there.
const REV_AREA = { name: 'Revenant Caves', bg: 'Revenant_Caves.png', music: 'Revenants.ogg', look: ['#2e2a3a', '#26222f', '#3a3446'],
  hordes: ['rev_imp', 'rev_goblin', 'rev_pyrefiend', 'rev_hobgoblin', 'rev_cyclops', 'rev_hellhound', 'rev_ork'], elites: ['rev_demon', 'rev_dark_beast', 'rev_dragon'] };
const REV_CHANCE = 0.2;
mon('rev_imp', 'Revenant imp', 'Revenant_imp.png', 7, 30, 140, 4, 40, 6, 'magic', { caster: MAGIC_BOLT('#9fe8ff') });
mon('rev_goblin', 'Revenant goblin', 'Revenant_goblin.png', 15, 45, 120, 5, 46, 6, 'melee');
mon('rev_pyrefiend', 'Revenant pyrefiend', 'Revenant_pyrefiend.png', 52, 60, 130, 6, 54, 8, 'magic', { caster: MAGIC_BOLT('#ff7a1a') });
mon('rev_hobgoblin', 'Revenant hobgoblin', 'Revenant_hobgoblin.png', 60, 80, 110, 7, 58, 9, 'ranged', { caster: ARROW('#9fe8ff') });
mon('rev_cyclops', 'Revenant cyclops', 'Revenant_cyclops.png', 82, 120, 95, 9, 84, 11, 'melee');
mon('rev_hellhound', 'Revenant hellhound', 'Revenant_hellhound.png', 90, 110, 140, 9, 64, 11, 'melee');
mon('rev_ork', 'Revenant ork', 'Revenant_ork.png', 105, 140, 100, 10, 70, 13, 'ranged', { caster: ARROW('#9fe8ff') });
mon('rev_demon', 'Revenant demon', 'Revenant_demon.png', 98, 200, 95, 11, 90, 16, 'magic', { elite: true, caster: MAGIC_BOLT('#9fe8ff') });
mon('rev_dark_beast', 'Revenant dark beast', 'Revenant_dark_beast.png', 120, 230, 100, 12, 86, 18, 'ranged', { elite: true, caster: ARROW('#9fe8ff') });
mon('rev_dragon', 'Revenant dragon', 'Revenant_dragon.png', 135, 300, 90, 13, 110, 22, 'magic', { elite: true, caster: { range: 260, cd: 2.4, color: '#9fe8ff', speed: 340 } });
// Ancient artefacts (wiki), worth more the rarer they are
const ARTEFACTS = [
  { name: 'Ancient emblem', file: 'Ancient_emblem.png', gold: 150, wt: 50 },
  { name: 'Ancient totem', file: 'Ancient_totem.png', gold: 300, wt: 25 },
  { name: 'Ancient statuette', file: 'Ancient_statuette.png', gold: 600, wt: 12 },
  { name: 'Ancient medallion', file: 'Ancient_medallion.png', gold: 1200, wt: 6 },
  { name: 'Ancient effigy', file: 'Ancient_effigy.png', gold: 2400, wt: 3 },
  { name: 'Ancient relic', file: 'Ancient_relic.png', gold: 4800, wt: 1 },
];

// Superior monsters: a rare, much tougher version of any horde monster. "A superior foe has appeared..."
const SUPERIOR_CHANCE = 1 / 45;

// Boss helpers from the wiki: Nex's mages hold her phases, Olm's claws, Verzik's Nylocas Matomenos heal her,
// Vet'ion's hellhounds make him immune, Scorpia's guardians heal her, Corp's dark energy core heals him.
mon('umbra', 'Umbra', 'Umbra.png', 285, 1100, 70, 38, 80, 0, 'magic', { elite: true, caster: MAGIC_BOLT('#3a3a3a') });
mon('cruor', 'Cruor', 'Cruor.png', 285, 1100, 70, 38, 80, 0, 'magic', { elite: true, caster: MAGIC_BOLT('#c01a1a') });
mon('olm_left_claw', 'Left claw', 'Great_Olm.png', 750, 2600, 0, 0, 120, 0, 'melee', { elite: true });
mon('olm_right_claw', 'Right claw', 'Great_Olm.png', 750, 2600, 0, 0, 120, 0, 'magic', { elite: true });
mon('nylocas_matomenos', 'Nylocas Matomenos', 'Nylocas_Matomenos.png', 115, 500, 70, 0, 54, 0, 'melee', { harmless: true });
mon('vetion_hound', 'Skeleton Hellhound', "Skeleton_Hellhound_(Vet'ion).png", 194, 0, 125, 0, 70, 0, 'melee', { elite: true });
mon('scorpia_guardian', "Scorpia's guardian", "Scorpia's_guardian.png", 47, 0, 100, 0, 40, 0, 'magic', { harmless: true });
mon('dark_core', 'Dark energy core', 'Dark_energy_core.png', 75, 0, 0, 0, 44, 0, 'magic', { harmless: true });

// Enchanted bolt effects (OSRS names and odds from the wiki).
const BOLT_PROCS = {
  dragonstone: { name: "Dragon's breath", chance: 0.06, info: "6%: dragonfire for extra damage based on your Ranged level" },
  ruby: { name: 'Blood Forfeit', chance: 0.06, info: '6%: takes 20% of the target\'s hitpoints, costs you 10% of yours' },
  diamond: { name: 'Armour Piercing', chance: 0.1, info: '10%: a guaranteed hit with 15% more damage' },
  onyx: { name: 'Life Leech', chance: 0.11, info: '11%: 20% extra damage and heals you for a quarter of it' },
};
// Minion attacks: on top of walking into you, these enemies have a telegraphed move.
// lunge: dashes along a line. smash: ground-pound square around itself. spit: lobbed splash where you stand.
// breath: a cone. volley: three projectiles. nova: a ring around itself (stand close to dodge). cross: a plus-shaped blast on you.
const MINION_ATK = {
  giant_rat: 'lunge', skeleton: 'lunge', ghost: 'nova', giant_bat: 'lunge', dark_wizard: 'cross', guard: 'lunge', barbarian: 'smash',
  black_knight: 'lunge', moss_giant: 'smash', dwarf: 'smash', white_knight: 'lunge', hill_giant: 'smash', lesser_demon: 'spit',
  kalphite_worker: 'lunge', kalphite_soldier: 'smash', kalphite_guardian: 'smash', green_dragon: 'breath', ankou: 'nova',
  greater_demon: 'spit', black_demon: 'smash', ork: 'lunge', ogre: 'smash', hobgoblin: 'lunge', snakeling: 'spit', lizardman: 'spit',
  lizardman_brute: 'smash', tz_kih: 'lunge', tz_kek: 'smash', tok_xil: 'volley', yt_mejkot: 'nova', ket_zek: 'cross',
  brutal_black_dragon: 'breath', scarab_swarm: 'lunge', baboon_brawler: 'lunge', baboon_thrower: 'volley', baboon_mage: 'cross',
  deathly_ranger: 'volley', deathly_mage: 'cross', lizardman_shaman: 'spit', skeletal_mystic: 'nova', nylocas_ischyros: 'smash',
  nylocas_toxobolos: 'volley', nylocas_hagios: 'cross', spiritual_warrior: 'lunge', spiritual_ranger: 'volley', spiritual_mage: 'cross',
  fumus: 'spit', glacies: 'nova', jal_mejrah: 'lunge', jal_ak: 'spit', jal_imkot: 'smash', jal_xil: 'volley', jal_zek: 'cross',
  sergeant_strongstack: 'smash', sergeant_steelwill: 'cross', sergeant_grimspike: 'volley', cow: 'lunge', chicken: 'lunge',
};
const POTION_CHANCE = { normal: 0.012, elite: 0.06 };
// Redberry pie: a separate ground drop that heals. Likelier when you're hurt.
const PIE = { name: 'Redberry pie', file: 'Redberry_pie.png', heal: 0.25 };
const PIE_CHANCE = { normal: 0.015, elite: 0.07 };

// Boons: run-only bonuses. After every boss you pick 1 of 3. max = how many times it can stack.
const BOONS = [
  { id: 'multi', name: 'Multishot', file: 'Eagle_Eye.png', max: 3, info: '+1 arrow or spell per attack, or +1 hit per melee swing' },
  { id: 'pierce', name: 'Piercing', file: 'Hawk_Eye.png', max: 3, info: 'Arrows pierce 1 more enemy and spells splash 20% wider' },
  { id: 'chain', name: 'Ricochet', file: 'Sharp_Eye.png', max: 3, info: 'Arrows and spells jump to 1 more nearby enemy' },
  { id: 'vamp', name: 'Soul leech', file: 'Smite.png', max: 3, info: 'Heal 3% of the damage you deal' },
  { id: 'thorns', name: 'Retribution', file: 'Retribution.png', max: 3, info: 'Enemies that hit you take 50% of the damage back' },
  { id: 'crit', name: 'Deadeye', file: 'Deadeye.png', max: 3, info: '+8% critical chance and crits hit 50% harder' },
  { id: 'haste', name: 'Incredible Reflexes', file: 'Incredible_Reflexes.png', max: 4, info: '15% faster attacks' },
  { id: 'might', name: 'Piety', file: 'Piety.png', max: 4, info: '+20% melee damage and take 5% less damage' },
  { id: 'rigour', name: 'Rigour', file: 'Rigour.png', max: 4, info: '+20% ranged damage and take 5% less damage' },
  { id: 'augury', name: 'Augury', file: 'Augury.png', max: 4, info: '+20% magic damage and take 5% less damage' },
  { id: 'chivalry', name: 'Chivalry', file: 'Chivalry.png', max: 3, info: '+10% damage with every style' },
  { id: 'protitem', name: 'Protect Item', file: 'Protect_Item.png', max: 1, info: 'Keep your best item when you cheat death while skulled' },
  { id: 'restore', name: 'Rapid Restore', file: 'Rapid_Restore.png', max: 3, info: 'Regain 0.4 prayer points a second' },
  { id: 'thickskin', name: 'Rock Skin', file: 'Rock_Skin.png', max: 2, info: '+6 defence' },
  { id: 'skin', name: 'Steel Skin', file: 'Steel_Skin.png', max: 4, info: 'Take 10% less damage' },
  { id: 'heal', name: 'Rapid Heal', file: 'Rapid_Heal.png', max: 3, info: 'Regenerate 1.5 hitpoints a second' },
  { id: 'greed', name: 'Greed', file: 'Coins_10000.png', max: 3, info: '25% more gold and coins fly to you from further away' },
  { id: 'life', name: 'Redemption', file: 'Redemption.png', max: 1, info: 'Survive one killing blow with half your hitpoints' },
  { id: 'giant', name: 'Giant slayer', file: 'Slayer_icon.png', max: 3, info: '25% more damage to bosses' },
  { id: 'reach', name: 'Mystic Might', file: 'Mystic_Might.png', max: 3, info: '15% more range and melee reach' },
  { id: 'execute', name: 'Ultimate Strength', file: 'Ultimate_Strength.png', max: 1, info: 'Normal enemies below 12% hitpoints die instantly' },
  { id: 'fleet', name: 'Fleet foot', file: 'Agility_icon.png', max: 3, info: '12% faster running' },
  { id: 'light', name: 'Lightbearer', file: 'Lightbearer.png', max: 2, info: 'Special attack energy refills ×2 as fast' },
  { id: 'preserve', name: 'Preserve', file: 'Preserve.png', max: 2, info: 'Prayer drains 25% slower' },
  { id: 'bones', name: 'Bonecrusher', file: 'Bonecrusher.png', max: 3, info: 'Every kill restores +1 prayer point' },
  { id: 'barrage', name: 'Ice Barrage', file: 'Ice_Barrage.png', max: 3, info: '10% of hits freeze normal enemies for 1.5 sec' },
  { id: 'venom', name: 'Venom', file: 'Serpentine_helm.png', max: 2, info: 'Hits envenom enemies: 10% of their max HP over 5 sec (2% on bosses)' },
  { id: 'veng', name: 'Vengeance', file: 'Vengeance.png', max: 2, info: 'Every 20 sec, the next hit you take is thrown back at 75%' },
  { id: 'phoenix', name: 'Phoenix necklace', file: 'Phoenix_necklace.png', max: 1, info: 'Once per area, heal 30% HP when you fall below 20%' },
  { id: 'wealth', name: 'Ring of wealth', file: 'Ring_of_wealth.png', max: 2, info: '+25% luck: clues, potions and pies drop more' },
  { id: 'slayer', name: 'Slayer helmet', file: 'Slayer_helmet.png', max: 3, info: '+20% damage to elite enemies' },
  { id: 'thrall', name: 'Greater ghost thrall', file: 'Resurrect_Greater_Ghost.png', max: 3, info: 'A ghost follows you and hits the nearest enemy every second' },
];
const THRALL_FILE = 'Greater_ghostly_thrall.png';

// ---------------------------------------------------------------------------
// Creature mechanics from each monster's OSRS Wiki page (used by the creature mechanics in game.js).
// onHit: effects of its hits (poison, freeze, slow = Jal-MejRah draining run energy, weaken = the Weaken spell,
// dragonfire = an anti-dragon or dragonfire shield blocks most of it, prayOff = switches your protection prayer off).
// split: dies into smaller monsters. heals: heals monsters below half hp beside it. revive: brings slain monsters back.
// dig: burrows to you if it can't reach you. lock: Nylocas only take full damage from their own style.
// ---------------------------------------------------------------------------
item('anti_dragon_shield', 'Anti-dragon shield', 'any', 'shield', 1, 'common', { def: 3, info: 'Blocks most dragonfire' });
mon('tz_kek_s', 'Tz-Kek', 'Tz-Kek_(level_22).png', 22, 90, 110, 8, 46, 4, 'melee');
mon('jal_akrek_ket', 'Jal-AkRek-Ket', 'Jal-AkRek-Ket.png', 70, 120, 110, 16, 40, 6, 'melee');
mon('jal_akrek_xil', 'Jal-AkRek-Xil', 'Jal-AkRek-Xil.png', 70, 120, 100, 16, 40, 6, 'ranged', { caster: ARROW('#ffb040') });
mon('jal_akrek_mej', 'Jal-AkRek-Mej', 'Jal-AkRek-Mej.png', 70, 120, 100, 16, 40, 6, 'magic', { caster: MAGIC_BOLT('#ff5a1a') });
mon('shaman_spawn', 'Spawn', 'Spawn_(lizardman_shaman).png', 1, 30, 0, 0, 30, 0, 'melee', { fuse: 2.6 });
mon('blood_reaver', 'Blood reaver', 'Blood_Reaver.png', 60, 125, 95, 14, 60, 0, 'melee');
// I DSCIM YOU, a Deadman breach monster and player spoof: his special switches off your protection prayer, and he runs at you.
mon('spoof_dscim', 'I DSCIM YOU', 'I_DSCIM_YOU.png', 495, 700, 190, 16, 66, 80, 'melee', { elite: true, spoof: 'Lives off of surge potions.', onHit: { prayOff: true } });

const TRAITS = {
  tz_kek: { split: ['tz_kek_s', 2], recoil: true },
  yt_mejkot: { heals: true },
  ket_zek: { closeMult: 2 },
  tok_xil: { closeMult: 1.5 },
  jal_mejrah: { onHit: { slow: 3 } },
  jal_ak: { split: [['jal_akrek_ket', 'jal_akrek_xil', 'jal_akrek_mej'], 1], scan: true },
  jal_imkot: { dig: true },
  jal_zek: { revive: true, closeMult: 1.5 },
  jal_xil: { closeMult: 1.5 },
  dark_wizard: { onHit: { weaken: 5 } },
  kalphite_guardian: { onHit: { poison: 6 } },
  lizardman: { onHit: { poison: 5 } },
  lizardman_brute: { onHit: { poison: 3 } },
  lizardman_shaman: { onHit: { poison: 8 }, shaman: true },
  snakeling: { onHit: { poison: 5 } },
  green_dragon: { onHit: { dragonfire: true } },
  brutal_black_dragon: { onHit: { dragonfire: true } },
  fumus: { onHit: { poison: 5 } },
  glacies: { onHit: { freeze: 0.8 } },
  nylocas_ischyros: { lock: 'melee' },
  nylocas_toxobolos: { lock: 'ranged' },
  nylocas_hagios: { lock: 'magic' },
};
for (const id in TRAITS) Object.assign(MONSTERS[id], TRAITS[id]);

// Spoofs that turn up in the second wave of an area.
const SPOOF_AREAS = { 'God Wars Dungeon': 'spoof_dscim' };
// Friendly spoofs. Lines are their in-game examine texts.
const CAMEOS = {
  cow31337: { name: 'Cow31337Killer', file: 'Cow31337Killer.png', size: 66, line: 'He hates cows so much.' },
  hopleez: { name: 'Hopleez', file: 'Hopleez.png', size: 62, line: 'He was here first.' },
  woox: { name: 'Mysterious Adventurer', file: 'Mysterious_Adventurer.png', size: 64, line: 'He stares off stoically into the distance. In search of a new challenge, perhaps?' },
};
// Lines bosses say with their attacks (Nex's are her real shouts; Brutus "*growls*" before a charge and "*snort*" before a stomp).
Object.assign(QUOTES, {
  nex_choke: ['Let the virus flow through you!'], nex_dash: ['There is... NO ESCAPE!'], nex_dark: ['Embrace darkness!'],
  nex_smash: ['Fear the shadow!'], nex_sac: ['I demand a blood sacrifice!'], nex_siphon: ['A siphon will solve this!'],
  nex_contain: ['Contain this!'], nex_prison: ['Die now, in a prison of ice!'], nex_wrath: ['Taste my wrath!'],
});
const INCANTATION = 'Carlem... Aber... Camerinthum... Purchai... Gabindo!';

// ---------- Pets (cosmetic). Each one only drops from its own boss or monsters. ----------
const PET_MSG_NEW = "You have a funny feeling like you're being followed.";
const PET_MSG_DUPE = 'You have a funny feeling like you would have been followed...';
const PETS = [
  // route bosses (about 1 in 40 per kill)
  { id: 'beef', name: 'Beef', file: 'Beef.png', from: ['cow_boss'], src: 'The cow boss (Lumbridge)' },
  { id: 'scurry', name: 'Scurry', file: 'Scurry.png', from: ['scurrius'], src: 'Scurrius (Varrock Sewers)' },
  { id: 'baby_mole', name: 'Baby mole', file: 'Baby_Mole.png', from: ['giant_mole'], src: 'Giant Mole' },
  { id: 'kalphite_princess', name: 'Kalphite princess', file: 'Kalphite_Princess.png', from: ['kalphite_queen'], src: 'Kalphite Queen' },
  { id: 'prince_black_dragon', name: 'Prince black dragon', file: 'Prince_Black_Dragon.png', from: ['kbd'], src: 'King Black Dragon' },
  { id: 'pet_graardor', name: 'Pet general graardor', file: 'Pet_General_Graardor.png', from: ['graardor'], src: 'General Graardor (God Wars)' },
  { id: 'snakeling', name: 'Pet snakeling', file: 'Pet_Snakeling.png', from: ['zulrah'], src: 'Zulrah' },
  { id: 'tzrek_jad', name: 'TzRek-Jad', file: 'TzRek-Jad.png', from: ['jad'], src: 'TzTok-Jad (Fight Caves)' },
  { id: 'vorki', name: 'Vorki', file: 'Vorki.png', from: ['vorkath'], src: 'Vorkath' },
  { id: 'tumekens_guardian', name: "Tumeken's guardian", file: "Tumeken's_guardian.png", from: ['wardens'], src: 'The Wardens (Tombs of Amascut)' },
  { id: 'olmlet', name: 'Olmlet', file: 'Olmlet.png', from: ['olm'], src: 'Great Olm (Chambers of Xeric)' },
  { id: 'lil_zik', name: "Lil' Zik", file: "Lil'_Zik.png", from: ['verzik'], src: 'Verzik Vitur (Theatre of Blood)' },
  { id: 'nexling', name: 'Nexling', file: 'Nexling.png', from: ['nex'], src: 'Nex (Ancient Prison)' },
  { id: 'jal_nib_rek', name: 'Jal-nib-rek', file: 'Jal-Nib-Rek.png', from: ['zuk'], src: 'TzKal-Zuk (Inferno)' },
  // clue bosses (about 1 in 25 per kill)
  { id: 'pet_chaos_elemental', name: 'Pet chaos elemental', file: 'Pet_chaos_elemental.png', from: ['clue_chaos_elemental', 'clue_chaos_fanatic'], src: 'Chaos Elemental or Chaos Fanatic (clue)' },
  { id: 'callisto_cub', name: 'Callisto cub', file: 'Callisto_cub.png', from: ['clue_callisto'], src: 'Callisto (clue)' },
  { id: 'venenatis_spiderling', name: 'Venenatis spiderling', file: 'Venenatis_spiderling.png', from: ['clue_venenatis'], src: 'Venenatis (clue)' },
  { id: 'vetion_jr', name: "Vet'ion jr.", file: "Vet'ion_Jr..png", from: ['clue_vetion'], src: "Vet'ion (clue)" },
  { id: 'scorpias_offspring', name: "Scorpia's offspring", file: "Scorpia's_offspring.png", from: ['clue_scorpia'], src: 'Scorpia (clue)' },
  { id: 'pet_kraken', name: 'Pet kraken', file: 'Pet_Kraken.png', from: ['clue_kraken'], src: 'Kraken (clue)' },
  { id: 'pet_supreme', name: 'Pet dagannoth supreme', file: 'Pet_Dagannoth_Supreme.png', from: ['clue_dagannoth_supreme'], src: 'Dagannoth Supreme (clue)' },
  { id: 'pet_rex', name: 'Pet dagannoth rex', file: 'Pet_Dagannoth_Rex.png', from: ['clue_rex'], src: 'Dagannoth Rex (clue)' },
  { id: 'pet_prime', name: 'Pet dagannoth prime', file: 'Pet_Dagannoth_Prime.png', from: ['clue_prime'], src: 'Dagannoth Prime (clue)' },
  { id: 'sraracha', name: 'Sraracha', file: 'Sraracha.png', from: ['clue_sarachnis'], src: 'Sarachnis (clue)' },
  { id: 'pet_zilyana', name: 'Pet zilyana', file: 'Pet_Zilyana.png', from: ['clue_zilyana'], src: 'Commander Zilyana (clue)' },
  { id: 'pet_kril', name: "Pet k'ril tsutsaroth", file: "Pet_K'ril_Tsutsaroth.png", from: ['clue_kril'], src: "K'ril Tsutsaroth (clue)" },
  { id: 'pet_kreearra', name: "Pet kree'arra", file: "Pet_Kree'arra.png", from: ['clue_kreearra'], src: "Kree'arra (clue)" },
  { id: 'pet_dark_core', name: 'Pet dark core', file: 'Pet_dark_core.png', from: ['clue_corp'], src: 'Corporeal Beast (clue)' },
  { id: 'hellpuppy', name: 'Hellpuppy', file: 'Hellpuppy.png', from: ['clue_cerberus'], src: 'Cerberus (clue)' },
  { id: 'abyssal_orphan', name: 'Abyssal orphan', file: 'Abyssal_orphan.png', from: ['clue_sire'], src: 'Abyssal Sire (clue)' },
  { id: 'ikkle_hydra', name: 'Ikkle hydra', file: 'Ikkle_Hydra_(serpentine).png', from: ['clue_hydra'], src: 'Alchemical Hydra (clue)' },
  { id: 'pet_smoke_devil', name: 'Pet smoke devil', file: 'Pet_Smoke_Devil.png', from: ['clue_smoke_devil'], src: 'Thermonuclear smoke devil (clue)' },
  { id: 'skotos', name: 'Skotos', file: 'Skotos.png', from: ['clue_skotizo'], src: 'Skotizo (clue)' },
  { id: 'muphin', name: 'Muphin', file: 'Muphin_(ranged).png', from: ['clue_muspah'], src: 'Phantom Muspah (clue)' },
  { id: 'little_nightmare', name: 'Little nightmare', file: 'Little_Nightmare.png', from: ['clue_nightmare'], src: 'The Nightmare (clue)' },
  { id: 'baron', name: 'Baron', file: 'Baron.png', from: ['clue_sucellus'], src: 'Duke Sucellus (clue)' },
  { id: 'lilviathan', name: "Lil'viathan", file: "Lil'viathan.png", from: ['clue_leviathan'], src: 'The Leviathan (clue)' },
  { id: 'wisp', name: 'Wisp', file: 'Wisp.png', from: ['clue_whisperer'], src: 'The Whisperer (clue)' },
  { id: 'butch', name: 'Butch', file: 'Butch.png', from: ['clue_vardorvis'], src: 'Vardorvis (clue)' },
  { id: 'nid', name: 'Nid', file: 'Nid.png', from: ['clue_araxxor'], src: 'Araxxor (clue)' },
  { id: 'moxi', name: 'Moxi', file: 'Moxi.png', from: ['clue_amoxliatl'], src: 'Amoxliatl (clue)' },
  { id: 'huberte', name: 'Huberte', file: 'Huberte.png', from: ['clue_hueycoatl'], src: 'The Hueycoatl (clue)' },
  { id: 'smol_heredit', name: 'Smol heredit', file: 'Smol_Heredit.png', from: ['clue_sol'], src: 'Sol Heredit (clue)' },
  { id: 'noon', name: 'Noon', file: 'Noon.png', from: ['clue_dusk'], src: 'Grotesque Guardians (clue)' },
  // thieves: goblins that steal your coins (about 1 in 400)
  { id: 'rocky', name: 'Rocky', file: 'Rocky.png', from: ['goblin', 'hobgoblin', 'rev_goblin'], src: 'Goblins that steal your coins', thief: true },
];
const PET_RATE = { route: 1 / 40, clue: 1 / 25, thief: 1 / 400 };

// ---------- Barrows equipment and set effects (wear all four pieces of one brother) ----------
item('dharoks_platelegs', "Dharok's platelegs", 'melee', 'legs', 7, 'uncommon', { def: 12, hp: 6 });
item('dharoks_greataxe', "Dharok's greataxe", 'melee', 'weapon', 7, 'uncommon', { w: { kind: 'swing', wt: 'battleaxe', dmg: 50, cd: 1.05, reach: 95, arc: 2.4 } });
item('guthans_helm', "Guthan's helm", 'melee', 'head', 7, 'uncommon', { def: 9, hp: 5 });
item('guthans_platebody', "Guthan's platebody", 'melee', 'body', 7, 'uncommon', { def: 15, hp: 10 });
item('guthans_chainskirt', "Guthan's chainskirt", 'melee', 'legs', 7, 'uncommon', { def: 11, hp: 6 });
item('guthans_warspear', "Guthan's warspear", 'melee', 'weapon', 7, 'uncommon', { w: { kind: 'swing', dmg: 27, cd: 0.6, reach: 120, arc: 1.0 } });
item('veracs_helm', "Verac's helm", 'melee', 'head', 7, 'uncommon', { def: 9, hp: 5 });
item('veracs_brassard', "Verac's brassard", 'melee', 'body', 7, 'uncommon', { def: 13, hp: 8 });
item('veracs_plateskirt', "Verac's plateskirt", 'melee', 'legs', 7, 'uncommon', { def: 11, hp: 6 });
item('veracs_flail', "Verac's flail", 'melee', 'weapon', 7, 'uncommon', { w: { kind: 'swing', wt: 'mace', dmg: 29, cd: 0.6, reach: 92, arc: 1.8 } });
item('torags_helm', "Torag's helm", 'melee', 'head', 7, 'uncommon', { def: 10, hp: 5 });
item('torags_platebody', "Torag's platebody", 'melee', 'body', 7, 'uncommon', { def: 16, hp: 10 });
item('torags_platelegs', "Torag's platelegs", 'melee', 'legs', 7, 'uncommon', { def: 13, hp: 6 });
item('torags_hammers', "Torag's hammers", 'melee', 'weapon', 7, 'uncommon', { w: { kind: 'swing', wt: 'mace', dmg: 17, cd: 0.7, reach: 88, arc: 1.8, hits: 2 } });
item('karils_crossbow', "Karil's crossbow", 'ranged', 'weapon', 6, 'uncommon', { w: { kind: 'shot', dmg: 30, cd: 0.55, range: 450, speed: 1080, pierce: 2, count: 1, bolt: true } });
item('ahrims_staff', "Ahrim's staff", 'magic', 'weapon', 6, 'uncommon', { w: { kind: 'spell', spell: 'Fire Wave', icon: 'Fire_Wave.png', dmg: 30, cd: 0.78, range: 420, speed: 640, splash: 66, color: '#ff7a1a' } });
// Set effects from the wiki, turned into this game's terms. 25% of hits trigger them (Dharok's always works).
const BARROWS_SETS = {
  dharok: { name: "Dharok's", effect: 'Wretched Strength', pieces: ['dharoks_helm', 'dharoks_platebody', 'dharoks_platelegs', 'dharoks_greataxe'], info: 'Up to +60% damage the lower your hitpoints are' },
  guthan: { name: "Guthan's", effect: 'Infestation', pieces: ['guthans_helm', 'guthans_platebody', 'guthans_chainskirt', 'guthans_warspear'], info: '25% of hits heal you for half the damage dealt (up to 8% of your max HP per heal)' },
  verac: { name: "Verac's", effect: 'Defiler', pieces: ['veracs_helm', 'veracs_brassard', 'veracs_plateskirt', 'veracs_flail'], info: '25% of hits ignore the enemy\'s resistance to your style and deal +25% damage' },
  torag: { name: "Torag's", effect: 'Corruption', pieces: ['torags_helm', 'torags_platebody', 'torags_platelegs', 'torags_hammers'], info: '25% of hits drain the enemy\'s run energy: 40% slower for 3 sec' },
  karil: { name: "Karil's", effect: 'Tainted Shot', pieces: ['karils_coif', 'karils_leathertop', 'karils_leatherskirt', 'karils_crossbow'], info: '25% of hits lower the enemy\'s Agility: 25% slower for 5 sec' },
  ahrim: { name: "Ahrim's", effect: 'Blighted Aura', pieces: ['ahrims_hood', 'ahrims_robetop', 'ahrims_robeskirt', 'ahrims_staff'], info: '25% of hits lower the enemy\'s Strength: it hits you 20% softer for 5 sec' },
};
for (const k in BARROWS_SETS) for (const id of BARROWS_SETS[k].pieces) ITEMS[id].barrows = k;

// ---------- Spellbooks: your staff keeps autocasting; you also carry one special spell on a cooldown (R) ----------
// area: the area whose boss you must beat once to unlock the book (-1 = from the start).
const SPELLBOOKS = {
  standard: { name: 'Standard spellbook', area: -1 },
  arceuus: { name: 'Arceuus spellbook', area: 1 },
  lunar: { name: 'Lunar spellbook', area: 11 },
  ancient: { name: 'Ancient Magicks', area: 12 },
};
const SPELLS = [
  { id: 'charge', book: 'standard', name: 'Charge', file: 'Charge.png', cd: 30, info: '+40% damage for 10 sec, and god spells hit 50% harder on top' },
  { id: 'entangle', book: 'standard', name: 'Entangle', file: 'Entangle.png', cd: 22, info: 'Holds every normal enemy near you in place for 3 sec' },
  { id: 'thrall', book: 'arceuus', name: 'Resurrect Greater Ghost', file: 'Resurrect_Greater_Ghost.png', cd: 40, info: 'A ghostly thrall fights beside you for 20 sec' },
  { id: 'mark', book: 'arceuus', name: 'Mark of Darkness', file: 'Mark_of_Darkness.png', cd: 35, info: 'Enemies take +25% damage from you for 15 sec' },
  { id: 'ward', book: 'arceuus', name: 'Ward of Arceuus', file: 'Ward_of_Arceuus.png', cd: 35, info: 'Take 25% less damage for 12 sec' },
  { id: 'dcharge', book: 'arceuus', name: 'Death Charge', file: 'Death_Charge.png', cd: 40, info: 'For 20 sec, every kill restores 15% special attack energy' },
  { id: 'veng', book: 'lunar', name: 'Vengeance', file: 'Vengeance.png', cd: 30, info: 'The next hit you take is thrown back at 75% of its damage' },
  { id: 'heal_group', book: 'lunar', name: 'Heal Group', file: 'Heal_Group.png', cd: 45, info: 'Heals 30% of your max hitpoints' },
  { id: 'ice_barrage', book: 'ancient', name: 'Ice Barrage', file: 'Ice_Barrage.png', cd: 16, info: 'Big hit on a group that freezes normal enemies for 4 sec', color: '#9fe8ff' },
  { id: 'blood_barrage', book: 'ancient', name: 'Blood Barrage', file: 'Blood_Barrage.png', cd: 16, info: 'Big hit on a group that heals you for part of the damage', color: '#c0203a' },
  { id: 'smoke_barrage', book: 'ancient', name: 'Smoke Barrage', file: 'Smoke_Barrage.png', cd: 16, info: 'Big hit on a group that poisons them', color: '#9a9a8a' },
  { id: 'shadow_barrage', book: 'ancient', name: 'Shadow Barrage', file: 'Shadow_Barrage.png', cd: 16, info: 'Big hit on a group that makes them hit you 20% softer for 6 sec', color: '#5a4a7a' },
];

// ---------- Slayer ----------
// Real slayer drops need their real Slayer level before the shop or a casket will hand them over.
item('leaf_bladed_sword', 'Leaf-bladed sword', 'melee', 'weapon', 3, 'uncommon', { w: { kind: 'swing', wt: 'sword', dmg: 17, cd: 0.55, reach: 86, arc: 1.7 } });
item('leaf_bladed_battleaxe', 'Leaf-bladed battleaxe', 'melee', 'weapon', 4, 'uncommon', { w: { kind: 'swing', wt: 'battleaxe', dmg: 30, cd: 0.8, reach: 90, arc: 2.2 } });
item('slayer_helmet', 'Slayer helmet', 'any', 'head', 4, 'uncommon', { def: 7, task: 0.16, info: '+16% damage to your Slayer task' });
const SLAYER_REQ = {
  leaf_bladed_sword: [55, 'kurask'], leaf_bladed_battleaxe: [55, 'kurask'], neitiznot_faceguard: [60, 'basilisk knights'],
  granite_maul: [75, 'gargoyles'], granite_ring: [75, 'the Grotesque Guardians'], dragon_boots: [83, 'spiritual mages'],
  abyssal_whip: [85, 'abyssal demons'], abyssal_bludgeon: [85, 'the Abyssal Sire'], abyssal_tentacle: [87, 'the Kraken'],
  trident_of_the_seas: [87, 'cave krakens'], dark_bow: [90, 'dark beasts'], occult_necklace: [93, 'smoke devils'],
  ferocious_gloves: [95, 'Alchemical Hydra leather'],
};
for (const id in SLAYER_REQ) if (ITEMS[id]) { ITEMS[id].slayer = SLAYER_REQ[id][0]; ITEMS[id].slayerSrc = SLAYER_REQ[id][1]; }
// Slayer reward shop unlocks, bought with slayer points from finished tasks. Names are the real Slayer rewards.
const SLAYER_UNLOCKS = [
  { id: 'masq', name: 'Malevolent masquerade', file: 'Slayer_helmet.png', cost: 80, info: 'Slayer helmets turn up in shops: +16% damage to your task' },
  { id: 'bigger', name: 'Bigger and Badder', file: 'Slayer_icon.png', cost: 30, info: 'Task monsters are 5× as likely to become superiors' },
  { id: 'boss', name: 'Like a boss', file: 'Slayer_icon.png', cost: 40, info: 'Each area boss you beat also counts as a task: +10 points, plus 2 per area' },
];

// ---------- Area modifiers: each one has a 50% chance to be on for its area in a run ----------
const AREA_MOD_CHANCE = 0.5;
const AREA_MODS = [
  { id: 'gobwar', area: 0, name: 'Goblin war', info: 'Red and green goblins fight each other, and you.' },
  { id: 'fog', area: 1, name: 'Fog', info: 'A thick fog: enemies stay hidden until they are close.' },
  { id: 'flood', area: 3, name: 'Sewer flood', info: 'Flood water slows you down while you wade through it.' },
  { id: 'riot', area: 4, name: 'Knight riots', info: 'White Knights and Black Knights fight each other, and you.' },
  { id: 'lava', area: 5, name: 'Lava', info: 'Pools of lava burn you. More bubble up as the fight goes on.' },
  { id: 'swarm', area: 6, name: 'Kalphite swarm', info: 'A Kalphite Guardian keeps calling workers until you kill it.' },
  { id: 'faction', area: 8, name: 'Bandos army', info: 'Wear a Bandos item and his army leaves you alone until you hit it. Without one, they hit 25% harder.' },
  { id: 'frost', area: 12, name: 'Frost', info: 'Stand still too long and the cold freezes you solid.' },
];

// ---------- Elemental weaknesses (OSRS Wiki monster infoboxes, via the wiki team's DPS calculator data) ----------
// Standard elemental spells of that element deal +0.5% damage per point (halved from the game).
const EL_WEAKNESS = {
  zombie: ['fire', 50],
  skeleton: ['earth', 35],
  ghost: ['air', 50],
  giant_bat: ['air', 10],
  moss_giant: ['fire', 50],
  hill_giant: ['earth', 25],
  lesser_demon: ['water', 40],
  kalphite_worker: ['fire', 40],
  kalphite_soldier: ['fire', 40],
  kalphite_guardian: ['fire', 40],
  green_dragon: ['water', 50],
  ankou: ['air', 40],
  greater_demon: ['water', 40],
  black_demon: ['water', 40],
  ork: ['earth', 15],
  ogre: ['earth', 20],
  tz_kih: ['water', 40],
  tz_kek: ['water', 40],
  tok_xil: ['water', 40],
  yt_mejkot: ['water', 40],
  ket_zek: ['water', 40],
  yt_hurkot: ['water', 40],
  brutal_black_dragon: ['water', 50],
  zombified_spawn: ['fire', 50],
  scarab_swarm: ['fire', 50],
  nylocas_ischyros: ['fire', 15],
  nylocas_toxobolos: ['fire', 15],
  nylocas_hagios: ['fire', 15],
  spiritual_warrior: ['air', 30],
  spiritual_ranger: ['air', 30],
  spiritual_mage: ['air', 30],
  jal_nib: ['water', 40],
  jal_mejrah: ['water', 40],
  jal_ak: ['water', 40],
  jal_imkot: ['water', 40],
  jal_xil: ['water', 40],
  jal_zek: ['water', 40],
  cow_boss: ['earth', 25],
  giant_mole: ['earth', 50],
  elvarg: ['water', 30],
  kalphite_queen: ['fire', 40],
  kbd: ['water', 50],
  graardor: ['earth', 40],
  zulrah: ['fire', 50],
  jad: ['water', 40],
  vorkath: ['fire', 40],
  wardens: ['earth', 50],
  olm: ['earth', 50],
  zuk: ['water', 40],
  kephri: ['fire', 40],
  tekton: ['water', 20],
  vespula: ['fire', 50],
  muttadile_small: ['earth', 40],
  muttadile_large: ['earth', 40],
  vasilias: ['fire', 15],
  xarpus: ['air', 50],
  jaltok_jad: ['water', 40],
  soldier_scarab: ['fire', 50],
  spitting_scarab: ['fire', 50],
  arcane_scarab: ['fire', 50],
  akkha_shadow: ['air', 60],
  blood_spawn: ['earth', 50],
  clue_obor: ['earth', 20],
  clue_bryophyta: ['fire', 50],
  clue_chaos_elemental: ['air', 50],
  clue_callisto: ['fire', 30],
  clue_kraken: ['earth', 50],
  clue_dagannoth_supreme: ['earth', 35],
  clue_dharok: ['air', 50],
  clue_ahrim: ['air', 50],
  clue_karil: ['air', 50],
  clue_verac: ['air', 50],
  clue_guthan: ['air', 50],
  clue_torag: ['air', 50],
  clue_sarachnis: ['fire', 40],
  clue_venenatis: ['fire', 40],
  clue_scorpia: ['fire', 35],
  clue_kril: ['water', 30],
  clue_kreearra: ['air', 30],
  clue_corp: ['earth', 10],
  clue_cerberus: ['water', 40],
  clue_hydra: ['earth', 50],
  clue_smoke_devil: ['air', 20],
  clue_rex: ['earth', 35],
  clue_prime: ['earth', 35],
  clue_skotizo: ['water', 40],
  clue_muspah: ['air', 65],
  clue_whisperer: ['earth', 60],
  clue_vardorvis: ['fire', 35],
  clue_hespori: ['fire', 100],
  clue_tormented: ['water', 30],
  clue_araxxor: ['fire', 50],
  clue_amoxliatl: ['fire', 30],
  clue_hueycoatl: ['earth', 60],
  clue_dusk: ['earth', 40],
  pk_revenant: ['air', 30],
  rev_imp: ['air', 30],
  rev_goblin: ['air', 30],
  rev_pyrefiend: ['air', 30],
  rev_hobgoblin: ['air', 30],
  rev_cyclops: ['air', 30],
  rev_hellhound: ['air', 30],
  rev_ork: ['air', 30],
  rev_demon: ['air', 30],
  rev_dark_beast: ['air', 30],
  rev_dragon: ['air', 30],
  olm_left_claw: ['earth', 50],
  olm_right_claw: ['earth', 50],
  nylocas_matomenos: ['fire', 15],
  vetion_hound: ['earth', 35],
  scorpia_guardian: ['fire', 35],
  tz_kek_s: ['water', 40],
  jal_akrek_ket: ['water', 40],
  jal_akrek_xil: ['water', 40],
  jal_akrek_mej: ['water', 40],
  spoof_dscim: ['fire', 50],
};
for (const id in EL_WEAKNESS) if (MONSTERS[id]) MONSTERS[id].elWeak = { el: EL_WEAKNESS[id][0], pct: EL_WEAKNESS[id][1] };
