import { describe, expect, it } from 'vitest';
import { defaultToolPreferences, normalizeToolPreferences } from './toolPreferences';

describe('常用工具偏好', () => {
  it('首次使用采用简单且稳定的默认设置', () => {
    expect(normalizeToolPreferences(undefined)).toEqual(defaultToolPreferences);
  });

  it('保留时间口径、观测地点和常用排法', () => {
    expect(normalizeToolPreferences({
      instantTimeStandard: 'true-solar',
      instantObserver: {
        regionKey: '440106',
        provinceId: '44',
        cityId: '4401',
        regionId: '440106',
        locationName: '广东省 广州市 天河区',
        latitude: 23.1291,
        longitude: 113.2644,
        timezone: 8,
      },
      qimenScope: 'day',
      qimenLayout: 'feipan',
      qimenJuMethod: 'zhirun',
      taiyiScope: 'hour',
      huangjiMode: 'date',
    })).toEqual({
      instantTimeStandard: 'true-solar',
      instantObserver: {
        regionKey: '440106',
        provinceId: '44',
        cityId: '4401',
        regionId: '440106',
        locationName: '广东省 广州市 天河区',
        latitude: '23.1291',
        longitude: '113.2644',
        timezone: '8',
      },
      qimenScope: 'day',
      qimenLayout: 'feipan',
      qimenJuMethod: 'zhirun',
      taiyiScope: 'hour',
      huangjiMode: 'date',
    });
  });

  it('损坏字段单独回退，且不会恢复无效地点', () => {
    expect(normalizeToolPreferences({
      instantTimeStandard: 'local',
      instantObserver: { locationName: '未知地点', latitude: '', longitude: 'x', timezone: 8 },
      qimenScope: 'week',
      qimenLayout: 'feipan',
      qimenJuMethod: null,
      taiyiScope: 'day',
      huangjiMode: 'date',
    })).toEqual({
      ...defaultToolPreferences,
      qimenLayout: 'feipan',
      taiyiScope: 'day',
      huangjiMode: 'date',
    });
  });
});
