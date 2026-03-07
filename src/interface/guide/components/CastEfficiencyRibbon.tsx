import type { JSX } from 'react';
import styled from '@emotion/styled';
import { SpellLink, Tooltip } from 'interface';
import { useAnalyzer, useInfo, useEvents } from 'interface/guide';
import CastEfficiency from 'parser/shared/modules/CastEfficiency';
import Abilities from 'parser/core/modules/Abilities';
import EventHistory from 'parser/shared/modules/EventHistory';
import { formatPercentage, formatDuration } from 'common/format';
import Spell from 'common/SPELLS/Spell';
import {
  StatCard,
  StatCardValue,
  StatCardDivider,
  StatCardLabel,
  HelperText,
} from './GuideDataWrapper';
import GuideDataWrapper from './GuideDataWrapper';
import { EventType, UpdateSpellUsableEvent, UpdateSpellUsableType } from 'parser/core/Events';
import { CooldownWindow } from 'parser/ui/CooldownBar';
import { ChargeBar, DualBar, BAD_COLOR, createCooldownSegments } from './SegmentedBar';

// Styled Components
const RibbonContainer = styled.div`
  background: rgba(0, 0, 0, 0.3);
  border-radius: 6px;
  padding: 8px 12px;
  margin-top: 8px;
`;

interface Props {
  /** The spell to show cooldown bars for - this must match the ID of the spell's cast event */
  spell: Spell;
  /** If provided, shows explanatory text above the cooldown bar */
  showExplanation?: boolean;
  /** Color to use for the efficiency stat card. If not provided, uses white. */
  efficiencyColor?: string;
  /**
   * Windows where the spell is actually usable. Useful for execute spells or phase-specific abilities.
   * If not specified, defaults to the whole fight.
   */
  activeWindows?: CooldownWindow[];
  /** If true, shows the spell icon next to the title */
  showIcon?: boolean;
}

/**
 * Unified component for displaying cast efficiency as a ribbon visualization.
 * Automatically handles both charge-based and cooldown-based abilities.
 *
 * - For charge abilities: Shows a horizontal bar with filled/empty segments
 * - For cooldown abilities: Shows a ribbon timeline with gaps showing availability
 *
 * @param spell - The spell to show cooldown bars for (must match cast event ID)
 * @param showExplanation - If true, shows explanatory text above the cooldown bar (default: false)
 * @param efficiencyColor - Color for efficiency stat card (default: white)
 * @param activeWindows - Time windows when spell is usable (default: whole fight)
 */
