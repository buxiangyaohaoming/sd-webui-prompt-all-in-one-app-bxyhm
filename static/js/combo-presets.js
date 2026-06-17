/**
 * Combo Presets — 推荐标签组合（50个）
 * Loaded before combo-manager.js, exposes window.COMBO_PRESETS
 */
(function() {
    'use strict';

    var PRESETS = [
        // === 性行为场景 ===
        { name: '打飞机（手淫）', tags: ['solo', 'masturbation', 'penis', 'hand_on_own_penis', 'looking_at_penis', 'nsfw'] },
        { name: '口交（舔阴茎）', tags: ['fellatio', 'oral', 'penis_in_mouth', 'deepthroat', 'tongue_out', 'looking_at_viewer', 'nsfw'] },
        { name: '舔阴（口交女）', tags: ['cunnilingus', 'pussy_lick', 'oral', 'tongue_out', 'spread_legs', 'nsfw'] },
        { name: '乳交', tags: ['paizuri', 'breasts', 'between_breasts', 'penis', 'large_breasts', 'nsfw'] },
        { name: '肛交', tags: ['anal', 'anal_sex', 'penis_in_ass', 'doggystyle', 'from_behind', 'nsfw'] },
        { name: '骑乘位', tags: ['cowgirl_position', 'riding', 'breasts', 'looking_at_viewer', 'nsfw'] },
        { name: '后入式', tags: ['doggystyle', 'from_behind', 'ass', 'looking_back', 'arms_supporting', 'nsfw'] },
        { name: '传教士体位', tags: ['missionary', 'on_back', 'spread_legs', 'breasts', 'looking_at_viewer', 'nsfw'] },
        { name: '颜射', tags: ['facial', 'cum_on_face', 'cum', 'cumshot', 'nsfw'] },
        { name: '体内射精', tags: ['internal_cumshot', 'cum_in_pussy', 'cum', 'creampie', 'nsfw'] },
        { name: '口内射精', tags: ['cum_in_mouth', 'cum', 'fellatio', 'oral', 'tongue_out', 'nsfw'] },
        { name: '中出', tags: ['creampie', 'cum_in_pussy', 'internal_cumshot', 'cum_drip', 'nsfw'] },
        { name: '女自慰', tags: ['solo', 'masturbation', 'fingering', 'pussy', 'spread_legs', 'nsfw'] },
        { name: '六九式', tags: ['69', 'fellatio', 'cunnilingus', 'couple', 'oral', 'nsfw'] },
        { name: '足交', tags: ['footjob', 'feet', 'sole', 'toes', 'sitting', 'nsfw'] },
        { name: '指交', tags: ['fingering', 'pussy', 'fingering_self', 'spread_legs', 'solo', 'nsfw'] },
        { name: '手交', tags: ['handjob', 'penis', 'hand_on_anothers_penis', 'looking_at_penis', 'nsfw'] },
        { name: '互相手淫', tags: ['mutual_masturbation', 'couple', 'penis', 'pussy', 'nsfw'] },
        { name: '多人群交', tags: ['threesome', 'orgy', 'group_sex', 'multiple_girls', 'nsfw'] },
        { name: '百合/女同', tags: ['yuri', 'two_girls', 'kissing', 'breasts', 'nsfw'] },
        { name: '触手', tags: ['tentacles', 'tentacle_sex', 'multiple_tentacles', 'nsfw'] },
        { name: '束缚/捆绑', tags: ['bound', 'bondage', 'rope', 'tied', 'restrained', 'nsfw'] },
        { name: '露出/户外性爱', tags: ['exhibitionism', 'outdoors', 'public', 'nude', 'sex', 'nsfw'] },

        // === 兽交 ===
        { name: '与马交配', tags: ['horse_penis', 'bestiality', 'horse', 'from_behind', 'nsfw'] },
        { name: '与狗交配', tags: ['dog', 'animal_penis', 'bestiality', 'from_behind', 'nsfw'] },
        { name: '兽交通用', tags: ['bestiality', 'animal_penis', 'nsfw'] },

        // === 视角/POV ===
        { name: 'POV第一人称', tags: ['pov', 'looking_at_viewer', 'penis', 'close-up', 'nsfw'] },
        { name: '俯视视角', tags: ['from_above', 'looking_down', 'breasts', 'downblouse', 'cleavage'] },
        { name: '仰视视角', tags: ['from_below', 'looking_up', 'upskirt', 'panties', 'skirt'] },

        // === 身体部位特写 ===
        { name: '胸部特写', tags: ['breasts', 'close-up', 'nipples', 'areolae', 'breast_focus', 'nsfw'] },
        { name: '臀部特写', tags: ['ass', 'close-up', 'ass_focus', 'panties', 'nsfw'] },
        { name: '阴部特写', tags: ['pussy', 'close-up', 'spread_legs', 'pussy_focus', 'nsfw'] },
        { name: '面部特写', tags: ['face', 'close-up', 'looking_at_viewer', 'detailed_face', 'detailed_eyes'] },
        { name: '足部特写', tags: ['feet', 'close-up', 'toes', 'soles', 'foot_focus'] },
        { name: '手部特写', tags: ['hands', 'close-up', 'fingers', 'hand_focus'] },
        { name: '阴茎特写', tags: ['penis', 'close-up', 'penis_focus', 'erection', 'nsfw'] },
        { name: '青筋阴茎', tags: ['veiny_penis', 'erection', 'penis', 'close-up', 'nsfw'] },

        // === 服装主题 ===
        { name: 'JK制服', tags: ['school_uniform', 'serafuku', 'pleated_skirt', 'thighhighs', '1girl'] },
        { name: '泳装', tags: ['swimsuit', 'bikini', 'pool', 'wet', 'outdoors', 'summer', '1girl'] },
        { name: '和服', tags: ['kimono', 'japanese_clothes', 'cherry_blossoms', 'traditional', '1girl'] },
        { name: '兔女郎', tags: ['bunny_girl', 'bunny_ears', 'leotard', 'fishnet', 'high_heels', '1girl'] },
        { name: '女仆装', tags: ['maid', 'maid_headdress', 'apron', 'frilled_skirt', 'lace', '1girl'] },
        { name: '旗袍', tags: ['china_dress', 'cheongsam', 'thigh_highs', 'high_heels', 'slit', '1girl'] },
        { name: '裸体', tags: ['completely_nude', 'nude', 'nipples', 'pussy', 'nsfw'] },
        { name: '透视装', tags: ['see-through', 'see-through_clothing', 'see-through_dress', 'nsfw', '1girl'] },

        // === SFW / 日常 ===
        { name: '单人肖像', tags: ['1girl', 'solo', 'portrait', 'looking_at_viewer', 'simple_background'] },
        { name: '户外风光', tags: ['1girl', 'outdoors', 'blue_sky', 'tree', 'grass', 'sunlight', 'masterpiece', 'best_quality'] },
        { name: '室内日常', tags: ['1girl', 'indoors', 'bedroom', 'bed', 'sitting', 'window', 'masterpiece'] },
        { name: '海滩少女', tags: ['1girl', 'beach', 'ocean', 'bikini', 'blue_sky', 'summer'] },
        { name: '校园场景', tags: ['1girl', 'school_uniform', 'classroom', 'desk', 'window', 'masterpiece'] },

        // === 质量增强 ===
        { name: '高质量基础', tags: ['masterpiece', 'best_quality', 'detailed', 'highres', 'absurdres', '1girl'] },
        { name: '写实风格', tags: ['photorealistic', 'realistic', 'detailed_face', 'detailed_eyes', '1girl'] },
        { name: '二次元风格', tags: ['1girl', 'anime_style', 'flat_color', 'simple_background', 'looking_at_viewer'] },
        { name: '负面提示词基础', tags: ['lowres', 'bad_anatomy', 'bad_hands', 'extra_fingers', 'missing_fingers', 'worst_quality', 'low_quality', 'normal_quality', 'jpeg_artifacts', 'signature', 'watermark'] },
    ];

    // Expose to combo-manager.js
    window.COMBO_PRESETS = PRESETS;
})();
