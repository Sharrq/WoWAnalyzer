import Item from 'common/ITEMS/Item';

const items = {
  //region Arcane
  //endregion
  //region Fire
  HYPERTHREAD_WRISTWRAPS: {
    id: 168989,
    name: 'Hyperthread Wristwraps',
    icon: ' inv_bracer_cloth_kultirasdungeon_c_01',
    effectId: 300142,
  },
  //endregion
  //region Frost
  //endregion
  //region Shared
  //endregion
} satisfies Record<string, Item & { effectId?: number }>;
export default items;
