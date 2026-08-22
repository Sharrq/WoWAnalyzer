import type { JSX } from 'react';
import TALENTS from 'common/TALENTS/mage';
import { SpellLink } from 'interface';
import { QualitativePerformance } from 'parser/ui/QualitativePerformance';
import { EventType } from 'parser/core/Events';
import Analyzer from 'parser/core/Analyzer';
import GuideSection from 'interface/guide/components/GuideSection';
import { type CastEvaluation } from 'interface/guide/components/CastSummary';
import {
  SpellSequence,
  type CastSequenceEntry,
  type CastInSequence,
} from 'interface/guide/components/CastSequence';
import CastDetail, { type PerCastData } from 'interface/guide/components/CastDetail';
import EventHistory from 'parser/shared/modules/EventHistory';

import ArcaneSurge, { ArcaneSurgeData } from '../analyzers/ArcaneSurge';
import { TipBox } from 'interface/guide/components';
import { formatPercentage } from 'common/format';

const ARCANE_SURGE_DURATION = 15000;
const ARCANE_SURGE_PRE_WINDOW = 5000;

class ArcaneSurgeGuide extends Analyzer {
  static dependencies = {
    arcaneSurge: ArcaneSurge,
    eventHistory: EventHistory,
  };

  protected arcaneSurge!: ArcaneSurge;
  protected eventHistory!: EventHistory;

  private evaluateArcaneSurgeCast(cast: ArcaneSurgeData): CastEvaluation {
    const activeTimePerf: QualitativePerformance = cast.activeTime
      ? this.arcaneSurge.activeTimeUtil(cast.activeTime)
      : QualitativePerformance.Fail;

    // Fail conditions
    if (!cast.activeTime) {
      return {
        timestamp: cast.cast,
        performance: QualitativePerformance.Fail,
        reason: `No Active Time data found. Please report this!`,
      };
    }

    // Active Time Performance
    if (cast.activeTime) {
      return {
        timestamp: cast.cast,
        performance: activeTimePerf,
        reason: `${formatPercentage(cast.activeTime)}% Active Time`,
      };
    }

    // Fallback for any unexpected edge cases
    return {
      timestamp: cast.cast,
      performance: QualitativePerformance.Fail,
      reason: `Unknown Performance Condition. Please report this.`,
    };
  }

  get guideSubsection(): JSX.Element {
    const arcaneSurge = <SpellLink spell={TALENTS.ARCANE_SURGE_TALENT} />;

    const explanation = (
      <>
        <p>
          <b>{arcaneSurge}</b> is your primary damage cooldown and essentially converts all of your
          mana into damage and then gives you a massive damage and mana regeneration buff that lasts
          for 15 seconds. There is not much to play around with this cooldown, but casting it does
          begin your major burn phase, so you should ensure you are ready to execute that burn phase
          uninterupted and should spend as much of its duration casting as possible.
        </p>
        <TipBox type="info">
          While it may seem beneficial to have a high amount of mana before casting {arcaneSurge},
          this is not enough of a meaningful benefit to play around.
        </TipBox>
      </>
    );

    const surgeSequenceEvents: CastSequenceEntry<ArcaneSurgeData>[] =
      this.arcaneSurge.surgeData.map((cast) => {
        const windowStart = Math.max(
          this.owner.fight.start_time,
          cast.cast - ARCANE_SURGE_PRE_WINDOW,
        );
        const windowEnd =
          cast.buffRemove?.timestamp ??
          (cast.buffApply?.timestamp ?? cast.cast) + ARCANE_SURGE_DURATION;

        const castEvents = this.eventHistory.getEvents([EventType.Cast], {
          searchBackwards: false,
          startTimestamp: windowStart,
          duration: windowEnd - windowStart,
        });

        const casts: CastInSequence[] = castEvents.map((event) => ({
          timestamp: event.timestamp,
          spellId: event.ability.guid,
          spellName: event.ability.name,
          icon: event.ability.abilityIcon.replace('.jpg', ''),
          performance: undefined,
          separatorBefore:
            event.timestamp === cast.cast && event.ability.guid === TALENTS.ARCANE_SURGE_TALENT.id,
        }));

        return {
          data: cast,
          start: windowStart,
          end: windowEnd,
          casts,
        };
      });

    const perCastData: PerCastData[] = this.arcaneSurge.surgeData.map((cast, index) => {
      const evaluation = this.evaluateArcaneSurgeCast(cast);
      const sequenceEntry = surgeSequenceEvents[index];

      return {
        performance: evaluation.performance,
        timestamp: this.owner.formatTimestamp(cast.cast),
        stats: [
          {
            value: `${formatPercentage(cast.activeTime || 0)}%`,
            label: 'Active',
            tooltip: <>Percentage of the Arcane Surge buff spent actively casting</>,
          },
        ],
        details: evaluation.reason,
        additionalContent: sequenceEntry
          ? {
              title: 'Cast Sequence',
              content: <SpellSequence casts={sequenceEntry.casts} iconSize={40} />,
            }
          : undefined,
      };
    });

    return (
      <GuideSection spell={TALENTS.ARCANE_SURGE_TALENT} explanation={explanation}>
        <CastDetail title="Arcane Surge Casts" casts={perCastData} />
      </GuideSection>
    );
  }
}

export default ArcaneSurgeGuide;
