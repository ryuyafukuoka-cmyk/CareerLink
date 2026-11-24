import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import '@/index.css';
import GalleryPage from './GalleryPage.jsx';

// Dev-only entry: open http://localhost:5173/gallery.html. Delete src/gallery and gallery.html before the freeze.
createRoot(document.getElementById('root')).render(
    <StrictMode>
        <MemoryRouter initialEntries={['/records/new']}>
            <GalleryPage />
        </MemoryRouter>
    </StrictMode>,
);
