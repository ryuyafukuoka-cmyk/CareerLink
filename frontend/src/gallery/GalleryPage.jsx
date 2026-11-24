import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { getMenuTree } from '@/auth/menuTree.js';
import BranchedMenu from '@/components/BranchedMenu/BranchedMenu.jsx';
import AnimatedNumber from '@/components/AnimatedNumber/AnimatedNumber.jsx';
import BorderGlow from '@/components/BorderGlow/BorderGlow.jsx';
import Breadcrumb from '@/components/Breadcrumb/Breadcrumb.jsx';
import Button from '@/components/Button/Button.jsx';
import Calendar from '@/components/Calendar/Calendar.jsx';
import Checkbox from '@/components/Checkbox/Checkbox.jsx';
import Combobox from '@/components/Combobox/Combobox.jsx';
import ConfirmDialog from '@/components/ConfirmDialog/ConfirmDialog.jsx';
import DatePicker from '@/components/DatePicker/DatePicker.jsx';
import Dialog from '@/components/Dialog/Dialog.jsx';
import Drawer from '@/components/Drawer/Drawer.jsx';
import DropdownMenu from '@/components/DropdownMenu/DropdownMenu.jsx';
import FuseButton from '@/components/FuseButton/FuseButton.jsx';
import FormField from '@/components/FormField/FormField.jsx';
import HoverCard from '@/components/HoverCard/HoverCard.jsx';
import InputGroup from '@/components/InputGroup/InputGroup.jsx';
import Loading from '@/components/Loading/Loading.jsx';
import Notice from '@/components/Notice/Notice.jsx';
import Progress from '@/components/Progress/Progress.jsx';
import RadioGroup from '@/components/RadioGroup/RadioGroup.jsx';
import StageTracker from '@/components/StageTracker/StageTracker.jsx';
import StatusMark from '@/components/StatusMark/StatusMark.jsx';
import TextInput from '@/components/TextInput/TextInput.jsx';
import ThemeToggle from '@/components/ThemeToggle/ThemeToggle.jsx';
import { toast } from '@/components/Toast/toast.js';
import { ROLES } from '@shared/definitions';
import './GalleryPage.css';

const COMPANIES = [
    { value: '1', label: '株式会社サンプル' },
    { value: '2', label: '三重システム開発株式会社' },
    { value: '3', label: 'ミエ・ネットワークス' },
    { value: '4', label: 'Tsu Cloud Inc.' },
    { value: '5', label: '津テクノ（募集終了）', disabled: true },
];

const STAGES = [
    { value: 'considering', label: '未応募・検討中', description: '応募前の説明会や検討段階' },
    { value: 'inProgress', label: '選考中・結果待ち', description: '面接や試験の最中' },
    { value: 'offered', label: '内定' },
];

const FONTS = [
    {
        value: "'Noto Sans JP'",
        label: 'Noto Sans JP',
        description: '標準的で読みやすい。ウェイト 400 / 500 / 700',
    },
    {
        value: "'Zen Maru Gothic'",
        label: 'Zen Maru Gothic',
        description: '丸ゴシック。やわらかい印象。400 / 500 / 700',
    },
    {
        value: "'Klee One'",
        label: 'Klee One',
        description: '手書き風の教科書体。400 / 600 のみ（太字は 600）',
    },
];
const FONT_FALLBACK = ", 'Hiragino Sans', 'Yu Gothic UI', Meiryo, sans-serif";

const SWATCHES = [
    ['--color-primary', 'primary'],
    ['--primary', 'raw primary'],
    ['--secondary', 'raw secondary'],
    ['--accent', 'raw accent'],
    ['--color-danger', 'danger'],
    ['--color-success', 'success'],
    ['--color-warning', 'warning'],
    ['--color-info', 'info'],
    ['--color-bg', 'bg'],
    ['--color-surface', 'surface'],
    ['--color-surface-alt', 'surface-alt'],
    ['--color-border-strong', 'border-strong'],
];

