import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import Breadcrumb from '@/components/Breadcrumb/Breadcrumb.jsx';
import Button from '@/components/Button/Button.jsx';
import Calendar from '@/components/Calendar/Calendar.jsx';
import Combobox from '@/components/Combobox/Combobox.jsx';
import DatePicker from '@/components/DatePicker/DatePicker.jsx';
import DropdownMenu from '@/components/DropdownMenu/DropdownMenu.jsx';
import FormField from '@/components/FormField/FormField.jsx';
import HoverCard from '@/components/HoverCard/HoverCard.jsx';
import InputGroup from '@/components/InputGroup/InputGroup.jsx';
import Progress from '@/components/Progress/Progress.jsx';
import RadioGroup from '@/components/RadioGroup/RadioGroup.jsx';
import TextInput from '@/components/TextInput/TextInput.jsx';
import ThemeToggle from '@/components/ThemeToggle/ThemeToggle.jsx';
import { toast } from '@/components/Toast/toast.js';
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

function GalleryPage() {
    const [company, setCompany] = useState('');
    const [date, setDate] = useState('');
    const [calendarDate, setCalendarDate] = useState('2026/11/20');
    const [stage, setStage] = useState('considering');
    const [done, setDone] = useState(2);

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
