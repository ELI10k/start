// The root loading fallback is also the cold-launch screen of the installed
// iOS web app. Keep it independent from the destination's responsive grid: on
// a cold WebKit launch the shell and its media queries can be painted in
// separate frames, which briefly squeezed the home skeleton against the RTL
// edge before the final layout was ready.
//
// Not a <main>. It can be rendered beside a route's own main landmark while
// that route streams, so this is a status overlay rather than document content.
export default function ClientLoading() {
  return (
    <div role="status" aria-busy="true" aria-label="טוענים את LIFE FIT…" className="app-launch-loading">
      <div className="app-launch-loading__brand" aria-hidden="true">
        <span className="app-launch-loading__icon" />
        <strong>LIFE FIT</strong>
        <span className="app-launch-loading__indicator" />
      </div>
    </div>
  );
}
