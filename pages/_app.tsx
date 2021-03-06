import 'jsxgraph/distrib/jsxgraph.css';
import 'katex/dist/katex.css';
import type { AppProps } from 'next/app';
import 'tailwindcss/tailwind.css';

function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
export default MyApp;
