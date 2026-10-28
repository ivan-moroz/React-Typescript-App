import type { AppProps } from 'next/app';
import { ModalProvider } from '../../src/components/modal/ModalProvider';
import '../../src/styles/index.scss';
import '../../src/styles/App.scss';
import '../styles/assets.scss';
import '../features/users/styles/styles.scss';
import '../../src/components/modal/styles/styles.scss';
import '../../src/components/select/styles/styles.scss';
import '../../src/components/navigation/styles/styles.scss';

export default function App({ Component, pageProps, router }: AppProps) {
  const ssrPage = router.pathname === '/assets' || router.pathname === '/users';
  if (!ssrPage) return <Component {...pageProps} />;
  const from = encodeURIComponent(router.asPath);
  return <ModalProvider>
    <nav>
      {Object.entries({ '/': 'Home', '/todo': 'ToDo', '/select': 'Select', '/calculator': 'Calculator', '/puzzle': 'Puzzle', '/users': 'Users', '/assets': 'Assets' }).map(([href, label]) =>
        <a key={href} href={href} aria-current={router.pathname === href ? 'page' : undefined} style={{ fontWeight: router.pathname === href ? 'bold' : 'normal' }}>{label}</a>)}
      {pageProps.initialUser ? <div className="authenticated-user"><b>{pageProps.initialUser.name}</b><button type="button" onClick={async () => {
        const response = await fetch('/api/auth/logout', { method: 'POST' });
        if (!response.ok) return;
        sessionStorage.removeItem('authenticatedUser');
        window.location.assign(`/login?from=${from}`);
      }}>Log out</button></div> : <a href={`/login?from=${from}`}>Login</a>}
    </nav>
    <div className="page-wrapper"><Component {...pageProps} /></div>
  </ModalProvider>;
}
