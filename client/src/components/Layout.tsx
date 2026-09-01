import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="app-layout">
      <div className="content-layer">{children}</div>
    </div>
  );
}
