import { useParams } from 'react-router-dom';
import './PlaceholderPage.css';

// Stand-in for a screen that is not built yet. Shows the screen ID, name, path and URL params.
function PlaceholderPage({ screen }) {
    const params = useParams();
    const paramEntries = Object.entries(params);

    return (
        <main className="placeholder-page">
            <p className="placeholder-page__id">{screen.screenId}</p>
            <h1>{screen.name}</h1>
            <dl className="placeholder-page__info">
                <dt>パス</dt>
                <dd>{screen.path}</dd>
                {paramEntries.map(([key, value]) => (
                    <div key={key} className="placeholder-page__param">
                        <dt>{key}</dt>
                        <dd>{value}</dd>
                    </div>
                ))}
            </dl>
            <p className="placeholder-page__note">この画面はまだ作成中です。</p>
        </main>
    );
}

export default PlaceholderPage;
