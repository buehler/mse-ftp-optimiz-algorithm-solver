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

const graphConfig = {
  initialZoom: 2,
  height: 600,
  link: {
    renderLabel: true,
    color: '#90b4ce',
  },
  node: {
    color: '#3da9fc',
  },
};

const demoAdjacency: number[][] = [
  [0, 3, 0, 7],
  [8, 0, 2, 0],
  [5, 0, 0, 1],
  [2, 0, 0, 0],
];

const demoAllowedNodes = [true, true, true, true];

const getCharacter = (number: number) => String.fromCharCode(65 + number);

function createGraphData(directed: boolean, adjacencyMatrix: number[][]): GraphData {
  const nodes = adjacencyMatrix[0].map((_, i) => ({ id: getCharacter(i) }));
  const links = [] as Edge[];

  for (let row = 0; row < adjacencyMatrix.length; row++) {
    for (let col = 0; col < adjacencyMatrix[row].length; col++) {
      if (!directed) {
        if (col <= row || adjacencyMatrix[row][col] <= 0) {
          // ignore self link & "lower half" of matrix & 0 links
          continue;
        }

        links.push({
          source: getCharacter(row),
          target: getCharacter(col),
          label: adjacencyMatrix[row][col].toString(),
        });
      } else {
        if (adjacencyMatrix[row][col] <= 0) {
          continue;
        }

        links.push({
          source: getCharacter(row),
          target: getCharacter(col),
          label: adjacencyMatrix[row][col].toString(),
        });
      }
    }
  }

  return {
    nodes,
    links,
  };
}

function calculateFloydWarshall(directed: boolean, allowedNodes: boolean[], adjacencyMatrix: number[][]) {
  const matrices = [] as number[][][];

  let prevMatrix = math.matrix(adjacencyMatrix).map((value: number, [row, col]: [number, number]) => {
    if (row === col) {
      return 0;
    }
    if (value <= 0) {
      return Infinity;
    }

    return value;
  });

  matrices.push(prevMatrix.toArray());

  for (let x = 0; x < allowedNodes.length; x++) {
    if (!allowedNodes[x]) {
      console.warn(`node @ index ${x} not allowed, skipping.`);
      continue;
    }

    let nextMatrix = math.matrix().resize(prevMatrix.size(), null);
    const nodeRow = math.flatten(math.row(prevMatrix, x)).toArray() as number[];
    const nodeCol = math.flatten(math.column(prevMatrix, x)).toArray() as number[];

    nextMatrix = nextMatrix.map((_: any, [row, col]: [number, number]) => {
      if (row === col) {
        // identity; loops not allowed.
        return 0;
      }

      if (row === x) {
        // this is from the actual node's row. Copy value.
        return nodeRow[col];
      }

      if (col === x) {
        // this is from the actual node's col. Copy value.
        return nodeCol[row];
      }

      // calculate min(prev[row,col], prev[row, node] + prev[node, col])
      return Math.min(
        prevMatrix.subset(math.index(row, col)),
        prevMatrix.subset(math.index(row, x)) + prevMatrix.subset(math.index(x, col))
      );
    });

    matrices.push(nextMatrix.toArray());

    prevMatrix = nextMatrix;
  }

  return matrices;
}

