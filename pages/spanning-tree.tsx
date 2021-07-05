import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
import { Graph } from 'react-d3-graph';

const math = require('mathjs');

type Vertex = {
  id: string;
};

type Edge = {
  source: string;
  target: string;
  label: string;
} & { [prop: string]: any };

type GraphData = {
  nodes: Vertex[];
  links: Edge[];
};

class UnionFind {
  private count: number;
  private parent: { [id: string]: string } = {};

  constructor(nodes: string[]) {
    // Number of disconnected components
    this.count = nodes.length;

    // Initialize the data structure such that all
    // elements have themselves as parents
    nodes.forEach((e) => (this.parent[e] = e));
  }

  union(a: string, b: string) {
    let rootA = this.find(a);
    let rootB = this.find(b);

    // Roots are same so these are already connected.
    if (rootA === rootB) {
      return;
    }

    // Always make the element with smaller root the parent.
    if (rootA < rootB) {
      if (this.parent[b] != b) {
        this.union(this.parent[b], a);
      }
      this.parent[b] = this.parent[a];
    } else {
      if (this.parent[a] != a) {
        this.union(this.parent[a], b);
      }
      this.parent[a] = this.parent[b];
    }
  }

  // Returns final parent of a node
  find(a: string) {
    while (this.parent[a] !== a) {
      a = this.parent[a];
    }

    return a;
  }

  // Checks connectivity of the 2 nodes
  connected(a: string, b: string) {
    return this.find(a) === this.find(b);
  }
}

const graphConfig = {
  initialZoom: 2,
  link: {
    renderLabel: true,
    color: '#90b4ce',
  },
  node: {
    color: '#3da9fc',
  },
};

const demoAdjacency: number[][] = [
  [0, 7, 5, 2, 12, 0, 0, 0],
  [7, 0, 0, 4, 3, 0, 14, 0],
  [5, 0, 0, 15, 0, 13, 0, 0],
  [2, 4, 15, 0, 0, 9, 0, 11],
  [12, 3, 0, 0, 0, 0, 10, 6],
  [0, 0, 13, 9, 0, 0, 0, 1],
  [0, 14, 0, 0, 10, 0, 0, 8],
  [0, 0, 0, 11, 6, 1, 8, 0],
];

const getCharacter = (number: number) => String.fromCharCode(65 + number);

function createGraphData(adjacencyMatrix: number[][]): GraphData {
  const nodes = adjacencyMatrix[0].map((_, i) => ({ id: getCharacter(i) }));
  const links = [] as Edge[];

  for (let row = 0; row < adjacencyMatrix.length; row++) {
    for (let col = 0; col < adjacencyMatrix[row].length; col++) {
      if (col <= row || adjacencyMatrix[row][col] <= 0) {
        // ignore self link & "lower half" of matrix & 0 links
        continue;
      }

      links.push({
        source: getCharacter(row),
        target: getCharacter(col),
        label: adjacencyMatrix[row][col].toString(),
      });
    }
  }

  return {
    nodes,
    links,
  };
}

function calculatePrimsAlgorithm(startNode: string, { nodes, links }: GraphData): GraphData {
  const primNodes = nodes.map((n) => ({ id: `prim_${n.id}` }));
  const primLinks = links.map((l) => ({ ...l, source: `prim_${l.source}`, target: `prim_${l.target}` }));

  const newLinks = [] as Edge[];
  const visited = [`prim_${startNode}`];

  while (primNodes.map(({ id }) => id).some((node) => !visited.includes(node))) {
    const possibleLinks = primLinks
      .filter(
        (link) =>
          (visited.includes(link.target) && !visited.includes(link.source)) ||
          (!visited.includes(link.target) && visited.includes(link.source))
      )
      .filter((link) => !newLinks.includes(link));
    if (possibleLinks.length <= 0) {
      console.warn('no possible links found. abort.');
      return {
        nodes: primNodes,
        links: primLinks,
      };
    }

    const nextLink = possibleLinks.sort((left, right) => parseInt(left.label, 10) - parseInt(right.label, 10)).shift();
    if (!nextLink) {
      console.warn('no next links found. abort.');
      return {
        nodes: primNodes,
        links: primLinks,
      };
    }
    newLinks.push(nextLink);

    if (!visited.includes(nextLink.source)) {
      visited.push(nextLink.source);
    }
    if (!visited.includes(nextLink.target)) {
      visited.push(nextLink.target);
    }
  }

  return {
    nodes: primNodes,
    links: [
      ...newLinks.map((link) => ({
        ...link,
        color: '#ef4565',
      })),
      ...primLinks
        .filter((l) => !newLinks.includes(l))
        .map((link) => ({
          ...link,
          opacity: 0.4,
        })),
    ],
  };
}

function calculateKruskalsAlgorithm({ nodes, links }: GraphData): GraphData {
  const kruskalNodes = nodes.map((n) => ({ id: `kruskal_${n.id}` }));
  const kruskalLinks = links
    .map((l) => ({ ...l, source: `kruskal_${l.source}`, target: `kruskal_${l.target}` }))
    .sort((left, right) => parseInt(left.label, 10) - parseInt(right.label, 10));

  const newLinks = [] as Edge[];
  const oldLinks = [] as Edge[];

  const unionFind = new UnionFind(kruskalNodes.map((n) => n.id));

  while (kruskalLinks.length > 0) {
    const cheapestLink = kruskalLinks.shift();

    if (!cheapestLink) {
      console.warn('no link found');
      return {
        nodes: kruskalNodes,
        links: kruskalLinks,
      };
    }

    if (unionFind.connected(cheapestLink.source, cheapestLink.target)) {
      oldLinks.push(cheapestLink);
    } else {
      unionFind.union(cheapestLink.source, cheapestLink.target);
      newLinks.push(cheapestLink);
    }
  }

  console.log(newLinks);

  return {
    nodes: kruskalNodes,
    links: [
      ...newLinks.map((link) => ({
        ...link,
        color: '#ef4565',
      })),
      ...oldLinks.map((link) => ({
        ...link,
        opacity: 0.4,
      })),
    ],
  };
}

