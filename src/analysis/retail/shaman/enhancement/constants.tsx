import SPELLS from 'common/SPELLS';
import { TALENTS_SHAMAN } from 'common/TALENTS';

// TODO: either spell or talent depends on the next build.
export const ASCENDANCE_ID = 114051;

export const STORMSTRIKE_CAST_SPELLS = [TALENTS_SHAMAN.STORMSTRIKE_TALENT, SPELLS.WINDSTRIKE_CAST];

export const STORMSTRIKE_DAMAGE_SPELLS = [
  SPELLS.STORMSTRIKE_DAMAGE,
  SPELLS.STORMSTRIKE_DAMAGE_OFFHAND,
  SPELLS.WINDSTRIKE_DAMAGE,
  SPELLS.WINDSTRIKE_DAMAGE_OFFHAND,
];

export const MOLTEN_ASSAULT_SCALING = [0, 3, 6];

export const ESSENTIAL_EXTRACTION_EFFECT_BY_RANK = [
  0,
  -25,
  -26,
  -27,
  -28,
  -29,
  -30,
  -31,
  -33,
  -34,
  -35,
  -36,
  -37,
  -38,
  -39,
  -40,
];