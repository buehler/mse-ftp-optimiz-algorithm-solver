import 'jsxgraph';
import { index, inv, matrix, Matrix, multiply, size, subset } from 'mathjs';
import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const katex = require('katex');
const nerdamer = require('nerdamer/all');

enum MinMax {
  min,
  max,
}

enum InequalitySign {
  greaterOrEqual,
  lessOrEqual,
}

type LeftHandSide = {
  x1: number;
  x2: number;
};

type Inequality = LeftHandSide & {
  eq: InequalitySign;
  result: number;
};

type Problem = {
  minMax: MinMax;
  target: LeftHandSide;
  inequalities: Inequality[];
};

type Selection = [number, number];

type Iteration = {
  selectionOfA: number[][];
  selectionOfb: number[];
  selectionB: number[];
  inverseOfSelectionOfA: number[][];
  vertex: number[];
  reducedCostu: number[];
  direction?: number[][];
  Ad?: number[][];
  Av?: number[];
  lambdaStar?: number;
  lambdaStarIndex?: number;
};

// const startProblem: Problem = {
//   minMax: MinMax.min,
//   target: { x1: 3, x2: 1 },
//   inequalities: [
//     { x1: 1, x2: 2, eq: InequalitySign.greaterOrEqual, result: 2 },
//     { x1: -1, x2: 1, eq: InequalitySign.lessOrEqual, result: 1 },
//     { x1: 1, x2: 0, eq: InequalitySign.lessOrEqual, result: 3 },
//     { x1: 0, x2: 1, eq: InequalitySign.lessOrEqual, result: 2 },
//     { x1: 0, x2: 1, eq: InequalitySign.greaterOrEqual, result: 0 },
//   ],
// };

const startProblem: Problem = {
  minMax: MinMax.max,
  target: { x1: 2, x2: 1 },
  inequalities: [
    { x1: -1, x2: 1, eq: InequalitySign.lessOrEqual, result: 1 },
    { x1: 1, x2: 2, eq: InequalitySign.lessOrEqual, result: 8 },
    { x1: 2, x2: -3, eq: InequalitySign.lessOrEqual, result: 2 },
    { x1: -1, x2: 0, eq: InequalitySign.lessOrEqual, result: 0 },
    { x1: 0, x2: -1, eq: InequalitySign.lessOrEqual, result: 0 },
  ],
};

const createMaxTargetFunction = (problem: Problem) => {
  if (problem.minMax === MinMax.max) {
    return problem.target;
  }

  return {
    x1: problem.target.x1 * -1,
    x2: problem.target.x2 * -1,
  };
};

const createInequalityForm = (ineq: Inequality) => {
  if (ineq.eq === InequalitySign.lessOrEqual) {
    return ineq;
  }

  return {
    x1: ineq.x1 * -1,
    x2: ineq.x2 * -1,
    eq: InequalitySign.lessOrEqual,
    result: ineq.result * -1,
  };
};

