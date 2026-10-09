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
  { id: 'durial', name: 'Durial321', file: 'Durial321.png', lane: 'melee', weapon: 'rune_scimitar',
    perk: 'Star of the Falador Massacre. Deals 30% more damage but takes 15% more.', mods: { dmg: 1.3, taken: 1.15 },
    skills: { attack: 8, strength: 10 }, quotes: [] },
  { id: 'wom', name: 'Wise Old Man', file: 'Wise_Old_Man.png', lane: 'magic', weapon: 'staff_of_air',
    perk: 'Once robbed Draynor bank. Earns 40% more gold.', mods: { gold: 1.4 },
    skills: { magic: 10 }, quotes: ["Less of the 'old' man, if you please!", 'Deary deary me...', "I'm an old man! I walk with a stick!"] },
  { id: 'sedridor', name: 'Archmage Sedridor', file: 'Archmage_Sedridor.png', lane: 'magic', weapon: 'staff_of_air',
    perk: 'Head of the Wizards\' Tower from Rune Mysteries. Spells splash 40% wider.', mods: { splash: 1.4 },
    skills: { magic: 12 }, quotes: ['Senventior disthine molenko!', 'Strange and powerful magicks lurk here.', 'Nothing more than Zamorakian hearsay!'] },
  { id: 'arianwyn', name: 'Arianwyn', file: 'Arianwyn.png', lane: 'ranged', weapon: 'shortbow',
    perk: 'Elf scout from Regicide. Moves 15% faster and shoots 20% further.', mods: { speed: 1.15, range: 1.2 },
    skills: { ranged: 8, agility: 5 }, quotes: ['Not yet, I will try to send word if we find out anything new.'] },
  { id: 'islwyn', name: 'Islwyn', file: 'Islwyn.png', lane: 'ranged', weapon: 'shortbow',
    perk: 'Elven bowyer who sells the crystal bow. 15% extra critical hit chance and arrows fly 15% further.', mods: { crit: 0.15, range: 1.15 },
    skills: { ranged: 10 }, quotes: [] },
  // Unlockable heroes. unlock.area: clear that area's boss once. unlock.sticks: buy with trading sticks.
  { id: 'zanik', name: 'Zanik', file: 'Zanik.png', lane: 'ranged', weapon: 'dorgeshuun_crossbow', unlock: { area: 0 },
    perk: 'Cave goblin heroine of the Dorgeshuun, found under Lumbridge in The Lost Tribe. Moves 10% faster and takes 10% less damage.', mods: { speed: 1.1, taken: 0.9 },
    skills: { ranged: 8, agility: 6 }, quotes: [] },
  { id: 'amik', name: 'Sir Amik Varze', file: 'Sir_Amik_Varze.png', lane: 'melee', weapon: 'rune_scimitar', unlock: { area: 4 },
    perk: 'Leader of the White Knights of Falador. +20 max hitpoints and prayer drains 30% slower.', mods: { hp: 20, ppDrain: 0.7 },
    skills: { attack: 10, strength: 10, defence: 10 }, quotes: [] },
  { id: 'osmumten', name: 'Osmumten', file: 'Osmumten.png', lane: 'melee', weapon: 'abyssal_tentacle', unlock: { area: 12 },
    perk: 'The archaeologist of the Tombs of Amascut. Dragonfire and other magic hit 30% softer, and +30 max hitpoints.', mods: { magicTaken: 0.7, hp: 30 },
    skills: { attack: 30, strength: 30, defence: 20 }, quotes: [] },
  { id: 'merlin', name: 'Merlin', file: 'Merlin.png', lane: 'magic', weapon: 'staff_of_fire', unlock: { sticks: 300 },
    perk: 'The great wizard of Camelot from Merlin\'s Crystal. Spells splash 20% wider and hit bosses 25% harder.', mods: { splash: 1.2, bossDmg: 1.25 },
    skills: { magic: 16 }, quotes: [] },
  { id: 'nieve', name: 'Nieve', file: 'Nieve.png', lane: 'ranged', weapon: 'magic_shortbow', unlock: { sticks: 250 },
    perk: 'Slayer master of the Gnome Stronghold. 10% extra critical hits and Slayer starts at 10.', mods: { crit: 0.1 },
    skills: { ranged: 12, slayer: 10 }, quotes: [] },
  { id: 'bob', name: 'Bob the Jagex cat', file: 'Bob_the_Jagex_cat.png', lane: 'magic', weapon: 'staff_of_air', unlock: { sticks: 400 },
    perk: 'The famous cat of Gielinor. Nine lives: once per run, survive a killing blow with half your hitpoints.', mods: { lives: 1, gold: 1.3 },
    skills: { magic: 6, agility: 15, thieving: 15 }, quotes: [] },
];