export default function CastEfficiencyRibbon({
  spell,
  showExplanation = false,
  efficiencyColor = 'white',
  activeWindows,
  showIcon = false,
}: Props): JSX.Element | null {
  const castEfficiency = useAnalyzer(CastEfficiency);
  const abilities = useAnalyzer(Abilities);
  const eventHistory = useAnalyzer(EventHistory);
  const info = useInfo();
  const events = useEvents();

  if (!castEfficiency || !info || !abilities || !events) {
    return null;
  }

  const ability = abilities.getAbility(spell.id);
  const hasCharges = (ability?.charges ?? 1) > 1;
  const iconProp = showIcon ? spell.icon : undefined;

  // Charge-based rendering requires EventHistory
  if (hasCharges && !eventHistory) {
    const errorContent = (
      <HelperText>
        <strong>EventHistory module is not available.</strong> Chart cannot be rendered.
      </HelperText>
    );

    return (
      <GuideDataWrapper bare title={`${spell.name} - Error`}>
        {errorContent}
      </GuideDataWrapper>
    );
  }

  const maxCharges = ability?.charges || 1;
  const { fightStart, fightEnd } = info;
  const windows = activeWindows ?? [{ startTime: fightStart, endTime: fightEnd }];
  const spellCasts = castEfficiency.getCastEfficiencyForSpellId(spell.id);
  const efficiency = spellCasts?.efficiency ?? 0;
  const actualCasts = spellCasts?.casts ?? 0;
  const possibleCasts = spellCasts?.maxCasts ?? 0;

  // Determine stat card color based on efficiency thresholds
  const getEfficiencyColor = (): string => {
    if (efficiencyColor !== 'white') {
      // If a specific color was provided, use it
      return efficiencyColor;
    }

    if (!spellCasts) {
      return 'white';
    }

    const { majorIssueEfficiency, averageIssueEfficiency, recommendedEfficiency } = spellCasts;

    // Color based on efficiency thresholds
    if (efficiency < majorIssueEfficiency) {
      return '#dc2626'; // Red - fail
    } else if (efficiency < averageIssueEfficiency) {
      return '#fbbf24'; // Yellow - ok
    } else if (efficiency <= recommendedEfficiency) {
      return '#22c55e'; // Green - good
    } else {
      return '#3b82f6'; // Blue - perfect
    }
  };

  const statColor = getEfficiencyColor();

  // Calculate time spent capped at max charges (for charge-based abilities)
  const calculateWastedTime = (): number => {
    if (!hasCharges || !eventHistory) return 0;

    // Helper to check if event is a charge use
    const isChargeUse = (updateType: UpdateSpellUsableType) =>
      updateType === UpdateSpellUsableType.UseCharge ||
      updateType === UpdateSpellUsableType.BeginCooldown;

    // Helper to check if event is a charge restore
    const isChargeRestore = (updateType: UpdateSpellUsableType) =>
      updateType === UpdateSpellUsableType.RestoreCharge ||
      updateType === UpdateSpellUsableType.EndCooldown;

    let wastedTime = 0;

    windows.forEach((window) => {
      const windowStart = window.startTime;
      const windowEnd = window.endTime;

      const updateEvents: UpdateSpellUsableEvent[] = eventHistory.getEvents(
        EventType.UpdateSpellUsable,
        { spell: spell, searchBackwards: false },
      );

      updateEvents.sort((a, b) => {
        if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
        const orderA = isChargeUse(a.updateType) ? 0 : 1;
        const orderB = isChargeUse(b.updateType) ? 0 : 1;
        return orderA - orderB;
      });

      // Filter out simultaneous use/restore events
      const filteredEvents: UpdateSpellUsableEvent[] = [];
      for (let i = 0; i < updateEvents.length; i++) {
        const event = updateEvents[i];
        const nextEvent = updateEvents[i + 1];

        if (
          nextEvent &&
          event.timestamp === nextEvent.timestamp &&
          isChargeUse(event.updateType) &&
          isChargeRestore(nextEvent.updateType)
        ) {
          i++;
          continue;
        }

        filteredEvents.push(event);
      }

      // Calculate initial charges before window
      let currentCharges = maxCharges;
      filteredEvents.forEach((event) => {
        if (event.timestamp < windowStart) {
          if (isChargeUse(event.updateType)) {
            currentCharges = Math.max(0, currentCharges - 1);
          } else if (event.updateType === UpdateSpellUsableType.RestoreCharge) {
            currentCharges = Math.min(maxCharges, currentCharges + 1);
          } else if (event.updateType === UpdateSpellUsableType.EndCooldown) {
            currentCharges = maxCharges;
          }
        }
      });

      const chargeEvents = filteredEvents.filter(
        (e) => e.timestamp >= windowStart && e.timestamp <= windowEnd,
      );

      let chargesAvailable = currentCharges;
      let segmentStart = windowStart;
      let wasCapped = chargesAvailable === maxCharges;

      chargeEvents.forEach((event) => {
        if (wasCapped && event.timestamp > segmentStart) {
          wastedTime += event.timestamp - segmentStart;
        }

        if (isChargeUse(event.updateType)) {
          chargesAvailable = Math.max(0, chargesAvailable - 1);
        } else if (event.updateType === UpdateSpellUsableType.RestoreCharge) {
          chargesAvailable = Math.min(maxCharges, chargesAvailable + 1);
        } else if (event.updateType === UpdateSpellUsableType.EndCooldown) {
          chargesAvailable = maxCharges;
        }

        wasCapped = chargesAvailable === maxCharges;
        segmentStart = event.timestamp;
      });

      if (wasCapped && windowEnd > segmentStart) {
        wastedTime += windowEnd - segmentStart;
      }
    });

    return wastedTime;
  };

  const wastedTime = calculateWastedTime();
  const wastedSeconds = Math.round(wastedTime / 1000);

  // Generate explanation text
  const explanation = hasCharges ? (
    <HelperText>
      Shows charges of <SpellLink spell={spell} /> used vs possible. Time capped shows how long you
      were at maximum charges.
    </HelperText>
  ) : (
    <HelperText>
      Shows cast efficiency for <SpellLink spell={spell} />. Red highlighted areas indicate times
      when the spell was available but not cast.
    </HelperText>
  );

  // ── Bar colors ────────────────────────────────────────────────────────
  const YELLOW = '#fbbf24';
  const RED = '#ef4444';

  // Build stats cards
  const statCards = hasCharges ? (
    <>
      <Tooltip content={`Cast ${actualCasts} out of ${possibleCasts} possible times`}>
        <StatCard size="md" color={statColor}>
          <StatCardValue size="md" color={statColor}>
            {formatPercentage(efficiency, 0)}%
          </StatCardValue>
          <StatCardDivider size="md" color={statColor} />
          <StatCardLabel size="md">Efficiency</StatCardLabel>
        </StatCard>
      </Tooltip>
      <Tooltip
        content={`${possibleCasts - actualCasts} missed cast${possibleCasts - actualCasts !== 1 ? 's' : ''} out of ${possibleCasts} possible`}
      >
        <StatCard size="md" color={RED}>
          <StatCardValue size="md" color={RED}>
            {possibleCasts - actualCasts}
          </StatCardValue>
          <StatCardDivider size="md" color={RED} />
          <StatCardLabel size="md">Missed</StatCardLabel>
        </StatCard>
      </Tooltip>
      <Tooltip content={`Time spent at maximum charges: ${formatDuration(wastedTime)}`}>
        <StatCard size="md" color={YELLOW}>
          <StatCardValue size="md" color={YELLOW}>
            {wastedSeconds}s
          </StatCardValue>
          <StatCardDivider size="md" color={YELLOW} />
          <StatCardLabel size="md">Time Capped</StatCardLabel>
        </StatCard>
      </Tooltip>
    </>
  ) : (
    <Tooltip content={`Cast ${actualCasts} out of ${possibleCasts} possible times`}>
      <StatCard size="md" color={statColor}>
        <StatCardValue size="md" color={statColor}>
          {formatPercentage(efficiency, 0)}%
        </StatCardValue>
        <StatCardDivider size="md" color={statColor} />
        <StatCardLabel size="md">Efficiency</StatCardLabel>
      </StatCard>
    </Tooltip>
  );

  // ── Pre-compute bar data ─────────────────────────────────────────────────
  const allSegs = !hasCharges ? createCooldownSegments(spell.id, events, windows, YELLOW) : [];
  const cdSegs = allSegs.filter((s) => s.color !== BAD_COLOR);
  const availSegs = allSegs.filter((s) => s.color === BAD_COLOR);
  const castTs = events
    .filter(
      (e) =>
        e.type === EventType.Cast &&
        e.ability.guid === spell.id &&
        windows.some((w) => e.timestamp >= w.startTime && e.timestamp <= w.endTime),
    )
    .map((e) => e.timestamp);

  const ribbon = hasCharges ? (
    <ChargeBar actualCasts={actualCasts} possibleCasts={possibleCasts} />
  ) : (
    <DualBar
      cooldownSegments={cdSegs}
      availableSegments={availSegs}
      castTimestamps={castTs}
      fightStart={fightStart}
      fightEnd={fightEnd}
    />
  );

  return (
    <GuideDataWrapper
      bare
      title={spell.name}
      subtitle={hasCharges ? 'Charge Usage' : 'Cast Efficiency'}
      stats={statCards}
      icon={iconProp}
    >
      <RibbonContainer>{ribbon}</RibbonContainer>
      {showExplanation && explanation}
    </GuideDataWrapper>
  );
}