function Section({ title, children }) {
    return (
        <section className="gallery__section">
            <h2 className="gallery__heading">{title}</h2>
            {children}
        </section>
    );
}

// One theme, forced on a wrapper (data-theme), so light and dark can be compared side by side.
// Overlays render in <body>, so they follow the page theme (use the toggle at the top).
function ThemeFrame({ theme, label }) {
    return (
        <div className="gallery__theme-frame" data-theme={theme}>
            <strong>{label}</strong>
            <BranchedMenu items={getMenuTree(ROLES.ADMIN)} />
            <div className="gallery__row">
                <Button>保存</Button>
                <Button variant="secondary">キャンセル</Button>
                <Button variant="danger">削除</Button>
            </div>
            <Notice message="企業を登録しました。" />
            <Notice tone="error" message="保存できませんでした。入力内容は保持されています。" />
            <FormField label="企業名" required error="企業名を入力してください。">
                <TextInput />
            </FormField>
        </div>
    );
}

function GalleryPage() {
    const [company, setCompany] = useState('');
    const [date, setDate] = useState('');
    const [calendarDate, setCalendarDate] = useState('2026/11/20');
    const [stage, setStage] = useState('considering');
    const [done, setDone] = useState(2);
    const [count, setCount] = useState(12);
    const [checked, setChecked] = useState(false);
    const [fuseLog, setFuseLog] = useState('まだ実行されていません');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [stackedOpen, setStackedOpen] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [draft, setDraft] = useState('');
    const [font, setFont] = useState(FONTS[0]?.value ?? '');

    function changeFont(next) {
        setFont(next);
        document.documentElement.style.setProperty('--font-family-base', next + FONT_FALLBACK);
    }

    return (
        <main className="gallery">
            <div className="gallery__top">
                <h1>UI gallery（開発用）</h1>
                <ThemeToggle />
            </div>

            <Section title="Colors（ライト / ダークで見比べる）">
                <div className="gallery__swatches">
                    {SWATCHES.map(([variable, name]) => (
                        <div key={variable} className="gallery__swatch">
                            <span
                                className="gallery__chip"
                                style={{ background: `var(${variable})` }}
                            />
                            {name}
                        </div>
                    ))}
                </div>
                <div className="gallery__row">
                    <Button>primary</Button>
                    <Button variant="secondary">secondary</Button>
                    <Button variant="danger">danger</Button>
                    <Button disabled>disabled</Button>
                </div>
                <p>
                    本文テキスト <span className="gallery__muted">補足テキスト（muted）</span>
                </p>
            </Section>

            <Section title="Toast">
                <div className="gallery__row">
                    <Button onClick={() => toast.success('企業を登録しました。')}>success</Button>
                    <Button
                        variant="danger"
                        onClick={() =>
                            toast.error('保存できませんでした。入力内容は保持されています。')
                        }
                    >
                        error
                    </Button>
                    <Button variant="secondary" onClick={() => toast.info('画面を更新しました。')}>
                        info
                    </Button>
                    <Button variant="secondary" onClick={() => toast.dismiss()}>
                        すべて閉じる
                    </Button>
                </div>
            </Section>

            <Section title="Combobox（日本語入力でEnter確定しても選択されない）">
                <FormField label="企業" required hint="「みえ」「mie」などで絞り込み">
                    <Combobox options={COMPANIES} value={company} onChange={setCompany} clearable />
                </FormField>
                <p>選択値: {company || '（なし）'}</p>
            </Section>

            <Section title="DatePicker / Calendar">
                <FormField
                    label="実施日"
                    hint="全角や「-」「.」区切りでも、フォーカスを外すと整います"
                >
                    <DatePicker value={date} onChange={setDate} max="2026/12/31" />
                </FormField>
                <p>値: {date || '（なし）'}</p>
                <div className="gallery__calendar">
                    <Calendar
                        value={calendarDate}
                        onSelect={setCalendarDate}
                        min="2026/11/10"
                        showToday
                    />
                </div>
            </Section>

            <Section title="Breadcrumb">
                <Breadcrumb
                    items={[
                        { label: 'ホーム', to: '/' },
                        { label: '企業一覧', to: '/companies' },
                        { label: '株式会社サンプル' },
                    ]}
                />
            </Section>

            <Section title="Signature: StatusMark / StageTracker">
                <div className="gallery__row">
                    <StatusMark status="considering" />
                    <StatusMark status="inProgress" />
                    <StatusMark status="offered" />
                    <StatusMark status="rejected" />
                    <StatusMark status="declined" />
                    <StatusMark status="draft" />
                    <StatusMark status="completed" />
                    <StatusMark status="inProgress" size="sm" />
                </div>
                <StageTracker stage={stage} />
                <RadioGroup
                    orientation="horizontal"
                    value={stage}
                    onChange={setStage}
                    options={[
                        { value: 'considering', label: '検討中' },
                        { value: 'inProgress', label: '選考中' },
                        { value: 'offered', label: '内定' },
                        { value: 'rejected', label: '落選' },
                        { value: 'declined', label: '辞退' },
                    ]}
                />
            </Section>

            <Section title="Signature: FuseButton / AnimatedNumber / BorderGlow">
                <div className="gallery__row">
                    <FuseButton onConfirm={() => setFuseLog('実行されました')}>削除する</FuseButton>
                    <FuseButton variant="primary" onConfirm={() => setFuseLog('公開しました')}>
                        記入完了
                    </FuseButton>
                    <span>{fuseLog}</span>
                </div>
                <div className="gallery__row">
                    <Button variant="secondary" onClick={() => setCount((n) => n + 37)}>
                        ＋37
                    </Button>
                    <Button variant="secondary" onClick={() => setCount(0)}>
                        0
                    </Button>
                    <span>
                        関連する活動記録 <AnimatedNumber value={count} /> 件
                    </span>
                </div>
                <BorderGlow className="gallery__glow">
                    最新の応募回（光は画面に1か所だけ）
                </BorderGlow>
            </Section>

            <Section title="Signature: Checkbox / RadioGroup / Loading">
                <Checkbox
                    label="公式サイトなし"
                    checked={checked}
                    onChange={(event) => setChecked(event.target.checked)}
                />
                <Checkbox label="無効の例" disabled checked readOnly />
                <Loading message="読み込み中…" />
            </Section>

            <Section title="Progress">
                <Progress label="選考の進み具合" segments={5} value={done} showValue />
                <Progress label="入力の完了度" value={60} showValue tone="success" />
                <div className="gallery__row">
                    <Button variant="secondary" onClick={() => setDone((n) => Math.max(0, n - 1))}>
                        −
                    </Button>
                    <Button variant="secondary" onClick={() => setDone((n) => Math.min(5, n + 1))}>
                        ＋
                    </Button>
                </div>
            </Section>

            <Section title="DropdownMenu">
                <DropdownMenu
                    align="start"
                    items={[
                        { label: '編集', icon: Pencil, onSelect: () => toast.info('編集') },
                        { label: '企業一覧へ', to: '/companies' },
                        { separator: true },
                        {
                            label: '削除',
                            icon: Trash2,
                            danger: true,
                            onSelect: () => toast.error('削除'),
                        },
                        { label: '使えない項目', disabled: true },
                    ]}
                >
                    操作 ▾
                </DropdownMenu>
            </Section>

            <Section title="HoverCard">
                <HoverCard content="三重県津市。公開済みの記録は3件です。">
                    <a href="#gallery">株式会社サンプル</a>
                </HoverCard>
            </Section>

            <Section title="Font（全体に反映）">
                <FormField label="フォント" group>
                    <RadioGroup options={FONTS} value={font} onChange={changeFont} variant="card" />
                </FormField>
                <h3>就職活動の記録 CareerLink 2026</h3>
                <p>
                    面接では志望動機と自己PRを聞かれました。試験時間は45分、出題内容はSPIと
                    プログラミングの基礎です。0123456789 ABCabc
                </p>
                <p style={{ fontWeight: 'var(--font-weight-medium)' }}>
                    Medium（500）：応募企業・選考進捗
                </p>
                <p style={{ fontWeight: 'var(--font-weight-bold)' }}>
                    Bold（700）：活動記録を登録する
                </p>
            </Section>

            <Section title="Light / Dark（並べて比較）">
                <div className="gallery__themes">
                    <ThemeFrame theme="light" label="Light" />
                    <ThemeFrame theme="dark" label="Dark" />
                </div>
            </Section>

            <Section title="Dialog / Drawer（hover UI）">
                <div className="gallery__row">
                    <Button variant="secondary" onClick={() => setDialogOpen(true)}>
                        Dialog
                    </Button>
                    <Button variant="secondary" onClick={() => setDrawerOpen(true)}>
                        Drawer（未保存あり）
                    </Button>
                    <Button variant="secondary" onClick={() => setConfirmOpen(true)}>
                        ConfirmDialog
                    </Button>
                </div>
                <Dialog
                    open={dialogOpen}
                    title="企業を登録"
                    onClose={() => setDialogOpen(false)}
                    footer={
                        <>
                            <Button variant="secondary" onClick={() => setDialogOpen(false)}>
                                キャンセル
                            </Button>
                            <Button onClick={() => setDialogOpen(false)}>保存</Button>
                        </>
                    }
                >
                    <FormField label="企業名" required>
                        <TextInput placeholder="株式会社サンプル" />
                    </FormField>
                </Dialog>
                <Drawer
                    open={drawerOpen}
                    title="活動記録を登録"
                    size="lg"
                    dirty={draft !== ''}
                    onClose={() => {
                        setDrawerOpen(false);
                        setDraft('');
                    }}
                    footer={
                        <>
                            <Button variant="secondary" onClick={() => setStackedOpen(true)}>
                                応募回を登録（重ねて開く）
                            </Button>
                            <Button onClick={() => setDrawerOpen(false)}>下書き保存</Button>
                        </>
                    }
                >
                    <FormField label="所感（入力すると、閉じるとき破棄の確認が出る）">
                        <TextInput value={draft} onChange={(e) => setDraft(e.target.value)} />
                    </FormField>
                </Drawer>
                <Dialog
                    open={stackedOpen}
                    size="sm"
                    title="応募回を登録"
                    onClose={() => setStackedOpen(false)}
                    footer={<Button onClick={() => setStackedOpen(false)}>保存</Button>}
                >
                    <p>下のドロワーは入力を保ったまま、少し奥に下がります。</p>
                </Dialog>
                <ConfirmDialog
                    open={confirmOpen}
                    title="削除の確認"
                    message="削除すると元に戻せません。よろしいですか？"
                    variant="danger"
                    confirmLabel="削除"
                    onConfirm={() => setConfirmOpen(false)}
                    onCancel={() => setConfirmOpen(false)}
                />
            </Section>

            <Section title="InputGroup">
                <FormField label="公式サイトURL">
                    <InputGroup start="https://" end=".co.jp">
                        <TextInput placeholder="example" />
                    </InputGroup>
                </FormField>
            </Section>

            <Section title="RadioGroup">
                <FormField label="選考段階（default）" group>
                    <RadioGroup options={STAGES} value={stage} onChange={setStage} />
                </FormField>
                <FormField label="選考段階（card）" group>
                    <RadioGroup options={STAGES} value={stage} onChange={setStage} variant="card" />
                </FormField>
            </Section>
        </main>
    );
}

export default GalleryPage;
