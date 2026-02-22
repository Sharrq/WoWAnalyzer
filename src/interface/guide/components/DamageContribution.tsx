import type { JSX } from 'react';
import styled from '@emotion/styled';
import Spell from 'common/SPELLS/Spell';
import { formatPercentage, formatNumber } from 'common/format';
import GuideDataWrapper from './GuideDataWrapper';
import { ReactNode, useState } from 'react';

interface SpellContribution {
  spell: Spell;
  color: string;
  amount: number;
}

interface Props {
  /** Title for the chart (defaults to "Damage Contribution") */
  title?: string;
  /** List of spells to track with their colors */
  spells: Array<{ spell: Spell; color: string }>;
  /** Function to calculate damage/healing for a spell */
  calculateContribution: (spellId: number) => number;
  /** Color for the "Other" category */
  otherColor?: string;
  /** Helper text to display below the chart */
  helperText?: string;
  /** Optional stat cards to display in the header */
  stats?: ReactNode;
}

/**
 * Displays damage/healing contribution as a stacked bar with spell breakdown and legend.
 * Automatically includes an "Other" category for untracked spells.
 * Built using GuideDataWrapper for consistent styling.
 *
 * @param title - Title for the chart (defaults to "Damage Contribution")
 * @param spells - List of spells to track with their display colors
 * @param calculateContribution - Function that takes spellId and returns damage/healing amount
 * @param otherColor - Color for the "Other" category (default: #666666)
 * @param helperText - Optional helper text to display below the header
 * @param stats - Optional stat cards to display in the header
 */
export default function DamageContribution({
  title,
  spells,
  calculateContribution,
  otherColor = '#666666',
  helperText,
  stats,
}: Props) {
  // Default title to "Damage Contribution" if not provided
  const displayTitle = title ?? 'Damage Contribution';

  // Track which spell is being hovered (null means none, -1 for "Other")
  const [hoveredSpellId, setHoveredSpellId] = useState<number | null>(null);

  // Calculate contributions for each spell
  const contributions: SpellContribution[] = spells
    .map(({ spell, color }) => ({
      spell,
      color,
      amount: calculateContribution(spell.id),
    }))
    .filter((contrib) => contrib.amount > 0);

  // Calculate total from all specified spells
  const specifiedTotal = contributions.reduce((sum, contrib) => sum + contrib.amount, 0);

  // Calculate total from all damage (including unspecified)
  const overallTotal = calculateContribution(-1); // -1 signals to get total of all

  // Calculate "Other" category
  const otherAmount = Math.max(0, overallTotal - specifiedTotal);

  // Add "Other" to contributions if it exists
  const allContributions: Array<SpellContribution & { isOther?: boolean }> = [...contributions];

  if (otherAmount > 0) {
    allContributions.push({
      spell: { id: -1, name: 'Other', icon: '' } as Spell,
      color: otherColor,
      amount: otherAmount,
      isOther: true,
    });
  }

  const total = overallTotal;

  // Sort by amount descending
  allContributions.sort((a, b) => b.amount - a.amount);

  return (
    <GuideDataWrapper
      title={displayTitle}
      subtitle="Distribution"
      stats={stats}
      helperText={helperText}
    >
      <BarContainer>
        <StackedBarContainer>
          {
            allContributions.reduce<{ elements: JSX.Element[]; cumulativeLeft: number }>(
              (acc, contrib) => {
                const percentage = (contrib.amount / total) * 100;
                const spellId = contrib.isOther ? -1 : contrib.spell.id;
                const isHovered = hoveredSpellId === spellId;
                const shouldDim = hoveredSpellId !== null && !isHovered;

                acc.elements.push(
                  <StackedSegment
                    key={contrib.isOther ? 'other' : contrib.spell.id}
                    $color={contrib.color}
                    $width={percentage}
                    $left={acc.cumulativeLeft}
                    $dimmed={shouldDim}
                    onMouseEnter={() => setHoveredSpellId(spellId)}
                    onMouseLeave={() => setHoveredSpellId(null)}
                    title={`${contrib.isOther ? 'Other' : contrib.spell.name}: ${formatNumber(contrib.amount)} (${formatPercentage(percentage / 100, 1)}%)`}
                  />,
                );
                acc.cumulativeLeft += percentage;
                return acc;
              },
              { elements: [], cumulativeLeft: 0 },
            ).elements
          }
        </StackedBarContainer>
      </BarContainer>
      <LegendSection>
        <LegendContainer>
          {allContributions.map((contrib) => {
            const percentage = contrib.amount / total;
            const spellId = contrib.isOther ? -1 : contrib.spell.id;
            const isHovered = hoveredSpellId === spellId;
            const shouldDim = hoveredSpellId !== null && !isHovered;

            return (
              <GridCard
                key={contrib.isOther ? 'other' : contrib.spell.id}
                color={contrib.color}
                $dimmed={shouldDim}
                onMouseEnter={() => setHoveredSpellId(spellId)}
                onMouseLeave={() => setHoveredSpellId(null)}
              >
                {!contrib.isOther && contrib.spell.icon && (
                  <SpellIcon
                    src={`https://assets.rpglogs.com/img/warcraft/abilities/${contrib.spell.icon}.jpg`}
                    alt={contrib.spell.name}
                  />
                )}
                <GridContent>
                  <GridSpellName>{contrib.isOther ? 'Other' : contrib.spell.name}</GridSpellName>
                  <GridStats>
                    <GridAmount>{formatNumber(contrib.amount)}</GridAmount>
                    <GridPercentage>{formatPercentage(percentage, 1)}%</GridPercentage>
                  </GridStats>
                </GridContent>
              </GridCard>
            );
          })}
        </LegendContainer>
      </LegendSection>
    </GuideDataWrapper>
  );
}

