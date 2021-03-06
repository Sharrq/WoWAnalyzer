import React from 'react';
import Analyzer from 'parser/core/Analyzer';

import SPELLS from 'common/SPELLS';
import SpellLink from 'common/SpellLink';
import { calculateAzeriteEffects } from 'common/stats';
import { formatNumber, formatPercentage } from 'common/format';
import StatTracker from 'parser/shared/modules/StatTracker';
import AzeritePowerStatistic from 'interface/statistics/AzeritePowerStatistic';
import BoringSpellValueText from 'interface/statistics/components/BoringSpellValueText/index';
import HasteIcon from 'interface/icons/Haste';
import UptimeIcon from 'interface/icons/Uptime';
import RelentlessInquisitorStackHandler from './RelentlessInquisitorStackHandler';

const relentlessInquisitorStats = traits => Object.values(traits).reduce((obj, rank) => {
  const [haste] = calculateAzeriteEffects(SPELLS.RELENTLESS_INQUISITOR.id, rank);
  obj.haste += haste;
  return obj;
}, {
    haste: 0,
  });

/**
 * Spending Holy Power grants you 9 haste for 12 sec per Holy Power spent, stacking up to 20 times. 
 *
 * */
class RelentlessInquisitor extends Analyzer {
  static dependencies = {
    relentlessInquisitorStackHandler: RelentlessInquisitorStackHandler,
    statTracker: StatTracker,
  };

  hasteBuff = 0;

  constructor(...args) {
    super(...args);
    this.active = this.selectedCombatant.hasTrait(SPELLS.RELENTLESS_INQUISITOR.id);
    if (!this.active) {
      return;
    }

    const { haste } = relentlessInquisitorStats(this.selectedCombatant.traitsBySpellId[SPELLS.RELENTLESS_INQUISITOR.id]);
    this.hasteBuff = haste;

    this.statTracker.add(SPELLS.RELENTLESS_INQUISITOR_BUFF.id, {
      haste,
    });
  }
  get averageStacks() {
    return this.relentlessInquisitorStackHandler.averageStacks;
  }

  get averageStatGain() {
    return this.averageStacks * this.hasteBuff;
  }

  get totalBuffUptime() {
    return this.selectedCombatant.getBuffUptime(SPELLS.RELENTLESS_INQUISITOR_BUFF.id) / this.owner.fightDuration;
  }

  get suggestionThresholds() {
    return {
      actual: this.averageStacks,
      isLessThan: {
        minor: 16,
        average: 14,
        major: 12,
      },
      style: 'number',
    };
  }

  suggestions(when) {
    when(this.suggestionThresholds).addSuggestion((suggest, actual, recommended) => {
      return suggest(<>You had a low average of <SpellLink id={SPELLS.RELENTLESS_INQUISITOR.id} /> stacks. Consider using another trait if you're dropping the buff often because of fight mechanics.</>)
        .icon(SPELLS.RELENTLESS_INQUISITOR.icon)
        .actual(`${formatNumber(actual)} average stacks`)
        .recommended(`as close to 20 as possible is recommended`);
    });
  }

  statistic() {
    return (
      <AzeritePowerStatistic
        size="flexible"
        tooltip={`You had an average of ${formatNumber(this.averageStacks)} stacks throughout the fight`}
      >
        <BoringSpellValueText spell={SPELLS.RELENTLESS_INQUISITOR}>
        <UptimeIcon /> {formatPercentage(this.totalBuffUptime)}% <small>uptime</small>
        <br />
        <HasteIcon /> {formatNumber(this.averageStatGain)} <small>average Haste gained</small>
        </BoringSpellValueText>
      </AzeritePowerStatistic>
    );
  }
}

export default RelentlessInquisitor;
