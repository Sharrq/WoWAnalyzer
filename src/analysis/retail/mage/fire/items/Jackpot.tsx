import SPELLS from 'common/SPELLS';
import TALENTS from 'common/TALENTS/mage';
import { TIERS } from 'game/TIERS';
import Analyzer, { Options, SELECTED_PLAYER } from 'parser/core/Analyzer';
import Events, { ApplyBuffEvent, RefreshBuffEvent, GetRelatedEvent } from 'parser/core/Events';
import SpellUsable from 'parser/shared/modules/SpellUsable';
import EventHistory from 'parser/shared/modules/EventHistory';

const ROLLIN_HOT_DURATION_MS = 7000;
const COMBUSTION_REDUCTION_MS = 2000;

export default class Jackpot extends Analyzer {
  static dependencies = {
    eventHistory: EventHistory,
    spellUsable: SpellUsable,
  };
  protected eventHistory!: EventHistory;
  protected spellUsable!: SpellUsable;

  jackpotProcs: JackpotProcs[] = [];

  constructor(options: Options) {
    super(options);
    this.active = this.selectedCombatant.has2PieceByTier(TIERS.TWW2);
    this.addEventListener(
      Events.applybuff.by(SELECTED_PLAYER).spell(SPELLS.ROLLIN_HOT_BUFF),
      this.onProc,
    );
    this.addEventListener(
      Events.refreshbuff.by(SELECTED_PLAYER).spell(SPELLS.ROLLIN_HOT_BUFF),
      this.onProc,
    );
  }

  onProc(event: ApplyBuffEvent | RefreshBuffEvent) {
    const buffEnd = GetRelatedEvent(event, 'BuffRemove');
    const combust = GetRelatedEvent(event, 'SpellCast');
    this.jackpotProcs.push({
      proc: event,
      start: event.timestamp,
      predictedEnd: combust
        ? event.timestamp + ROLLIN_HOT_DURATION_MS * 2
        : event.timestamp + ROLLIN_HOT_DURATION_MS,
      actualEnd: buffEnd?.timestamp,
      triggeredByCombust: combust ? true : false,
    });
    this.spellUsable.reduceCooldown(TALENTS.COMBUSTION_TALENT.id, COMBUSTION_REDUCTION_MS);
  }

  get totalProcs() {
    return this.jackpotProcs.length;
  }

  get totalCooldownReductionMS() {
    let reduction = 0;
    this.jackpotProcs.forEach((j) => (reduction += COMBUSTION_REDUCTION_MS));
    return reduction;
  }
}

export interface JackpotProcs {
  proc: ApplyBuffEvent | RefreshBuffEvent;
  start: number;
  predictedEnd: number;
  actualEnd?: number;
  triggeredByCombust: boolean;
}
