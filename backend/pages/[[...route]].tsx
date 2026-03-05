import type { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import Head from 'next/head';
import Link from 'next/link';

type FrontendRoute = '/' | '/todo' | '/select' | '/table' | '/calculator';

type Props = {
  route: FrontendRoute;
  notFound: boolean;
};

const frontendRoutes: FrontendRoute[] = ['/', '/todo', '/select', '/table', '/calculator'];

export const getServerSideProps: GetServerSideProps<Props> = async ({ params, res }) => {
  const routeParts = Array.isArray(params?.route) ? params.route : [];
  const route = (`/${routeParts.join('/')}` || '/') as FrontendRoute;

  const isSupportedRoute = frontendRoutes.includes(route);

  if (!isSupportedRoute) {
    res.statusCode = 404;
  }

  return {
    props: {
      route: isSupportedRoute ? route : '/',
      notFound: !isSupportedRoute,
    },
  };
};

export default function FrontendRouteProxyPage({
  route,
  notFound,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <>
      <Head>
        <title>Frontend route: {route}</title>
      </Head>

      <main style={{ fontFamily: 'Arial, sans-serif', padding: 24 }}>
        <h1>Next.js Backend Routes</h1>
        <p>
          {notFound
            ? 'Маршрут не знайдено у фронтенд-роутінгу.'
            : `Маршрут \"${route}\" підтримується та відповідає фронтенд-роутінгу.`}
        </p>

        <nav style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 16 }}>
          {frontendRoutes.map((frontendRoute) => (
            <Link key={frontendRoute} href={frontendRoute}>
              {frontendRoute}
            </Link>
          ))}
        </nav>
      </main>
    </>
  );
}
