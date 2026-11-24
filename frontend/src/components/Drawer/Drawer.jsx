import Overlay from '@/components/Overlay/Overlay.jsx';

// Full-height side panel over the current page, for large forms (for example the record form).
// Props: see Overlay (without `variant`). size: 'sm' | 'md' (default) | 'lg'
function Drawer(props) {
    return <Overlay {...props} variant="drawer" />;
}

export default Drawer;
