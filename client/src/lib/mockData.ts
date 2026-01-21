// Mock data for Antica server context
export const ANTICA_DATA = {
  server: "Antica",
  mainGuild: {
    name: "Codex",
    description: "A brotherhood of ancient warriors and modern legends on Antica.",
    formationDate: "2024-05-12",
    totalExp: "45.8B",
    guildPower: 92,
    stats: {
      membersOnline: 12,
      totalMembers: 145,
      avgLevel: 420,
      commonVocation: "Elite Knight",
      expToday: "145.2M"
    },
    members: [
      { name: "Aethelgard", level: 560, vocation: "Elite Knight", exp: "1.2B", online: true, startLevel: 558, levelsGained: 2, expGained: "45M" },
      { name: "Lumina Star", level: 520, vocation: "Elder Druid", exp: "980M", online: true, startLevel: 519, levelsGained: 1, expGained: "28M" },
      { name: "Shadow Bolt", level: 490, vocation: "Royal Paladin", exp: "850M", online: false, startLevel: 489, levelsGained: 1, expGained: "15M" },
      { name: "Fire Storm", level: 505, vocation: "Master Sorcerer", exp: "910M", online: true, startLevel: 502, levelsGained: 3, expGained: "62M" },
      { name: "Stone Wall", level: 410, vocation: "Elite Knight", exp: "620M", online: false, startLevel: 408, levelsGained: 2, expGained: "35M" },
      { name: "Frost Healer", level: 435, vocation: "Elder Druid", exp: "680M", online: true, startLevel: 435, levelsGained: 0, expGained: "8M" },
      { name: "Quick Arrow", level: 380, vocation: "Royal Paladin", exp: "510M", online: true, startLevel: 378, levelsGained: 2, expGained: "22M" },
      { name: "Arcane Nova", level: 460, vocation: "Master Sorcerer", exp: "740M", online: false, startLevel: 459, levelsGained: 1, expGained: "18M" }
    ]
  },
  enemyGuild: {
    name: "Retro Rushers",
    description: "Dominating the powerplay scene with aggressive tactics.",
    formationDate: "2025-01-05",
    totalExp: "38.2B",
    guildPower: 88,
    stats: {
      membersOnline: 18,
      totalMembers: 112,
      avgLevel: 395,
      commonVocation: "Master Sorcerer",
      expToday: "110.5M"
    },
    members: [
      { name: "Rush Master", level: 540, vocation: "Master Sorcerer", exp: "1.1B", online: true },
      { name: "Gank King", level: 510, vocation: "Elite Knight", exp: "940M", online: true },
      { name: "Toxic Arrow", level: 480, vocation: "Royal Paladin", exp: "820M", online: true },
      { name: "Heal Bot", level: 495, vocation: "Elder Druid", exp: "890M", online: true }
    ]
  },
  pvpLogs: [
    { date: "2026-01-20", codexKills: 8, enemyKills: 3, totalDeaths: 11 },
    { date: "2026-01-19", codexKills: 5, enemyKills: 5, totalDeaths: 10 },
    { date: "2026-01-18", codexKills: 12, enemyKills: 4, totalDeaths: 16 },
    { date: "2026-01-17", codexKills: 3, enemyKills: 7, totalDeaths: 10 },
    { date: "2026-01-16", codexKills: 15, enemyKills: 2, totalDeaths: 17 },
    { date: "2026-01-15", codexKills: 6, enemyKills: 4, totalDeaths: 10 },
    { date: "2026-01-14", codexKills: 9, enemyKills: 6, totalDeaths: 15 }
  ]
};
