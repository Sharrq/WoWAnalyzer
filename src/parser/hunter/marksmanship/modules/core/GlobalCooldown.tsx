import CoreGlobalCooldown from 'parser/shared/modules/GlobalCooldown';
import SPELLS from 'common/SPELLS';
import { CastEvent } from 'parser/core/Events';
import { MIN_GCD } from 'parser/hunter/shared/constants';
import Haste from 'parser/shared/modules/Haste';

class GlobalCooldown extends CoreGlobalCooldown {
  static dependencies = {
    ...CoreGlobalCooldown.dependencies,
    haste: Haste,
  };

  protected haste!: Haste;

  /**
   * Barrage and Rapid FIre GCDs are triggered when fabricating channel events
   */
  onCast(event: CastEvent) {
    const spellId = event.ability.guid;
    if (spellId === SPELLS.BARRAGE_TALENT.id || spellId === SPELLS.RAPID_FIRE.id) {
      return;
    }
    const isOnGCD = this.isOnGlobalCooldown(spellId);
    if (!isOnGCD) {
      return;
    }
    super.onCast(event);
  }

  getGlobalCooldownDuration(spellId: number) {
    let gcd = super.getGlobalCooldownDuration(spellId);
    if (!gcd) {
      return 0;
    }
    if (spellId === SPELLS.WILD_SPIRITS.id) {
      gcd = gcd / (1 + this.haste.current);
    }
    return Math.max(MIN_GCD, gcd);
  }

}

export default GlobalCooldown;
