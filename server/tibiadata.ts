// TibiaData API integration for character and guild data
const TIBIADATA_BASE = "https://api.tibiadata.com/v4";

interface TibiaCharacter {
  name: string;
  level: number;
  vocation: string;
  world: string;
  guild?: { name: string };
  online?: boolean;
}

interface TibiaGuildMember {
  name: string;
  title: string;
  rank: string;
  vocation: string;
  level: number;
  joined: string;
  status: string;
}

// Cache for API responses
const cache = new Map<string, { data: any; expires: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function cachedFetch(url: string): Promise<any> {
  const cached = cache.get(url);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`TibiaData API error: ${response.status}`);
  }
  const data = await response.json();
  cache.set(url, { data, expires: Date.now() + CACHE_TTL });
  return data;
}

export async function fetchCharacter(name: string): Promise<TibiaCharacter | null> {
  try {
    const data = await cachedFetch(`${TIBIADATA_BASE}/character/${encodeURIComponent(name)}`);
    if (!data.character?.character) return null;
    
    const char = data.character.character;
    return {
      name: char.name,
      level: char.level,
      vocation: char.vocation,
      world: char.world,
      guild: char.guild ? { name: char.guild.name } : undefined,
    };
  } catch (error) {
    console.error(`Failed to fetch character ${name}:`, error);
    return null;
  }
}

export async function fetchGuildMembers(guildName: string): Promise<TibiaGuildMember[]> {
  try {
    const data = await cachedFetch(`${TIBIADATA_BASE}/guild/${encodeURIComponent(guildName)}`);
    if (!data.guild?.members) return [];
    
    // TibiaData v4 returns members as a flat array
    return data.guild.members.map((member: any) => ({
      name: member.name,
      title: member.title || "",
      rank: member.rank || "Member",
      vocation: member.vocation,
      level: member.level,
      joined: member.joined,
      status: member.status,
    }));
  } catch (error) {
    console.error(`Failed to fetch guild ${guildName}:`, error);
    return [];
  }
}

export async function fetchGuildInfo(guildName: string): Promise<any | null> {
  try {
    const data = await cachedFetch(`${TIBIADATA_BASE}/guild/${encodeURIComponent(guildName)}`);
    if (!data.guild) return null;
    
    return {
      name: data.guild.name,
      world: data.guild.world,
      description: data.guild.description,
      founded: data.guild.founded,
      active: data.guild.active,
      homepage: data.guild.homepage,
      membersTotal: data.guild.members_total,
      membersOnline: data.guild.members_online,
    };
  } catch (error) {
    console.error(`Failed to fetch guild info ${guildName}:`, error);
    return null;
  }
}

export async function verifyGuildDescription(guildName: string, verificationCode: string): Promise<boolean> {
  try {
    const guildInfo = await fetchGuildInfo(guildName);
    if (!guildInfo) return false;
    
    // Check if verification code is in the description
    return guildInfo.description?.includes(verificationCode) || false;
  } catch (error) {
    console.error(`Failed to verify guild ${guildName}:`, error);
    return false;
  }
}

export async function scanCharacter(name: string): Promise<TibiaCharacter | null> {
  // This function can be extended to include TibSpy or other APIs
  return await fetchCharacter(name);
}
