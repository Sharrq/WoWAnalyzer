import fetchWcl from 'common/fetchWclApi';
import { CLASS_COLORS, hexWithAlpha } from 'common/colors';
import PropTypes from 'prop-types';
import { PureComponent } from 'react';

import RaidHealthChart from './RaidHealthChart';

const CLASS_CHART_LINE_COLORS = {
  DeathKnight: hexWithAlpha(CLASS_COLORS.DEATH_KNIGHT, 0.6),
  Druid: hexWithAlpha(CLASS_COLORS.DRUID, 0.6),
  Evoker: hexWithAlpha(CLASS_COLORS.EVOKER, 0.6),
  Hunter: hexWithAlpha(CLASS_COLORS.HUNTER, 0.6),
  Mage: hexWithAlpha(CLASS_COLORS.MAGE, 0.6),
  Monk: hexWithAlpha(CLASS_COLORS.MONK, 0.6),
  Paladin: hexWithAlpha(CLASS_COLORS.PALADIN, 0.6),
  Priest: hexWithAlpha(CLASS_COLORS.PRIEST, 0.6),
  Rogue: hexWithAlpha(CLASS_COLORS.ROGUE, 0.6),
  Shaman: hexWithAlpha(CLASS_COLORS.SHAMAN, 0.6),
  Warlock: hexWithAlpha(CLASS_COLORS.WARLOCK, 0.6),
  Warrior: hexWithAlpha(CLASS_COLORS.WARRIOR, 0.6),
  DemonHunter: hexWithAlpha(CLASS_COLORS.DEMON_HUNTER, 0.6),
};

class Graph extends PureComponent {
  static propTypes = {
    reportCode: PropTypes.string.isRequired,
    start: PropTypes.number.isRequired,
    end: PropTypes.number.isRequired,
    offset: PropTypes.number.isRequired,
  };

  constructor() {
    super();
    this.state = {
      data: null,
    };
  }

  componentDidMount() {
    this.load();
  }

  componentDidUpdate(prevProps) {
    if (
      prevProps.reportCode !== this.props.reportCode ||
      prevProps.start !== this.props.start ||
      prevProps.end !== this.props.end
    ) {
      this.load();
    }
  }

  load() {
    const { reportCode, start, end } = this.props;
    fetchWcl(`report/graph/resources/${reportCode}`, {
      start,
      end,
      abilityid: 1000,
    }).then((json) => {
      console.log('Received player health', json);
      this.setState({
        data: json,
      });
    });
  }

  render() {
    const data = this.state.data;
    if (!data) {
      return <div>Loading...</div>;
    }

    const { start, end, offset } = this.props;

    const players = data.series.filter((item) => Boolean(CLASS_CHART_LINE_COLORS[item.type]));

    const entities = [];

    players.forEach((series) => {
      const newSeries = {
        ...series,
        lastValue: 100, // fights start at full hp
        data: {},
      };

      series.data.forEach((item) => {
        const secIntoFight = Math.floor((item[0] - start) / 1000);

        const health = item[1];
        newSeries.data[secIntoFight] = Math.min(100, health);
      });
      entities.push(newSeries);
    });

    const deathsBySecond = {};
    if (this.state.data.deaths) {
      this.state.data.deaths.forEach((death) => {
        const secIntoFight = Math.floor((death.timestamp - start) / 1000);

        if (death.targetIsFriendly) {
          deathsBySecond[secIntoFight] = true;
        }
      });
    }

    const fightDurationSec = Math.ceil((end - start) / 1000);
    for (let i = 0; i <= fightDurationSec; i += 1) {
      entities.forEach((series) => {
        series.data[i] = series.data[i] !== undefined ? series.data[i] : series.lastValue;
        series.lastValue = series.data[i];
      });
      deathsBySecond[i] = deathsBySecond[i] !== undefined ? deathsBySecond[i] : undefined;
    }

    // transform data into react-vis format
    const playerHealth = entities.map((player) => {
      const data = Object.entries(player.data).map(([key, value]) => ({
        x: Number(key),
        y: value,
      }));
      return {
        title: player.name,
        backgroundColor: CLASS_CHART_LINE_COLORS[player.type],
        borderColor: CLASS_CHART_LINE_COLORS[player.type],
        data,
      };
    });
    const deaths = Object.entries(deathsBySecond)
      .filter(([, value]) => Boolean(value))
      .map(([key]) => ({ x: Number(key) }));

    return (
      <div className="graph-container">
        <RaidHealthChart
          players={playerHealth}
          deaths={deaths}
          startTime={start}
          endTime={end}
          offsetTime={offset}
        />
      </div>
    );
  }
}

export default Graph;
