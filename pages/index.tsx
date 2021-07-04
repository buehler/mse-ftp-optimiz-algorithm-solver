import Head from 'next/head';
import Link from 'next/link';

export default function Home() {
  return (
    <div>
      <Head>
        <title>Optimization Algorithm Solver</title>
      </Head>

      <main className="container mx-auto my-12">
        <ul>
          <li>
            <span>Knapsack Branch And Bound: </span>
            <Link href="/branch-and-bound">
              <a className="underline text-center text-blue-500">B&amp;B Solver</a>
            </Link>
          </li>
        </ul>
      </main>
    </div>
  );
}