const simplex = (matrixA: number[][], vectorb: number[], targetc: [number, number], selectionB: [number, number]) => {
  const iterations = [] as Iteration[];
  let calc = 0;

  console.log('start: ', matrixA, vectorb, targetc, selectionB);

  while (true) {
    calc++;
    if (calc > 20) {
      console.error('wrong config. aborting.');
      return iterations;
    }
    // select parts of the matrix
    const selectionMatrixA = matrix([matrixA[selectionB[0] - 1], matrixA[selectionB[1] - 1]]);
    const selectionVectorb = matrix([vectorb[selectionB[0] - 1], vectorb[selectionB[1] - 1]]);

    // inverse of the selection
    const inverseSelection = inv(selectionMatrixA);
    // feasible solution AB-1 * bB
    const feasibleSolution = multiply(inverseSelection, selectionVectorb);

    // c*AB-1
    const reducedCost = multiply(targetc, inverseSelection);

    console.log('iteration: ', selectionMatrixA, selectionVectorb, inverseSelection, feasibleSolution, reducedCost);

    let pos = true;
    (reducedCost as any as Matrix).forEach((value) => {
      if (value < 0) {
        pos = false;
      }
    });
    if (pos) {
      // no further improvement possible. return.
      console.log('optimal solution found');
      iterations.push({
        selectionOfA: selectionMatrixA.toArray() as any as number[][],
        selectionOfb: selectionVectorb.toArray() as any as number[],
        selectionB: [...selectionB],
        inverseOfSelectionOfA: inverseSelection.toArray() as any as number[][],
        vertex: feasibleSolution.toArray() as any as number[],
        reducedCostu: (reducedCost as any as Matrix).toArray() as any as number[],
      });
      break;
    }

    const reducedCostArray = (reducedCost as any as Matrix).toArray() as any as number[];
    const biggerImpactIndex = reducedCostArray[0] < 0 ? 0 : 1;
    const directionVector = multiply(-1, subset(inverseSelection, index([0, 1], biggerImpactIndex)));

    console.log('iteration, search direction and length: ', biggerImpactIndex, directionVector, reducedCostArray);

    const Ad = multiply(matrixA, directionVector);
    const Av = multiply(matrixA, feasibleSolution);

    console.log('direction search: ', Ad, Av);

    let lambdaStar = Infinity;
    let lambdaStarIndex = -1;
    for (let x = 0; x < (size(Ad) as any as Matrix).get([0]); x++) {
      const ad = subset(Ad, index(x, 0)) as any as number;
      if (ad <= 0) {
        // inequality is not needed.
        continue;
      }

      const av = subset(Av, index(x)) as any as number;
      const b = vectorb[x];
      const lambdaStarTry = (b - av) / ad;
      console.log(`calc lambda star: ad ${ad} , av ${av} , b ${b}, lambdastartry ${lambdaStarTry}`);
      if (lambdaStarTry < lambdaStar) {
        lambdaStar = lambdaStarTry;
        lambdaStarIndex = x + 1;
      }
    }

    console.log('found lambda: ', lambdaStar, ' at index ', lambdaStarIndex);

    iterations.push({
      selectionOfA: selectionMatrixA.toArray() as any as number[][],
      selectionOfb: selectionVectorb.toArray() as any as number[],
      selectionB: [...selectionB],
      inverseOfSelectionOfA: inverseSelection.toArray() as any as number[][],
      vertex: feasibleSolution.toArray() as any as number[],
      reducedCostu: (reducedCost as any as Matrix).toArray() as any as number[],
      direction: (directionVector as any as Matrix).toArray() as any as number[][],
      Ad: (Ad as any as Matrix).toArray() as any as number[][],
      Av: (Av as any as Matrix).toArray() as any as number[],
      lambdaStar: lambdaStar,
      lambdaStarIndex: lambdaStarIndex,
    });

    selectionB[biggerImpactIndex] = lambdaStarIndex;
  }

  return iterations;
};

function InequalityForm({
  ineq,
  index,
  onChange,
}: {
  ineq: Inequality;
  index: number;
  onChange: (ineq: Inequality) => void;
}) {
  return (
    <div className="flex align-middle items-center justify-center my-4">
      <div className="mr-4">({index + 1})</div>
      <div>
        <input
          className="w-16 border border-gray-500 text-center mr-1"
          type="number"
          step="1"
          value={ineq.x1}
          onChange={(e) =>
            onChange({
              ...ineq,
              x1: parseInt(e.target.value, 10),
            })
          }
        />
        <label>
          x<sub>1</sub>
        </label>
      </div>
      <div>+</div>
      <div>
        <input
          className="w-16 border border-gray-500 text-center mr-1"
          type="number"
          step="1"
          value={ineq.x2}
          onChange={(e) =>
            onChange({
              ...ineq,
              x2: parseInt(e.target.value, 10),
            })
          }
        />
        <label>
          x<sub>2</sub>
        </label>
      </div>
      <select
        className="text-center px-4 py-2 border inline-block mx-4 border-gray-600"
        value={ineq.eq === InequalitySign.greaterOrEqual ? 'gte' : 'lte'}
        onChange={(e) =>
          onChange({
            ...ineq,
            eq: e.target.value === 'lte' ? InequalitySign.lessOrEqual : InequalitySign.greaterOrEqual,
          })
        }
      >
        <option value="lte">&#8804;</option>
        <option value="gte">&#8805;</option>
      </select>
      <input
        className="w-16 border border-gray-500 text-center mr-1"
        type="number"
        step="1"
        value={ineq.result}
        onChange={(e) =>
          onChange({
            ...ineq,
            result: parseInt(e.target.value, 10),
          })
        }
      />
    </div>
  );
}

