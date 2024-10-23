import { formatPercentage } from 'common/format';
import SPELLS from 'common/SPELLS';
import TALENTS from 'common/TALENTS/mage';
import { SpellIcon, SpellLink, TooltipElement } from 'interface';
import Analyzer from 'parser/core/Analyzer';
import { RoundedPanel } from 'interface/guide/components/GuideDivs';
import { explanationAndDataSubsection } from 'interface/guide/components/ExplanationRow';
import { QualitativePerformance } from 'parser/ui/QualitativePerformance';
import { PerformanceMark, qualitativePerformanceToColor } from 'interface/guide';
import { GUIDE_CORE_EXPLANATION_PERCENT } from 'analysis/retail/mage/fire/Guide';
import HeatingUp from '../core/HeatingUp';
import CastSummaryAndBreakdown from 'interface/guide/components/CastSummaryAndBreakdown';
import { BoxRowEntry } from 'interface/guide/components/PerformanceBoxRow';

const CAPPED_MS_THRESHOLD = 7000;

class HeatingUpGuide extends Analyzer {
  static dependencies = {
    heatingUp: HeatingUp,
  };

  protected heatingUp!: HeatingUp;

  hasFlameOn: boolean = this.selectedCombatant.hasTalent(TALENTS.FLAME_ON_TALENT);
  hasCallOfSunKing: boolean = this.selectedCombatant.hasTalent(TALENTS.CALL_OF_THE_SUN_KING_TALENT);

  generateGuideTooltip(
    performance: QualitativePerformance,
    tooltipItems: { perf: QualitativePerformance; detail: string }[],
    timestamp: number,
  ) {
    const tooltip = (
      <>
        <div>
          <b>@ {this.owner.formatTimestamp(timestamp)}</b>
        </div>
        <div>
          <PerformanceMark perf={performance} /> {performance}
        </div>
        <div>
          {tooltipItems.map((t, i) => (
            <div key={i}>
              <PerformanceMark perf={t.perf} /> {t.detail}
              <br />
            </div>
          ))}
        </div>
      </>
    );
    return tooltip;
  }

  get fireBlastUtil() {
    const util = this.heatingUp.fireBlastUtilSuggestionThresholds.actual;
    const thresholds = this.heatingUp.fireBlastUtilSuggestionThresholds.isLessThan;
    let performance = QualitativePerformance.Fail;
    if (util > thresholds.minor) {
      performance = QualitativePerformance.Perfect;
    } else if (util > thresholds.average) {
      performance = QualitativePerformance.Good;
    } else if (util > thresholds.major) {
      performance = QualitativePerformance.Ok;
    }
    return performance;
  }

  get phoenixFlamesUtil() {
    const util = this.heatingUp.phoenixFlamesUtilSuggestionThresholds.actual;
    const thresholds = this.heatingUp.phoenixFlamesUtilSuggestionThresholds.isLessThan;
    let performance = QualitativePerformance.Fail;
    if (util > thresholds.minor) {
      performance = QualitativePerformance.Perfect;
    } else if (util > thresholds.average) {
      performance = QualitativePerformance.Good;
    } else if (util > thresholds.major) {
      performance = QualitativePerformance.Ok;
    }
    return performance;
  }

  get heatingUpData() {
    const data: BoxRowEntry[] = [];
    this.heatingUp.heatingUpCrits.forEach((hu) => {
      const tooltipItems: { perf: QualitativePerformance; detail: string }[] = [];

      const fireBlastCapped =
        hu.cast.ability.guid === SPELLS.FIRE_BLAST.id &&
        hu.charges >= (this.hasFlameOn ? 3 : 1) - 1 &&
        hu.timeTillCapped < CAPPED_MS_THRESHOLD;
      const phoenixFlamesCapped =
        hu.cast.ability.guid === TALENTS.PHOENIX_FLAMES_TALENT.id &&
        hu.charges >= (this.hasCallOfSunKing ? 3 : 2) - 1 &&
        hu.timeTillCapped < CAPPED_MS_THRESHOLD;
      const cappedCharges = fireBlastCapped || phoenixFlamesCapped;
      if (fireBlastCapped) {
        tooltipItems.push({
          perf: QualitativePerformance.Good,
          detail: `Fire Blast cast while capped`,
        });
      } else if (phoenixFlamesCapped) {
        tooltipItems.push({
          perf: QualitativePerformance.Good,
          detail: `Phoenix Flames cast while capped`,
        });
      }

      if (!cappedCharges && hu.hasHotStreak) {
        tooltipItems.push({
          perf: QualitativePerformance.Fail,
          detail: `${hu.cast.ability.name} Cast with Hot Streak`,
        });
      }

      if (!cappedCharges && hu.critBuff.active && hu.critBuff.buffId) {
        tooltipItems.push({
          perf: QualitativePerformance.Good,
          detail: `${hu.cast.ability.name} Cast with ${SPELLS[hu.critBuff.buffId].name}`,
        });
      }

      const castWithoutHeatingUp = !hu.critBuff.active && !hu.hasHotStreak && !hu.hasHeatingUp;
      if (!cappedCharges && castWithoutHeatingUp) {
        tooltipItems.push({
          perf: QualitativePerformance.Fail,
          detail: `${hu.cast.ability.name} Cast without Heating Up or crit buff`,
        });
      }

      let overallPerf = QualitativePerformance.Fail;
      if (cappedCharges || !castWithoutHeatingUp) {
        overallPerf = QualitativePerformance.Good;
      }

      if (tooltipItems) {
        const tooltip = this.generateGuideTooltip(overallPerf, tooltipItems, hu.cast.timestamp);
        data.push({ value: overallPerf, tooltip });
      }
    });
    return data;
  }