// ---------------------------------------------------------------------------
// Items. tier = the area index where it starts appearing in shops.
// rarity: common | uncommon | rare | ultra | mega. Price follows tier and rarity.
// Slots match the OSRS Worn Equipment screen.
// ---------------------------------------------------------------------------
const SLOTS = ['head', 'cape', 'neck', 'ammo', 'weapon', 'body', 'shield', 'legs', 'hands', 'feet', 'ring'];
const SLOT_NAME = { head: 'Head', cape: 'Cape', neck: 'Neck', ammo: 'Ammo', weapon: 'Weapon', body: 'Body', shield: 'Shield', legs: 'Legs', hands: 'Hands', feet: 'Feet', ring: 'Ring' };
const RARITY_MULT = { common: 1, uncommon: 1.4, rare: 2.6, ultra: 4, mega: 6 };
const RARITY_WEIGHT = { common: 1, uncommon: 0.6, rare: 0.2, ultra: 0.012, mega: 0.012 };
// How much each rarity's odds grow from the first wave (x1) to the last (x(1+n)).
const RARITY_GROWTH = { common: 0, uncommon: 1, rare: 3, ultra: 6, mega: 10 };
const RARITY_NAME = { common: 'Common', uncommon: 'Uncommon', rare: 'Rare', ultra: 'Ultra rare', mega: 'Mega rare' };

