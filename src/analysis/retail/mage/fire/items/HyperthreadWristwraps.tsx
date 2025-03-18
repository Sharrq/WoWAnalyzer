import SPELLS from 'common/SPELLS';
import ITEMS from 'common/ITEMS/mage';
import Analyzer, { Options, SELECTED_PLAYER } from 'parser/core/Analyzer';
import Events, { CastEvent, EventType } from 'parser/core/Events';
import SpellUsable from 'parser/shared/modules/SpellUsable';
import EventHistory from 'parser/shared/modules/EventHistory';
import BoringSpellValueText from 'parser/ui/BoringSpellValueText';
import Statistic from 'parser/ui/Statistic';
import STATISTIC_CATEGORY from 'parser/ui/STATISTIC_CATEGORY';
import SpellLink from 'interface/SpellLink';
import { formatPercentage } from 'common/format';

const HYPERTHREAD_REDUCTION_MS = 5000;

export default class HyperthreadWristwraps extends Analyzer {
  static dependencies = {
    eventHistory: EventHistory,
    spellUsable: SpellUsable,
  };
  protected eventHistory!: EventHistory;
  protected spellUsable!: SpellUsable;

  wristCasts: HyperthreadWristwrapCasts[] = [];

  constructor(options: Options) {
    super(options);
    this.active = this.selectedCombatant.hasWrists(ITEMS.HYPERTHREAD_WRISTWRAPS.id);
    this.addEventListener(
      Events.cast.by(SELECTED_PLAYER).spell(SPELLS.HYPERTHREAD_WRISTWRAPS_CAST),
      this.onCast,
    );
  }

  onCast(event: CastEvent) {
    const previousCasts = this.eventHistory.getEvents(EventType.Cast, { count: 3 });
    previousCasts.forEach((c) =>
      this.spellUsable.reduceCooldown(c.ability.guid, HYPERTHREAD_REDUCTION_MS),
    );
    this.wristCasts.push({
      cast: event,
      spellCasts: previousCasts,
    });
  }

  get totalHyperthreadCasts() {
    return this.wristCasts.length;
  }

  get totalReducedCasts() {
    let total = 0;
    this.wristCasts.forEach((w) => (total += w.spellCasts.length));
    return total;
  }

  get castBreakdown() {
    const castArray: number[][] = [];
    this.wristCasts.forEach((w) => {
      w.spellCasts.forEach((s) => {
        const index = castArray.findIndex((arr) => arr.includes(s.ability.guid));
        if (index !== -1) {
          castArray[index][1] += 1;
        } else {
          castArray.push([s.ability.guid, 1]);
        }
      });
    });
    return castArray;
  }

  statistic() {
    return (
      <Statistic wide size="flexible" category={STATISTIC_CATEGORY.ITEMS}>
        <BoringSpellValueText spell={ITEMS.HYPERTHREAD_WRISTWRAPS.effectId}>
          <>
            <table className="table table-condensed">
              <tbody>
                <tr>
                  <td>
                    <small>Spells Reduced by Hyperthread Wrists</small>
                  </td>
                  <td>
                    <small>Total Casts</small>
                  </td>
                  <td>
                    <small>% of Total Casts</small>
                  </td>
                </tr>
                {this.castBreakdown
                  .sort((a, b) => b[1] - a[1])
                  .map((spell) => (
                    <tr key={Number(spell)} style={{ fontSize: 16 }}>
                      <td>
                        <SpellLink spell={Number(spell[0])} />
                      </td>
                      <td style={{ textAlign: 'center' }}>{spell[1]}</td>
                      <td style={{ textAlign: 'center' }}>
                        {formatPercentage(spell[1] / this.totalReducedCasts)}%
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </>
        </BoringSpellValueText>
      </Statistic>
    );
  }
}

export interface HyperthreadWristwrapCasts {
  cast: CastEvent;
  spellCasts: CastEvent[];
}
