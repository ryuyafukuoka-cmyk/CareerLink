import { AREAS, PREFECTURES, getRegionName } from '@shared/definitions';
import Checkbox from '@/components/Checkbox/Checkbox.jsx';
import './RegionSelect.css';

const MAX_NAMES_IN_SUMMARY = 3;

// Text on the closed box, e.g. "三重県、愛知県 ほか2件".
function summarize(value) {
    if (value.length === 0) return '選択してください';
    const names = value.slice(0, MAX_NAMES_IN_SUMMARY).map(getRegionName).join('、');
    const rest = value.length - MAX_NAMES_IN_SUMMARY;
    return rest > 0 ? `${names} ほか${rest}件` : names;
}

// Multi-select for regions: hiring areas (48-55) and prefectures (1-47) in one box.
// They are independent values: choosing an area never selects prefectures.
// value: region IDs (string[]). onChange gets the new array, in ID order.
function RegionSelect({ value, onChange, disabled = false }) {
    function toggle(id) {
        const next = value.includes(id) ? value.filter((v) => v !== id) : [...value, id];
        onChange(next.sort((a, b) => Number(a) - Number(b)));
    }

    function renderGroup(title, regions) {
        return (
            <fieldset className="region-select__group">
                <legend className="region-select__legend">{title}</legend>
                <div className="region-select__options">
                    {regions.map((region) => (
                        <Checkbox
                            key={region.id}
                            label={region.name}
                            checked={value.includes(region.id)}
                            onChange={() => toggle(region.id)}
                            disabled={disabled}
                        />
                    ))}
                </div>
            </fieldset>
        );
    }

    return (
        <details className="region-select">
            <summary className="region-select__summary form-control">{summarize(value)}</summary>
            <div className="region-select__panel">
                {renderGroup('エリア採用', AREAS)}
                {renderGroup('都道府県', PREFECTURES)}
                {value.length > 0 && (
                    <button
                        type="button"
                        className="region-select__clear"
                        onClick={() => onChange([])}
                        disabled={disabled}
                    >
                        選択をすべて解除
                    </button>
                )}
            </div>
        </details>
    );
}

export default RegionSelect;
