import { useState } from 'react';
import { Plus } from 'lucide-react';

// Optional inputs kept out of sight until the person asks for them, so a card only shows what is
// needed. It starts open when the fields already hold input (editing, or restored form) and stays
// open once opened, so typing never makes it collapse. An input error forces it open.
//
// label:     what the toggle offers, e.g. "回答・深掘り質問"
// hasValue:  true when any of the optional inputs is already filled (read once, on mount)
// hasError:  true when any of them has an error
function OptionalFields({ label, hasValue = false, hasError = false, children }) {
    const [opened, setOpened] = useState(hasValue);
    const shown = opened || hasError;

    if (!shown) {
        return (
            <button
                type="button"
                className="record-optional__toggle"
                onClick={() => setOpened(true)}
            >
                <Plus size={16} aria-hidden="true" />
                {label}を追加（任意）
            </button>
        );
    }
    return <div className="record-optional">{children}</div>;
}

export default OptionalFields;
