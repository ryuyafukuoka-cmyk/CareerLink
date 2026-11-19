// Region master. IDs 1-47 are prefectures, 48-55 are hiring areas.
// They are independent values: an area is never expanded into prefectures (and vice versa).
// Hokkaido is in the prefecture list, so there are 8 areas (not 9).

const PREFECTURE_NAMES = [
    '北海道',
    '青森県',
    '岩手県',
    '宮城県',
    '秋田県',
    '山形県',
    '福島県',
    '茨城県',
    '栃木県',
    '群馬県',
    '埼玉県',
    '千葉県',
    '東京都',
    '神奈川県',
    '新潟県',
    '富山県',
    '石川県',
    '福井県',
    '山梨県',
    '長野県',
    '岐阜県',
    '静岡県',
    '愛知県',
    '三重県',
    '滋賀県',
    '京都府',
    '大阪府',
    '兵庫県',
    '奈良県',
    '和歌山県',
    '鳥取県',
    '島根県',
    '岡山県',
    '広島県',
    '山口県',
    '徳島県',
    '香川県',
    '愛媛県',
    '高知県',
    '福岡県',
    '佐賀県',
    '長崎県',
    '熊本県',
    '大分県',
    '宮崎県',
    '鹿児島県',
    '沖縄県',
];

const AREA_NAMES = ['東北', '関東', '北陸・甲信越', '東海', '関西', '中国', '四国', '九州'];

export const PREFECTURE_ID_RANGE = Object.freeze({ min: 1, max: 47 });
export const AREA_ID_RANGE = Object.freeze({ min: 48, max: 55 });

// IDs are strings, like the API (Company.prefectures is string[]).
export const PREFECTURES = Object.freeze(
    PREFECTURE_NAMES.map((name, i) => Object.freeze({ id: String(i + 1), name })),
);
export const AREAS = Object.freeze(
    AREA_NAMES.map((name, i) => Object.freeze({ id: String(i + 48), name })),
);
export const REGIONS = Object.freeze([...PREFECTURES, ...AREAS]);

const REGION_NAME_BY_ID = new Map(REGIONS.map((r) => [r.id, r.name]));

export function getRegionName(id) {
    return REGION_NAME_BY_ID.get(String(id)) ?? '';
}

export function isPrefectureId(id) {
    const n = Number(id);
    return Number.isInteger(n) && n >= PREFECTURE_ID_RANGE.min && n <= PREFECTURE_ID_RANGE.max;
}

export function isAreaId(id) {
    const n = Number(id);
    return Number.isInteger(n) && n >= AREA_ID_RANGE.min && n <= AREA_ID_RANGE.max;
}

export function isRegionId(id) {
    return isPrefectureId(id) || isAreaId(id);
}
