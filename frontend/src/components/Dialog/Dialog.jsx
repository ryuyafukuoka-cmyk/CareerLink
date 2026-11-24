import Overlay from '@/components/Overlay/Overlay.jsx';

// Centered form / content dialog over the current page. Props: see Overlay (without `variant`).
// size: 'sm' | 'md' (default) | 'lg'
function Dialog(props) {
    return <Overlay {...props} variant="dialog" />;
}

export default Dialog;
