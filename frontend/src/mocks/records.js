// Activity records. Shape follows `ActivityRecord` (sections hold only the selected types).
// Rules reflected here:
//  - draft: conductedOn may be null; status is 'draft'
//  - question category may be null only when the round stage is `considering` (even for drafts)
//  - record 8 was registered by the admin on behalf of student 2 (createdByUserId = 7)
//  - record 4 was last edited by an instructor
export const records = [
    // 1: student 1 / round 1 (rejected) / interview / completed
    {
        recordId: '1',
        companyId: '1',
        applicationRoundId: '1',
        ownerUserId: '1',
        createdByUserId: '1',
        lastEditedByUserId: '1',
        conductedOn: '2026/06/24',
        activityTypes: ['interview'],
        status: 'completed',
        sections: {
            interview: {
                durationMinutes: 30,
                interviewFormat: '個人面接（対面）',
                interviewerCount: 3,
                questions: [
                    {
                        category: '自己紹介・自己PR',
                        content: '1分程度で自己紹介をお願いします。',
                        answer: '学校での制作課題とチーム開発の経験を中心に話した。',
                        followUps: ['チーム開発での役割は何でしたか？'],
                    },
                    {
                        category: '志望動機・企業理解',
                        content: '当社を志望した理由を教えてください。',
                        answer: '',
                        followUps: [],
                    },
                ],
                impression:
                    '緊張したが、聞かれる内容は想定の範囲だった。志望動機の深掘りが厳しかった。',
                caution: '企業研究が浅いと感じさせると深掘りされる。',
                adviceToJuniors: '事業内容と最近のニュースは必ず調べておくと良い。',
            },
        },
    },
    // 2: student 1 / round 2 (inProgress) / interview / DRAFT (conductedOn null)
    {
        recordId: '2',
        companyId: '1',
        applicationRoundId: '2',
        ownerUserId: '1',
        createdByUserId: '1',
        lastEditedByUserId: '1',
        conductedOn: null,
        activityTypes: ['interview'],
        status: 'draft',
        sections: {
            interview: {
                durationMinutes: null,
                interviewFormat: null,
                interviewerCount: null,
                questions: [
                    {
                        category: '志望動機・企業理解',
                        content: '前回の応募から変わった点は？',
                        answer: '',
                        followUps: [],
                    },
                ],
                impression: '',
                caution: null,
                adviceToJuniors: null,
            },
        },
    },
    // 3: student 1 / round 3 (considering) / briefing / completed
    {
        recordId: '3',
        companyId: '3',
        applicationRoundId: '3',
        ownerUserId: '1',
        createdByUserId: '1',
        lastEditedByUserId: '1',
        conductedOn: '2026/10/15',
        activityTypes: ['briefing'],
        status: 'completed',
        sections: {
            briefing: {
                impression: '開発環境が整っていて、研修制度も手厚い印象。',
                newInfo: '新人研修は3か月。配属は本人の希望を考慮する。',
                keyPoints: '年間休日125日、リモート可の部署あり。',
                qa: 'Q. 使用言語は？ A. 主にJavaとTypeScript。',
            },
        },
    },
    // 4: student 1 / round 4 (offered) / interview + exam / completed (last edited by instructor)
    {
        recordId: '4',
        companyId: '5',
        applicationRoundId: '4',
        ownerUserId: '1',
        createdByUserId: '1',
        lastEditedByUserId: '5',
        conductedOn: '2026/08/20',
        activityTypes: ['interview', 'exam'],
        status: 'completed',
        sections: {
            interview: {
                durationMinutes: 45,
                interviewFormat: '個人面接（オンライン）',
                interviewerCount: 2,
                questions: [
                    {
                        category: 'IT技術・資格・制作',
                        content: '一番力を入れた制作物について教えてください。',
                        answer: 'クラウド上で動く在庫管理アプリを作った。',
                        followUps: ['なぜその構成にしましたか？', '改善したい点はありますか？'],
                    },
                    {
                        category: '課題解決・失敗経験',
                        content: '開発で失敗した経験とその対処を教えてください。',
                        answer: '',
                        followUps: [],
                    },
                    {
                        category: '将来像・働き方',
                        content: '5年後どうなっていたいですか？',
                        answer: 'クラウド設計ができるエンジニア。',
                        followUps: [],
                    },
                ],
                impression: '技術の話が中心で、普段の学習を見られている感じがした。',
                caution: null,
                adviceToJuniors: '制作物は設計の理由まで説明できるようにしておく。',
            },
            exam: {
                nameFormat: '適性検査（Web）',
                duration: 40,
                content: '言語・非言語、簡単なSQL穴埋め。',
                impression: '時間配分が難しかった。',
                difficulty: 'やや難しい',
                preparation: '市販の適性検査問題集を1冊解いた。',
                caution: '途中で戻れない形式。',
            },
        },
    },
    // 5: student 2 / round 5 (declined) / exam / completed
    {
        recordId: '5',
        companyId: '2',
        applicationRoundId: '5',
        ownerUserId: '2',
        createdByUserId: '2',
        lastEditedByUserId: '2',
        conductedOn: '2026/07/28',
        activityTypes: ['exam'],
        status: 'completed',
        sections: {
            exam: {
                nameFormat: '筆記試験（会場）',
                duration: 60,
                content: 'ネットワークの基礎（サブネット計算、TCP/IP）と一般常識。',
                impression: 'ネットワークの理解が問われる内容だった。',
                difficulty: '標準',
                preparation: null,
                caution: null,
            },
        },
    },
    // 6: student 2 / round 6 (considering) / briefing / completed
    {
        recordId: '6',
        companyId: '4',
        applicationRoundId: '6',
        ownerUserId: '2',
        createdByUserId: '2',
        lastEditedByUserId: '2',
        conductedOn: '2026/09/30',
        activityTypes: ['briefing'],
        status: 'completed',
        sections: {
            briefing: {
                impression: '少人数で距離が近く、若手に任せる文化。',
                newInfo: null,
                keyPoints: null,
                qa: null,
            },
        },
    },
    // 7: student 2 / round 6 (considering) / interview / DRAFT, category null allowed (considering)
    {
        recordId: '7',
        companyId: '4',
        applicationRoundId: '6',
        ownerUserId: '2',
        createdByUserId: '2',
        lastEditedByUserId: '2',
        conductedOn: null,
        activityTypes: ['interview'],
        status: 'draft',
        sections: {
            interview: {
                durationMinutes: 20,
                interviewFormat: null,
                interviewerCount: null,
                questions: [
                    {
                        category: null,
                        content: '見学の感想を聞かれた（カジュアル面談）',
                        answer: '',
                        followUps: [],
                    },
                ],
                impression: '',
                caution: null,
                adviceToJuniors: null,
            },
        },
    },
    // 8: student 2 / round 7 (inProgress) / interview / completed, registered by admin (proxy)
    {
        recordId: '8',
        companyId: '10',
        applicationRoundId: '7',
        ownerUserId: '2',
        createdByUserId: '7',
        lastEditedByUserId: '7',
        conductedOn: '2026/10/20',
        activityTypes: ['interview'],
        status: 'completed',
        sections: {
            interview: {
                durationMinutes: 25,
                interviewFormat: '集団面接',
                interviewerCount: 2,
                questions: [
                    {
                        category: '人柄・価値観',
                        content: 'あなたの長所と短所を教えてください。',
                        answer: '',
                        followUps: ['短所をどう改善していますか？'],
                    },
                    {
                        category: 'チームワーク・対人関係',
                        content: 'グループで意見が割れたときどうしますか？',
                        answer: '',
                        followUps: [],
                    },
                ],
                impression: '他の学生の回答を聞く時間があり、落ち着いて話せた。',
                caution: null,
                adviceToJuniors: null,
            },
        },
    },
    // 9: student 3 / round 8 (considering) / other / completed
    {
        recordId: '9',
        companyId: '8',
        applicationRoundId: '8',
        ownerUserId: '3',
        createdByUserId: '3',
        lastEditedByUserId: '3',
        conductedOn: '2026/10/28',
        activityTypes: ['other'],
        status: 'completed',
        sections: {
            other: {
                activityName: 'オフィス見学',
                content: '開発フロアと運用センターを見学し、社員の方と30分ほど話した。',
                impressionAdvice:
                    '実際の職場を見られて志望度が上がった。見学は早めに申し込むと良い。',
                keyPoints: '運用センターは24時間体制。',
            },
        },
    },
    // 10: student 4 (graduated) / round 9 (offered) / interview / completed (past year)
    {
        recordId: '10',
        companyId: '1',
        applicationRoundId: '9',
        ownerUserId: '4',
        createdByUserId: '4',
        lastEditedByUserId: '4',
        conductedOn: '2025/07/20',
        activityTypes: ['interview'],
        status: 'completed',
        sections: {
            interview: {
                durationMinutes: 35,
                interviewFormat: '個人面接（対面）',
                interviewerCount: 2,
                questions: [
                    {
                        category: '志望動機・企業理解',
                        content: '他社と比べて当社を選ぶ理由は？',
                        answer: '地元で長く働ける点と、技術研修が充実している点。',
                        followUps: ['他社の選考状況は？'],
                    },
                    {
                        category: '就職活動・選考状況',
                        content: '内定が出たら入社しますか？',
                        answer: 'はい。',
                        followUps: [],
                    },
                ],
                impression: '終始穏やかな雰囲気だった。',
                caution: '入社意思を明確に聞かれる。',
                adviceToJuniors: '第一志望なら、はっきり伝えると良い。',
            },
        },
    },
    // 11: student 4 (graduated) / round 10 (rejected) / exam / completed (past year)
    {
        recordId: '11',
        companyId: '6',
        applicationRoundId: '10',
        ownerUserId: '4',
        createdByUserId: '4',
        lastEditedByUserId: '4',
        conductedOn: '2025/07/05',
        activityTypes: ['exam'],
        status: 'completed',
        sections: {
            exam: {
                nameFormat: 'プログラミング試験（Web）',
                duration: 90,
                content: 'アルゴリズム問題2問（配列操作と文字列処理）。',
                impression: '時間が足りなかった。',
                difficulty: '難しい',
                preparation: '競技プログラミングの入門問題を解いておくと良い。',
                caution: null,
            },
        },
    },
];