export default function SpanningTreeSolver() {
  const [adjacencyMatrix, setAdjacencyMatrix] = useState<number[][]>(math.zeros(4, 4).toArray());
  const [startNode, setStartNode] = useState<string>('A');

  const graphData = createGraphData(adjacencyMatrix);
  const primGraphData = calculatePrimsAlgorithm(startNode, graphData);
  const kruskalsGraphData = calculateKruskalsAlgorithm(graphData);

  return (
    <div>
      <Head>
        <title>Spanning Tree Solver</title>
      </Head>

      <main className="container mx-auto my-12">
        <h1 className="text-xl text-center mb-12">Spanning Tree Solver</h1>
        <div className="text-center mb-12">
          <Link href="/">
            <a className="underline text-center text-blue-500">back</a>
          </Link>
        </div>
        <div className="text-center mb-12">
          <h5 className="text-lg text-center mb-8">Adjacency Matrix</h5>
          <div className="mb-8">
            <button
              className="inline-block mx-4 px-2 py-1 rounded bg-green-300 hover:bg-green-700 hover:text-white transition-colors duration-150"
              onClick={() => {
                const m = math.matrix(adjacencyMatrix);
                const newsize = m.size()[0] + 1;
                setAdjacencyMatrix(m.resize([newsize, newsize]).toArray());
              }}
            >
              add node
            </button>
            <button
              className="inline-block mx-4 px-2 py-1 rounded bg-red-300 hover:bg-red-700 hover:text-white transition-colors duration-150"
              onClick={() => {
                const m = math.matrix(adjacencyMatrix);
                const newsize = m.size()[0] - 1;
                if (newsize <= 1) {
                  return;
                }
                setAdjacencyMatrix(m.resize([newsize, newsize]).toArray());
              }}
            >
              remove last node
            </button>
            <button
              className="inline-block mx-4 px-2 py-1 rounded bg-blue-300 hover:bg-blue-700 hover:text-white transition-colors duration-150"
              onClick={() => setAdjacencyMatrix(demoAdjacency)}
            >
              show demo graph
            </button>
          </div>
          <div>
            <table className="mx-auto">
              <thead>
                <tr>
                  {[0, ...adjacencyMatrix[0]].map((_, index) => (
                    <td key={'adj_matrix_input_head_' + index}>{index === 0 ? '' : getCharacter(index - 1)}</td>
                  ))}
                </tr>
              </thead>
              <tbody>
                {adjacencyMatrix.map((row, rowIndex) => (
                  <tr key={`adj_matrix_input_body_row_${rowIndex}`}>
                    <td>{getCharacter(rowIndex)}</td>
                    {row.map((col, colIndex) => (
                      <td key={`adj_matrix_input_body_col_${colIndex}`}>
                        {colIndex === rowIndex ? (
                          <div>0</div>
                        ) : (
                          <input
                            className="border border-gray-400 text-center w-16 m-2"
                            type="number"
                            step="1"
                            min="0"
                            value={col}
                            onChange={({ target: { value } }) => {
                              const m = math.matrix(adjacencyMatrix);
                              const firstIndex = math.index(rowIndex, colIndex);
                              const secondIndex = math.index(colIndex, rowIndex);

                              const newValue = parseInt(value, 10);
                              setAdjacencyMatrix(m.subset(firstIndex, newValue).subset(secondIndex, newValue).toArray());
                            }}
                          />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="text-center mb-12">
          <h5>Graph</h5>
          <div className="border border-gray-400 text-center">
            <Graph id="undirected_graph" data={graphData} config={graphConfig} />
          </div>
        </div>
        <div className="text-center mb-12">
          <h5>Prim&apos;s Algorithm</h5>
          <div className="flex items-center justify-center align-middle">
            {adjacencyMatrix[0].map((_, i) => (
              <div className="m-2" key={`prims_algo_select_start_${i}`}>
                <input
                  type="radio"
                  name="prim_start_node"
                  id={`prim_start_node_${i}`}
                  value={getCharacter(i)}
                  checked={startNode === getCharacter(i)}
                  onChange={() => setStartNode(getCharacter(i))}
                />
                <label htmlFor={`prim_start_node_${i}`} className="pl-2 cursor-pointer">
                  {getCharacter(i)}
                </label>
              </div>
            ))}
          </div>
          <div className="border border-gray-400 text-center">
            <Graph id="prims_graph" data={primGraphData} config={graphConfig} />
          </div>
          <div className="text-center">
            <span>
              Edge Selection Order:{' '}
              {primGraphData.links
                .filter((l) => l.color)
                .map((l) => `${l.source.replace('prim_', '')}-${l.target.replace('prim_', '')}`)
                .join(', ')}
            </span>
          </div>
        </div>
        <div className="text-center mb-12">
          <h5>Kruskal&apos;s Algorithm</h5>
          <div className="border border-gray-400 text-center">
            <Graph id="kruskal_graph" data={kruskalsGraphData} config={graphConfig} />
          </div>
          <div className="text-center">
            <span>
              Edge Selection Order:{' '}
              {kruskalsGraphData.links
                .filter((l) => l.color)
                .map((l) => `${l.source.replace('kruskal_', '')}-${l.target.replace('kruskal_', '')}`)
                .join(', ')}
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