const ITEMS = {};
function item(id, name, lane, slot, tier, rarity, stats, file) {
  const base = Math.round(28 * Math.pow(1.36, tier));
  // Rarity is at least what the item's tier implies: raid and top boss gear is ultra rare, mid-game boss gear rare.
  const RANK = ['common', 'uncommon', 'rare', 'ultra', 'mega'];
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
item('elysian_spirit_shield', 'Elysian spirit shield', 'any', 'shield', 15, 'rare', { def: 18, hp: 30, taken: 0.85 });
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
item('rune_arrow', 'Rune arrow', 'ranged', 'ammo', 3, 'common', { dmg: 0.1 }, 'Rune_arrow_5.png');
item('amethyst_arrow', 'Amethyst arrow', 'ranged', 'ammo', 6, 'common', { dmg: 0.14, pierce: 1 }, 'Amethyst_arrow_5.png');
item('dragon_arrow', 'Dragon arrow', 'ranged', 'ammo', 10, 'uncommon', { dmg: 0.22, pierce: 1 }, 'Dragon_arrow_5.png');
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
item('arcane_spirit_shield', 'Arcane spirit shield', 'magic', 'shield', 11, 'rare', { def: 10, dmg: 0.12 });
item('saradomin_cape', 'Saradomin cape', 'magic', 'cape', 3, 'common', { dmg: 0.06 });
item('imbued_saradomin_cape', 'Imbued Saradomin cape', 'magic', 'cape', 8, 'uncommon', { dmg: 0.12 });
item('amulet_of_magic', 'Amulet of magic', 'magic', 'neck', 1, 'common', { dmg: 0.08 });
item('occult_necklace', 'Occult necklace', 'magic', 'neck', 6, 'uncommon', { dmg: 0.2 });
item('seers_ring', 'Seers ring', 'magic', 'ring', 5, 'common', { dmg: 0.1 });
item('magus_ring', 'Magus ring', 'magic', 'ring', 13, 'rare', { dmg: 0.2 });
// --- Neutral
item('amulet_of_glory', 'Amulet of glory', 'any', 'neck', 2, 'common', { def: 3, dmg: 0.06 }, 'Amulet_of_glory.png');
item('ring_of_wealth', 'Ring of wealth', 'any', 'ring', 1, 'common', { gold: 0.25 });
item('holy_blessing', 'Holy blessing', 'any', 'ammo', 2, 'common', { pp: 10, def: 1 });
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
item('spectral_spirit_shield', 'Spectral spirit shield', 'any', 'shield', 9, 'uncommon', { def: 12, pp: 3, taken: 0.95 });
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
item('3rd_age_cloak', '3rd Age cloak', 'any', 'cape', 12, 'rare', { def: 7, pp: 5, hp: 15 });
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
  { id: 'attack', name: 'Attack', file: 'Attack_icon.png', lane: 'melee', start: 1, info: '+1% melee attack speed' },
  { id: 'strength', name: 'Strength', file: 'Strength_icon.png', lane: 'melee', start: 1, info: '+3% melee damage' },
  { id: 'ranged', name: 'Ranged', file: 'Ranged_icon.png', lane: 'ranged', start: 1, info: '+3% ranged damage, +1% speed' },
  { id: 'magic', name: 'Magic', file: 'Magic_icon.png', lane: 'magic', start: 1, info: '+3% magic damage, +1% splash' },
  { id: 'defence', name: 'Defence', file: 'Defence_icon.png', lane: 'any', start: 1, info: 'blocks more damage' },
  { id: 'hitpoints', name: 'Hitpoints', file: 'Hitpoints_icon.png', lane: 'any', start: 10, info: '+5 max hitpoints' },
  { id: 'prayer', name: 'Prayer', file: 'Prayer_icon.png', lane: 'any', start: 1, info: '+2 prayer, slower drain' },
  { id: 'agility', name: 'Agility', file: 'Agility_icon.png', lane: 'any', start: 1, info: '+0.6% run speed' },
  { id: 'thieving', name: 'Thieving', file: 'Thieving_icon.png', lane: 'any', start: 1, info: '+2% gold from kills' },
  { id: 'slayer', name: 'Slayer', file: 'Slayer_icon.png', lane: 'any', start: 1, info: '+0.5% critical hits' },
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
mon('kbd', 'King Black Dragon', 'King_Black_Dragon.png', 276, 4400, 85, 26, 220, 260, 'melee', { boss: 'kbd' });
mon('graardor', 'General Graardor', 'General_Graardor.png', 624, 5000, 150, 28, 200, 320, 'melee', { boss: 'graardor' });
mon('zulrah', 'Zulrah', 'Zulrah_(serpentine).png', 725, 5600, 0, 30, 200, 380, 'ranged', { boss: 'zulrah' });
mon('jad', 'TzTok-Jad', 'TzTok-Jad.png', 702, 6400, 55, 32, 230, 420, 'melee', { boss: 'jad' });
mon('vorkath', 'Vorkath', 'Vorkath.png', 732, 7600, 0, 34, 230, 480, 'magic', { boss: 'vorkath' });
mon('wardens', "Tumeken's Warden", "Tumeken's_Warden.png", 544, 8800, 0, 36, 230, 540, 'magic', { boss: 'wardens' });
mon('olm', 'Great Olm', 'Great_Olm.png', 1043, 10000, 0, 38, 240, 600, 'magic', { boss: 'olm' });
mon('verzik', 'Verzik Vitur', 'Verzik_Vitur.png', 1040, 11500, 70, 40, 230, 680, 'magic', { boss: 'verzik' });
mon('nex', 'Nex', 'Nex.png', 1001, 13000, 95, 44, 190, 760, 'magic', { boss: 'nex' });
mon('zuk', 'TzKal-Zuk', 'TzKal-Zuk.png', 1400, 16000, 0, 60, 280, 0, 'magic', { boss: 'zuk' });

// Zulrah's three forms
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
  { name: 'Tombs of Amascut', map: [0, 0, 3262, 2785, 1.3], bg: "Tombs_of_Amascut_-_fighting_Tumeken's_Warden.png", music: "Amascut's_Promise.ogg", hordes: ['scarab_swarm', 'baboon_brawler', 'baboon_thrower'], elites: ['baboon_mage'], boss: 'wardens', look: ['#8a6a3a', '#7a5a2e', '#9a7a48'] },
  { name: 'Chambers of Xeric', map: [0, 0, 1250, 3560, 1], bg: 'Fighting_Great_Olm.png', music: 'Fire_in_the_Deep.ogg', hordes: ['deathly_ranger', 'deathly_mage'], elites: ['lizardman_shaman', 'skeletal_mystic'], boss: 'olm', look: ['#2e3a4a', '#25303c', '#3a4858'] },
  { name: 'Theatre of Blood', map: [0, 0, 3660, 3220, 1], bg: 'Fighting_Verzik_Vitur.png', music: 'The_Fat_Lady_Sings.ogg', hordes: ['nylocas_ischyros', 'nylocas_toxobolos', 'nylocas_hagios'], elites: [], boss: 'verzik', look: ['#4a1a1a', '#3a1414', '#5a2424'] },
  { name: 'Ancient Prison', map: [7, 2, 2912, 5335, 1.3], bg: 'Fighting_Nex.png', music: 'The_Ancient_Prison.ogg', hordes: ['spiritual_warrior', 'spiritual_ranger', 'spiritual_mage'], elites: ['fumus', 'glacies'], boss: 'nex', look: ['#3a2a4a', '#2e223c', '#4a3a5a'] },
  { name: 'The Inferno', map: [23, 0, 2500, 5100, 1], bg: 'Inferno_arena_overview.png', music: 'Inferno.ogg', hordes: ['jal_nib', 'jal_mejrah', 'jal_ak'], elites: ['jal_imkot', 'jal_xil', 'jal_zek'], boss: 'zuk', look: ['#4a1408', '#3a1006', '#6a200a'] },
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
  { id: 'severance', name: 'Contract of Divine Severance', gain: '+60% damage', cost: 'You can no longer use protection prayers' },
  { id: 'bloodied', name: 'Contract of Bloodied Blows', gain: '+50% attack speed', cost: 'Your max hitpoints drop by 40%' },
  { id: 'breath', name: 'Contract of Forfeit Breath', gain: '+75% gold and +50% luck', cost: 'Sharks, pies and round-end rests no longer heal you' },
  { id: 'clouding', name: 'Contract of Sensory Clouding', gain: '+2 Multishot', cost: 'Enemies hit 35% harder' },
  { id: 'glyphic', name: 'Contract of Glyphic Attenuation', gain: '+25% critical hit chance and a full special attack bar', cost: 'Enemies have 40% more hitpoints' },
];
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
  { id: 'might', name: 'Piety', file: 'Piety.png', max: 4, info: '15% more damage' },
  { id: 'skin', name: 'Steel Skin', file: 'Steel_Skin.png', max: 4, info: 'Take 10% less damage' },
  { id: 'heal', name: 'Rapid Heal', file: 'Rapid_Heal.png', max: 3, info: 'Regenerate 1.5 hitpoints a second' },
  { id: 'greed', name: 'Greed', file: 'Coins_10000.png', max: 3, info: '25% more gold and coins fly to you from further away' },
  { id: 'life', name: 'Redemption', file: 'Redemption.png', max: 1, info: 'Survive one killing blow with half your hitpoints' },
  { id: 'giant', name: 'Giant slayer', file: 'Slayer_icon.png', max: 3, info: '25% more damage to bosses' },
  { id: 'reach', name: 'Mystic Might', file: 'Mystic_Might.png', max: 3, info: '15% more range and melee reach' },
  { id: 'execute', name: 'Ultimate Strength', file: 'Ultimate_Strength.png', max: 1, info: 'Normal enemies below 12% hitpoints die instantly' },
  { id: 'fleet', name: 'Fleet foot', file: 'Agility_icon.png', max: 3, info: '12% faster running' },
];
