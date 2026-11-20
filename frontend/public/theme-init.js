// Runs before the page paints: sets <html data-theme="light|dark"> so there is no flash.
// Loaded with a plain <script src="/theme-init.js"></script> in the <head> (index.html and gallery.html).
// Preference is stored by src/theme/themeStore.js under the same key. No stored value = follow the OS.
(function () {
    var KEY = 'careerlink-theme';
    var query = window.matchMedia('(prefers-color-scheme: dark)');

    function stored() {
        try {
            var value = localStorage.getItem(KEY);
            return value === 'light' || value === 'dark' ? value : null;
        } catch (error) {
            return null;
        }
    }

    function apply() {
        var theme = stored() || (query.matches ? 'dark' : 'light');
        document.documentElement.setAttribute('data-theme', theme);
    }

    apply();
    // Follow OS changes live, but only while the user has not picked light / dark explicitly.
    query.addEventListener('change', function () {
        if (!stored()) apply();
    });
})();
