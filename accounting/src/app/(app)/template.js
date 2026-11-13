// A template re-mounts on every navigation, which replays the page entrance animation.
export default function Template({ children }) {
  return <div className="page-enter">{children}</div>;
}
