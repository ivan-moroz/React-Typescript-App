import { Head, Html, Main, NextScript } from 'next/document';
import Document, { type DocumentContext, type DocumentInitialProps } from 'next/document';
import ServerNavigation from '../features/navigation/ServerNavigation';
import { getServerNavigationProps } from '../lib/serverNavigation';

type NavigationDocumentProps = DocumentInitialProps & {
  navigation: { pathname: string; from: string; user: { name: string } | null; unreadCount: number };
};

export default function AppDocument({ navigation }: NavigationDocumentProps) {
  return (
    <Html lang="en">
      <Head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons" />
      </Head>
      <body>
        <ServerNavigation {...navigation} />
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}

AppDocument.getInitialProps = async (context: DocumentContext): Promise<NavigationDocumentProps> => {
  const initialProps = await Document.getInitialProps(context);
  context.res?.setHeader('Cache-Control', 'private, no-store');
  const asPath = context.asPath ?? '/';
  return {
    ...initialProps,
    navigation: await getServerNavigationProps(context.req, asPath),
  };
};