  get guideSubsection(): JSX.Element {
    const fireBlast = <SpellLink spell={SPELLS.FIRE_BLAST} />;
    const phoenixFlames = <SpellLink spell={TALENTS.PHOENIX_FLAMES_TALENT} />;
    const combustion = <SpellLink spell={TALENTS.COMBUSTION_TALENT} />;
    const heatingUp = <SpellLink spell={SPELLS.HEATING_UP} />;
    const hotStreak = <SpellLink spell={SPELLS.HOT_STREAK} />;
    const firestarter = <SpellLink spell={TALENTS.FIRESTARTER_TALENT} />;
    const searingTouch = <SpellLink spell={TALENTS.SCORCH_TALENT} />;
    const hyperthermia = <SpellLink spell={TALENTS.HYPERTHERMIA_TALENT} />;
    const alexstraszasFury = <SpellLink spell={TALENTS.ALEXSTRASZAS_FURY_TALENT} />;

    const fireBlastIcon = <SpellIcon spell={SPELLS.FIRE_BLAST} />;
    const phoenixFlamesIcon = <SpellIcon spell={TALENTS.PHOENIX_FLAMES_TALENT} />;

    const explanation = (
      <>
        <div>
          While <b>{heatingUp}</b> is not as impactful as {hotStreak}, it is important to properly
          manage your {heatingUp} procs to get as many {hotStreak} procs as possible throughout the
          fight.
        </div>
        <div>
          <ul>
            <li>
              Use guaranteed crit abilities like {fireBlast} or {phoenixFlames} (with{' '}
              {alexstraszasFury}) to convert {heatingUp} to {hotStreak}
            </li>
            <li>
              Unless you are guaranteed to crit ({combustion}, {firestarter}, {searingTouch}),{' '}
              {hyperthermia}, or are capped on charges, don't use your guaranteed crit abilities
              without {heatingUp}.
            </li>
          </ul>
        </div>
      </>
    );
    const fireBlastTooltip = (
      <>
        {this.heatingUp.fireBlastWithoutHeatingUp} Fire Blast casts without Heating Up.
        <br />
        {this.heatingUp.fireBlastsDuringHotStreak} Fire Blasts cast during Hot Streak
      </>
    );
    const phoenixFlamesTooltip = (
      <>{this.heatingUp.phoenixFlamesDuringHotStreak} Phoenix Flames casts during Hot Streak</>
    );
    const data = (
      <div>
        <RoundedPanel>
          <div
            style={{ color: qualitativePerformanceToColor(this.fireBlastUtil), fontSize: '20px' }}
          >
            {fireBlastIcon}{' '}
            <TooltipElement content={fireBlastTooltip}>
              {formatPercentage(this.heatingUp.fireBlastUtilPercent, 0)} %{' '}
              <small>Fire Blast Utilization</small>
            </TooltipElement>
          </div>
          <div
            style={{
              color: qualitativePerformanceToColor(this.phoenixFlamesUtil),
              fontSize: '20px',
            }}
          >
            {phoenixFlamesIcon}{' '}
            <TooltipElement content={phoenixFlamesTooltip}>
              {formatPercentage(this.heatingUp.phoenixFlamesUtilPercent, 0)} %{' '}
              <small>Phoenix Flames Utilization</small>
            </TooltipElement>
          </div>
          <div>
            <br />
            <CastSummaryAndBreakdown spell={SPELLS.HEATING_UP} castEntries={this.heatingUpData} />
          </div>
        </RoundedPanel>
      </div>
    );

    return explanationAndDataSubsection(
      explanation,
      data,
      GUIDE_CORE_EXPLANATION_PERCENT,
      'Heating Up',
    );
  }
}

export default HeatingUpGuide;
