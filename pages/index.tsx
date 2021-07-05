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
          <li>
            <span>Two dimensional simplex algorithm: </span>
            <Link href="/two-dim-simplex">
              <a className="underline text-center text-blue-500">2d Simplex</a>
            </Link>
          </li>
          <li>
            <span>Spanning Tree (Prim / Kruskal / Djikstra): </span>
            <Link href="/spanning-tree">
              <a className="underline text-center text-blue-500">MST / Graphs</a>
            </Link>
          </li>
          <li>
            <span>Floyd-Warshall (undirected / directed): </span>
            <Link href="/floyd-warshall">
              <a className="underline text-center text-blue-500">floyd warshall</a>
            </Link>
          </li>
        </ul>
      </main>
    </div>
  );
}