const BarContainer = styled.div`
  padding: 15px 20px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 6px;
  margin-bottom: 12px;
`;

const LegendSection = styled.div`
  padding: 15px 20px;
  background: rgba(0, 0, 0, 0.25);
  border-radius: 6px;
`;

const StackedBarContainer = styled.div`
  width: 100%;
  height: 0;
  padding-bottom: 3%; /* Bar height is 3% of width */
  position: relative;
  display: flex;
  border-radius: 4px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.4);
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.4);
`;

const StackedSegment = styled.div<{
  $color: string;
  $width: number;
  $left: number;
  $dimmed?: boolean;
}>`
  position: absolute;
  left: ${(props) => props.$left}%;
  width: ${(props) => props.$width}%;
  height: 100%;
  top: 0;
  background: ${(props) => props.$color};
  transition: all 0.2s ease;
  cursor: pointer;
  opacity: ${(props) => (props.$dimmed ? 0.3 : 0.9)};
  filter: ${(props) => (props.$dimmed ? 'grayscale(100%) brightness(0.6)' : 'none')};

  &:hover {
    opacity: 1;
    filter: none;
  }
`;

const LegendContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 8px;

  @media (min-width: 768px) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const GridCard = styled.div<{ color: string; $dimmed?: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 6px;
  border-left: 3px solid ${(props) => props.color};
  transition: all 0.2s ease;
  cursor: pointer;
  opacity: ${(props) => (props.$dimmed ? 0.4 : 1)};
  filter: ${(props) => (props.$dimmed ? 'grayscale(100%)' : 'none')};

  &:hover {
    background: rgba(0, 0, 0, 0.45);
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    opacity: 1;
    filter: none;
  }
`;

const SpellIcon = styled.img`
  width: 36px;
  height: 36px;
  border-radius: 4px;
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
`;

const GridContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0;
`;

const GridSpellName = styled.div`
  color: rgba(255, 255, 255, 0.9);
  font-weight: 600;
  font-size: 1.3rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const GridStats = styled.div`
  display: flex;
  align-items: baseline;
  gap: 6px;
`;

const GridAmount = styled.div`
  color: white;
  font-weight: 700;
  font-size: 1.4rem;
`;

const GridPercentage = styled.div`
  color: rgba(255, 255, 255, 0.6);
  font-size: 1.2rem;
  font-weight: 500;
`;