export default function SpanningTreeSolver() {
  const [adjacencyMatrix, setAdjacencyMatrix] = useState<number[][]>(math.zeros(4, 4).toArray());
  const [directedGraph, setDirectedGraph] = useState(true);
  const [allowedNodes, setAllowedNodes] = useState(demoAllowedNodes);
  const [result, setResult] = useState<number[][][] | null>(null);

  const graphData = createGraphData(directedGraph, adjacencyMatrix);

  return (
    <div>
      <Head>
        <title>Floyd-Warshall Solver</title>
      </Head>

      <main className="container mx-auto my-12">
        <h1 className="text-xl text-center mb-12">Floyd-Warshall Solver</h1>
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
                setAllowedNodes([...allowedNodes, true]);
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
                setAllowedNodes([...allowedNodes.slice(0, -1)]);
              }}
            >
              remove last node
            </button>
            <button
              className="inline-block mx-4 px-2 py-1 rounded bg-blue-300 hover:bg-blue-700 hover:text-white transition-colors duration-150"
              onClick={() => {
                setDirectedGraph(true);
                setAdjacencyMatrix(demoAdjacency);
                setAllowedNodes(demoAllowedNodes);
              }}
            >
              show demo graph
            </button>
          </div>
          <div className="flex items-center justify-center align-middle">
            <div className="m-2">
              <input
                type="radio"
                name="adjac_direction"
                id="adjac_direction_directed"
                checked={directedGraph}
                onChange={() => setDirectedGraph(true)}
              />
              <label htmlFor="adjac_direction_directed" className="pl-2 cursor-pointer">
                directed
              </label>
            </div>
            <div className="m-2">
              <input
                type="radio"
                name="adjac_direction"
                id="adjac_direction_undirected"
                checked={!directedGraph}
                onChange={() => setDirectedGraph(false)}
              />
              <label htmlFor="adjac_direction_undirected" className="pl-2 cursor-pointer">
                undirected
              </label>
            </div>
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
                          <div>-</div>
                        ) : directedGraph || colIndex > rowIndex ? (
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

                              let newMatrix = m.subset(firstIndex, newValue);
                              if (!directedGraph) {
                                newMatrix = newMatrix.subset(secondIndex, newValue);
                              }

                              setAdjacencyMatrix(newMatrix.toArray());
                            }}
                          />
                        ) : (
                          <div>-</div>
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
          <div className="border border-gray-400 mx-auto" style={{ width: '800px' }}>
            <Graph
              id="undirected_graph"
              data={graphData}
              config={{
                ...graphConfig,
                directed: directedGraph,
                link: { ...graphConfig.link, type: directedGraph ? 'CURVE_SMOOTH' : 'STRAIGHT' },
              }}
            />
          </div>
        </div>
        <div className="text-center mb-12">
          <h5>Calculate Floyd Warshall</h5>
          <h6>select the allowed nodes to be &quot;stopped by&quot;</h6>
          <div className="mb-8 grid grid-cols-4">
            {allowedNodes.map((allowed, i) => (
              <div key={`allowedNodes_${i}`}>
                <label htmlFor={`cb_allowedNodes_${i}`}>
                  <input
                    type="checkbox"
                    checked={allowed}
                    id={`cb_allowedNodes_${i}`}
                    onChange={() => {
                      allowedNodes[i] = !allowedNodes[i];
                      setAllowedNodes([...allowedNodes]);
                    }}
                  />{' '}
                  &nbsp;
                  {getCharacter(i)}
                </label>
              </div>
            ))}
          </div>
          <button
            className="inline-block mx-4 px-2 py-1 rounded bg-pink-300 hover:bg-pink-700 hover:text-white transition-colors duration-150"
            onClick={() => setResult(calculateFloydWarshall(directedGraph, allowedNodes, adjacencyMatrix))}
          >
            calculate result.
          </button>
        </div>
        {!result ? null : (
          <div className="text-center mb-12">
            <h5>Result</h5>
            <div>
              {result.map((matrix, i) => (
                <table className="inline-table m-4" key={`result_matrix_${i}`}>
                  <thead>
                    <tr>
                      <th colSpan={allowedNodes.length + 1}>Matrix {i}</th>
                    </tr>
                    <tr>
                      <th></th>
                      {allowedNodes.map((_, i) => (
                        <th key={`result_head_${i}`}>{getCharacter(i)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matrix.map((row, rowIndex) => (
                      <tr key={`result_body_row_${rowIndex}`}>
                        <th>{getCharacter(rowIndex)}</th>
                        {row.map((value, colIndex) => (
                          <td className="p-2 min-w-min" key={`result_body_col_${colIndex}`}>
                            {rowIndex === colIndex ? '-' : directedGraph || colIndex > rowIndex ? value : '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