function ResultPresentation({ result }: { result: Iteration[] }) {
  return (
    <div className="text-center">
      <h4 className="text-center text-lg mb-8">Result</h4>
      {result.map((iteration, index) => (
        <div className="mb-12" key={`iteration_result_${index}`}>
          <h5>Iteration {index + 1}</h5>
          <div>
            B=({iteration.selectionB.join(', ')}) ; v=({iteration.vertex.join(', ')}) ; b<sub>B</sub>=(
            {iteration.selectionOfb.join(', ')})
          </div>
          <div className="flex items-center justify-center align-middle">
            <div className="m-2">
              <h6>
                A<sub>B</sub>
              </h6>
              <table className="border-l border-r border-gray-800">
                <tbody>
                  {iteration.selectionOfA.map((row, i) => (
                    <tr key={`row_i_${index}_${i}`}>
                      {row.map((value, y) => (
                        <td key={`foobar___${y}_${i}_${index}`}>{value}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="m-2">
              <h6>
                A<sub>B</sub>
                <sup>-1</sup>
              </h6>
              <table className="border-l border-r border-gray-800">
                <tbody>
                  {iteration.inverseOfSelectionOfA.map((row, i) => (
                    <tr key={`row_inv_i_${index}_${i}`}>
                      {row.map((value, y) => (
                        <td key={`fooinvar___${y}_${i}_${index}`}>{Math.round(value * 1000) / 1000}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div>Reduced cost &quot;u&quot;: ({iteration.reducedCostu.join(', ')})</div>
          {iteration.direction ? (
            <>
              <div className="flex items-center justify-center align-middle">
                <div className="m-2">
                  <h6>Av</h6>
                  <table className="border-l border-r border-gray-800">
                    <tbody>
                      {iteration.Av?.map((row, i) => (
                        <tr key={`AV_row_i_${index}_${i}`}>
                          <td>{row}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="m-2">
                  <h6>Ad</h6>
                  <table className="border-l border-r border-gray-800">
                    <tbody>
                      {iteration.Ad?.map((row, i) => (
                        <tr key={`AD_row_i_${index}_${i}`}>
                          <td>{row}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div>
                Lambda Star: {iteration.lambdaStar} at index {iteration.lambdaStarIndex}
              </div>
              <div>Direction d = ({iteration.direction.join(', ')})</div>
            </>
          ) : null}
        </div>
      ))}
    </div>
  );
}

let board: JXG.Board;
const boardObjects = [] as JXG.GeometryElement[];

export default function TwoDimensionalSimplexAlgorithm() {
  const [problem, setProblem] = useState(startProblem);
  const [startSelection, setStartSelection] = useState<Selection>([1, 2]);
  const [result, setResult] = useState<Iteration[] | null>(null);

  useEffect(() => {
    board ??= window.JXG.JSXGraph.initBoard('inequality_graph', {
      axis: true,
      boundingbox: [-5, 5, 5, -5],
      drag: { enabled: true },
    });

    const ineqs = problem.inequalities.map(createInequalityForm);
    for (let x = 0; x < ineqs.length; x++) {
      const { x1, x2, result } = ineqs[x];
      const line = board.create('line' as any, [-result, x2, x1], {
        fixed: true,
        withLabel: true,
        label: { autoPosition: true },
        name: `(${x + 1}) ${x1 !== 0 ? x1 + 'x' : ''} + ${x2 !== 0 ? x2 + 'y' : ''} &leq; ${result}`,
      });
      const ineq = board.create('inequality' as any, [line], { inverse: true });
      boardObjects.push(line, ineq);

      // console.log(`${x1}x+(${x2})y <= ${result}`, nerdamer.convertToLaTeX(`(${x1})x+(${x2})y<=${result}`));
    }

    const { x1, x2 } = createMaxTargetFunction(problem);

    const p0 = board.create('point', [0, 0], { withLabel: false, fixed: true });
    const pC = board.create('point', [x1, x2], { withLabel: false, fixed: true });
    const cFunc = board.create('arrow', [p0, pC], {
      color: 'green',
      withLabel: true,
      name: `c (${x1},${x2})`,
    });

    // calculate level function for point 1,1

    const slope = x2 / x1;
    const perpendicularSlope = nerdamer(`${slope}*x=-1`).solveFor('x').toString();
    const yIntercept = nerdamer(`0=${perpendicularSlope}*0+b`).solveFor('b').toString();
    console.log(perpendicularSlope, yIntercept);
    // y = -2x + 0 --> 0 = -2x - y + 0

    boardObjects.push(
      p0,
      pC,
      cFunc
      // board.create('line', [0, -1, parseFloat(perpendicularSlope)], {
      //   withLabel: true,
      //   color: 'green',
      //   // name: `max ${x1 !== 0 ? x1 + 'x' : ''} + ${x2 !== 0 ? x2 + 'y' : ''}`,
      // })
    );

    return function cleanup() {
      board.removeObject(boardObjects, false);
      boardObjects.length = 0;
    };
  }, [problem]);

  return (
    <div>
      <Head>
        <title>Two Dimensional Simplex Algorithm Solver</title>
      </Head>

      <main className="container mx-auto my-12">
        <h1 className="text-xl text-center mb-12">Two Dimensional Simplex Algorithm Solver</h1>
        <div className="text-center mb-12">
          <Link href="/">
            <a className="underline text-center text-blue-500">back</a>
          </Link>
        </div>
        <div className="text-center mb-12">
          <h5 className="text-lg text-center mb-8">Problem Description</h5>
          <div className="mb-8">
            <button
              className="inline-block mx-4 px-2 py-1 rounded bg-green-300 hover:bg-green-700 hover:text-white transition-colors duration-150"
              onClick={() =>
                setProblem({
                  ...problem,
                  inequalities: [...problem.inequalities, { x1: 1, x2: 1, eq: InequalitySign.greaterOrEqual, result: 1 }],
                })
              }
            >
              add inequality
            </button>
            <button
              className="inline-block mx-4 px-2 py-1 rounded bg-red-300 hover:bg-red-700 hover:text-white transition-colors duration-150"
              onClick={() =>
                setProblem({
                  ...problem,
                  inequalities: problem.inequalities.slice(0, -1),
                })
              }
            >
              remove last inequality
            </button>
          </div>
          <div className="flex align-middle items-center justify-center">
            <div>
              <div className="flex align-middle items-center justify-center mr-16">
                <select
                  className="text-center px-4 py-2 border inline-block mx-4 border-gray-600"
                  value={problem.minMax === MinMax.min ? 'min' : 'max'}
                  onChange={(e) => setProblem({ ...problem, minMax: e.target.value === 'min' ? MinMax.min : MinMax.max })}
                >
                  <option value="min">min</option>
                  <option value="max">max</option>
                </select>
                <div>
                  <input
                    className="w-16 border border-gray-500 text-center mr-1"
                    type="number"
                    step="1"
                    value={problem.target.x1}
                    onChange={(e) =>
                      setProblem({
                        ...problem,
                        target: {
                          ...problem.target,
                          x1: parseInt(e.target.value, 10),
                        },
                      })
                    }
                  />
                  <label>
                    x<sub>1</sub>
                  </label>
                </div>
                <div>+</div>
                <div>
                  <input
                    className="w-16 border border-gray-500 text-center mr-1"
                    type="number"
                    step="1"
                    value={problem.target.x2}
                    onChange={(e) =>
                      setProblem({
                        ...problem,
                        target: {
                          ...problem.target,
                          x2: parseInt(e.target.value, 10),
                        },
                      })
                    }
                  />
                  <label>
                    x<sub>2</sub>
                  </label>
                </div>
              </div>
              {problem.inequalities.map((ineq, index) => (
                <InequalityForm
                  key={`ineq_${index}`}
                  index={index}
                  ineq={ineq}
                  onChange={(newIneq) => {
                    const inequalities = problem.inequalities;
                    inequalities.splice(index, 1, newIneq);
                    setProblem({
                      ...problem,
                      inequalities: [...inequalities],
                    });
                  }}
                />
              ))}
            </div>
            <div>
              <div className="flex align-middle items-center justify-center ml-16">
                <div className="text-green-500 mr-2">max</div>
                <div>
                  ({createMaxTargetFunction(problem).x1})
                  <label>
                    x<sub>1</sub>
                  </label>
                </div>
                <div>+</div>
                <div>
                  ({createMaxTargetFunction(problem).x2})
                  <label>
                    x<sub>2</sub>
                  </label>
                </div>
              </div>
              {problem.inequalities.map(createInequalityForm).map(({ x1, x2, result }, index) => (
                <div key={`indeq_trans_form_${index}`} className="flex align-middle items-center justify-center ml-16">
                  <span className="inline-block mr-4">(eq. {index + 1})</span>({x1})
                  <label>
                    x<sub>1</sub>
                  </label>
                  + ({x2})
                  <label>
                    x<sub>2</sub>
                  </label>
                  &nbsp; &#8804; {result}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="text-center mb12">
          <h5 className="text-lg text-center mb-8">Matrices &amp; Variables</h5>
          <div className="flex align-middle items-center justify-center">
            <div>
              <h6>A</h6>
              <table className="border-l border-r border-gray-800">
                <tbody>
                  {problem.inequalities.map(createInequalityForm).map(({ x1, x2 }, index) => (
                    <tr key={`A_matrix_${index}`}>
                      <td>
                        <div className="m-2">{x1}</div>
                      </td>
                      <td>
                        <div className="m-2">{x2}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mx-4">&#8804;</div>
            <div>
              <div>
                <h6>b</h6>
                <table className="border-l border-r border-gray-800">
                  <tbody>
                    {problem.inequalities.map(createInequalityForm).map(({ result }, index) => (
                      <tr key={`b_vector_${index}`}>
                        <td>
                          <div className="m-2">{result}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="ml-4">
              c = ({createMaxTargetFunction(problem).x1}, {createMaxTargetFunction(problem).x2})
            </div>
          </div>
          <div className="my-12">
            <h6>Graph</h6>
            <div
              className="mx-auto border border-gray-900"
              id="inequality_graph"
              style={{ width: '800px', height: '600px' }}
            ></div>
          </div>
        </div>
        <div className="text-center mb-12">
          Start Selection; B = (
          <input
            className="w-16 border border-gray-500 text-center mr-1"
            type="number"
            step="1"
            value={startSelection[0]}
            onChange={(e) => setStartSelection([parseInt(e.target.value, 10), startSelection[1]])}
          />
          ,
          <input
            className="w-16 border border-gray-500 text-center mr-1"
            type="number"
            step="1"
            value={startSelection[1]}
            onChange={(e) => setStartSelection([startSelection[0], parseInt(e.target.value, 10)])}
          />{' '}
          )
          <button
            className="inline-block mx-4 px-2 py-1 rounded bg-pink-300 hover:bg-pink-700 hover:text-white transition-colors duration-150"
            onClick={() => {
              const ineqs = problem.inequalities.map(createInequalityForm);
              const target = createMaxTargetFunction(problem);
              const matrixA = ineqs.map((i) => [i.x1, i.x2]);
              const vectorB = ineqs.map((i) => i.result);
              setResult(simplex(matrixA, vectorB, [target.x1, target.x2], startSelection));
            }}
          >
            calculate result.
          </button>
        </div>
        {result ? <ResultPresentation result={result} /> : null}
      </main>
    </div>
  );
}
