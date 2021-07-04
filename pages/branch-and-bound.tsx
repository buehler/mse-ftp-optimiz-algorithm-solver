import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
import Tree from 'react-d3-tree';

enum NodeReason {
  none = 'none',
  globalUpdate = 'globalUpdate',
  optimal = 'optimal',
  dominated = 'dominated',
  infeasible = 'infeasible',
}

enum DpsStrategy {
  onesFirst,
  zeroesFirst,
}

type TreeNode = {
  name: string;
  attributes: { [name: string]: string };
  children: TreeNode[];
};

type CalculationResult = ReturnType<typeof calculate>;

class Item {
  constructor(public readonly index: string, public weight: number = 1, public value: number = 1) {}

  public get ratio(): number {
    return this.value / this.weight;
  }
}

let treeSteps = 1;

class Node {
  constructor(
    public readonly upperBound: string[],
    public readonly lowerBound: number[],
    public readonly upperValue: number,
    public readonly lowerValue: number,
    public readonly fixedZeroes: number[],
    public readonly fixedOnes: number[],
    public readonly reason: NodeReason,
    public readonly oneChild?: Node,
    public readonly zeroChild?: Node
  ) {}

  public toTree(strategy: DpsStrategy): TreeNode {
    const children = [] as TreeNode[];
    const currentStep = treeSteps++;

    if (strategy === DpsStrategy.onesFirst) {
      if (this.oneChild) {
        children.unshift(this.oneChild.toTree(strategy));
      }
      if (this.zeroChild) {
        children.unshift(this.zeroChild.toTree(strategy));
      }
    } else {
      if (this.zeroChild) {
        children.unshift(this.zeroChild.toTree(strategy));
      }
      if (this.oneChild) {
        children.unshift(this.oneChild.toTree(strategy));
      }
    }

    return {
      name: `Step: ${currentStep}`,
      attributes: {
        'fixed zeroes': `{${this.fixedZeroes
          .sort()
          .map((i) => i + 1)
          .join(', ')}}`,
        'fixed ones': `{${this.fixedOnes
          .sort()
          .map((i) => i + 1)
          .join(', ')}}`,
        'x upper': `(${this.upperBound.join(', ')}) with value: ${this.upperValue}`,
        'x lower': `(${this.lowerBound.join(', ')}) with value: ${this.lowerValue}`,
        'node action': this.reason,
      },
      children,
    };
  }
}

const getCharacter = (number: number) => String.fromCharCode(65 + number);

function calculate(strategy: DpsStrategy, capacity: number, items: Item[]) {
  const orderedItems = items.sort((left, right) => right.ratio - left.ratio);
  const globalMaxima = [0];
  const result = calculateBranchAndBound(strategy, orderedItems, capacity, globalMaxima, [], []);

  return { result, globalMaxima, orderedItems };
}

function calculateBranchAndBound(
  strategy: DpsStrategy,
  orderedItems: Item[],
  capacity: number,
  globalMaxima: number[],
  fixedZeroes: number[],
  fixedOnes: number[]
): Node {
  let usedCapacity = 0;

  const upperBound = Array.from({ length: orderedItems.length }, () => 0);
  const upperStringBound = Array.from({ length: orderedItems.length }, () => '0');
  const lowerBound = Array.from({ length: orderedItems.length }, () => 0);

  for (const one of fixedOnes) {
    upperBound[one] = lowerBound[one] = 1;
    upperStringBound[one] = '1';
    usedCapacity += orderedItems[one].weight;
  }

  if (usedCapacity > capacity) {
    // the fixed ones overshot the capacity. Infeasible.
    return new Node(upperStringBound, upperBound, 0, 0, fixedZeroes, fixedOnes, NodeReason.infeasible);
  }

  let mismatchingIndex = 0;
  for (let x = 0; x < orderedItems.length; x++) {
    if (fixedOnes.indexOf(x) >= 0 || fixedZeroes.indexOf(x) >= 0) {
      // position is fixed. Skipping.
      continue;
    }

    if (usedCapacity + orderedItems[x].weight < capacity) {
      usedCapacity += orderedItems[x].weight;
      upperBound[x] = 1;
      upperStringBound[x] = '1';
      lowerBound[x] = 1;
    } else {
      upperBound[x] = (capacity - usedCapacity) / orderedItems[x].weight;
      upperStringBound[x] = `${capacity - usedCapacity}/${orderedItems[x].weight}`;
      mismatchingIndex = x;
      break;
    }
  }

  const upperValue = upperBound.reduce((sum, select, index) => (sum += orderedItems[index].value * select), 0);
  const lowerValue = lowerBound.reduce((sum, select, index) => (sum += orderedItems[index].value * select), 0);

  let globalUpdate = false;
  if (globalMaxima[0] < lowerValue) {
    // we found a better lower bound. global update.
    globalUpdate = true;
    globalMaxima.unshift(lowerValue);
  }

  if (upperValue < globalMaxima[0]) {
    // the upper value is lower than the already found lower bound. Pruned by dominance.
    return new Node(upperStringBound, lowerBound, upperValue, lowerValue, fixedZeroes, fixedOnes, NodeReason.dominated);
  }

  if (upperValue === lowerValue) {
    // we found the optimal solution for this branch.
    return new Node(upperStringBound, lowerBound, upperValue, lowerValue, fixedZeroes, fixedOnes, NodeReason.optimal);
  }

  if (strategy === DpsStrategy.onesFirst) {
    const one = calculateBranchAndBound(strategy, orderedItems, capacity, globalMaxima, fixedZeroes, [
      ...fixedOnes,
      mismatchingIndex,
    ]);
    const zero = calculateBranchAndBound(
      strategy,
      orderedItems,
      capacity,
      globalMaxima,
      [...fixedZeroes, mismatchingIndex],
      fixedOnes
    );

    return new Node(
      upperStringBound,
      lowerBound,
      upperValue,
      lowerValue,
      fixedZeroes,
      fixedOnes,
      globalUpdate ? NodeReason.globalUpdate : NodeReason.none,
      one,
      zero
    );
  } else {
    const zero = calculateBranchAndBound(
      strategy,
      orderedItems,
      capacity,
      globalMaxima,
      [...fixedZeroes, mismatchingIndex],
      fixedOnes
    );
    const one = calculateBranchAndBound(strategy, orderedItems, capacity, globalMaxima, fixedZeroes, [
      ...fixedOnes,
      mismatchingIndex,
    ]);

    return new Node(
      upperStringBound,
      lowerBound,
      upperValue,
      lowerValue,
      fixedZeroes,
      fixedOnes,
      globalUpdate ? NodeReason.globalUpdate : NodeReason.none,
      one,
      zero
    );
  }
}

function WeightField({ item }: { item: Item }) {
  const [weight, setWeight] = useState(item.weight);

  return (
    <input
      className="w-16 border border-gray-500 text-center"
      type="number"
      step="1"
      value={weight}
      onChange={(e) => {
        item.weight = parseInt(e.target.value, 10);
        setWeight(parseInt(e.target.value, 10));
      }}
    />
  );
}

function ValueField({ item }: { item: Item }) {
  const [value, setValue] = useState(item.value);

  return (
    <input
      className="w-16 border border-gray-500 text-center"
      type="number"
      step="1"
      value={value}
      onChange={(e) => {
        item.value = parseInt(e.target.value, 10);
        setValue(parseInt(e.target.value, 10));
      }}
    />
  );
}

function Result({
  strategy,
  result: { globalMaxima, orderedItems, result },
}: {
  strategy: DpsStrategy;
  result: CalculationResult;
}) {
  treeSteps = 1;

  return (
    <div>
      <h5 className="text-lg text-center mb-8">Ordered Items</h5>
      <div className="mb-8">
        <table className="mx-auto">
          <tr>
            <th />
            {orderedItems.map((item) => (
              <th className="text-center" key={`result_item_tbl_head_${item.index}`}>
                {item.index}
              </th>
            ))}
          </tr>
          <tr>
            <th className="text-right">Value</th>
            {orderedItems.map((item) => (
              <td className="text-center px-4 py-2" key={`result_item_tbl_value_${item.index}`}>
                {item.value}
              </td>
            ))}
          </tr>
          <tr>
            <th className="text-right">Weight</th>
            {orderedItems.map((item) => (
              <td className="text-center px-4 py-2" key={`result_item_tbl_weight_${item.index}`}>
                {item.weight}
              </td>
            ))}
          </tr>
          <tr>
            <th className="text-right">Ratio</th>
            {orderedItems.map((item) => (
              <td className="text-center px-4 py-2" key={`result_item_tbl_ratio_${item.index}`}>
                {Math.round(item.ratio * 1000) / 1000}
              </td>
            ))}
          </tr>
        </table>
      </div>
      <h5 className="text-lg text-center mb-8">
        Global Maxima Updates: <span className="text-green-800">{globalMaxima.join(', ')}</span>
      </h5>
      <h5 className="text-lg text-center mb-8">Decision Tree</h5>
      <div className="w-full h-96 rounded shadow-xl border border-gray-500" id="decision-tree">
        <Tree data={result.toTree(strategy)} orientation="vertical" nodeSize={{ x: 400, y: 200 }} />
      </div>
    </div>
  );
}

export default function BranchAndBound() {
  const [items, setItems] = useState([
    new Item('A', 10, 25),
    new Item('B', 7, 21),
    new Item('C', 5, 30),
    new Item('D', 4, 8),
  ]);
  const [capacity, setCapacity] = useState(20);
  const [result, setResult] = useState<null | CalculationResult>(null);
  const [strategy, setStrategy] = useState(DpsStrategy.onesFirst);

  return (
    <div>
      <Head>
        <title>Branch and Bound Knapsack Solver</title>
      </Head>

      <main className="container mx-auto my-12">
        <h1 className="text-xl text-center mb-12">Branch and Bound Knapsack Solver</h1>
        <div className="text-center mb-12">
          <Link href="/">
            <a className="underline text-center text-blue-500">back</a>
          </Link>
        </div>
        <div className="text-center mb-12">
          <div className="flex flex-row justify-center align-middle items-center mb-8">
            <label className="inline-block">Capacity:</label>
            <input
              className="w-24 text-center px-4 py-2 border inline-block mx-4 border-gray-600"
              type="number"
              step="1"
              value={capacity}
              onChange={(e) => setCapacity(parseInt(e.target.value, 10))}
            />
            <button
              className="inline-block mx-4 px-2 py-1 rounded bg-green-300 hover:bg-green-700 hover:text-white transition-colors duration-150"
              onClick={() => setItems([...items, new Item(getCharacter(items.length + 1))])}
            >
              add item
            </button>
            <button
              className="inline-block mx-4 px-2 py-1 rounded bg-red-300 hover:bg-red-700 hover:text-white transition-colors duration-150"
              onClick={() => setItems(items.slice(0, -1))}
            >
              remove last item
            </button>
          </div>
          <div>
            <ul>
              <li>
                <input
                  type="radio"
                  id="ones_first"
                  name="dps_strat"
                  value="1"
                  checked={strategy === DpsStrategy.onesFirst}
                  onChange={() => setStrategy(DpsStrategy.onesFirst)}
                />{' '}
                <label htmlFor="ones_first">explore ones first</label>
              </li>
              <li>
                <input
                  type="radio"
                  id="zeroes_first"
                  name="dps_strat"
                  value="0"
                  checked={strategy === DpsStrategy.zeroesFirst}
                  onChange={() => setStrategy(DpsStrategy.zeroesFirst)}
                />{' '}
                <label htmlFor="zeroes_first">explore zeroes first</label>
              </li>
            </ul>
          </div>
        </div>
        <div className="mb-16">
          <h4 className="text-lg text-center mb-12">Items</h4>
          <table className="w-full">
            <tr>
              <th />
              {items.map((item) => (
                <th className="text-center" key={`item_tbl_head_${item.index}`}>
                  {item.index}
                </th>
              ))}
            </tr>
            <tr>
              <th className="text-right">Value</th>
              {items.map((item) => (
                <td className="text-center py-4" key={`item_tbl_value_${item.index}`}>
                  <ValueField item={item} />
                </td>
              ))}
            </tr>
            <tr>
              <th className="text-right">Weight</th>
              {items.map((item) => (
                <td className="text-center py-4" key={`item_tbl_weight_${item.index}`}>
                  <WeightField item={item} />
                </td>
              ))}
            </tr>
          </table>
        </div>
        <div className="text-center mb-16">
          <button
            className="inline-block mx-4 px-2 py-1 rounded bg-pink-300 hover:bg-pink-700 hover:text-white transition-colors duration-150"
            onClick={() => {
              setResult(calculate(strategy, capacity, items));
            }}
          >
            calculate result.
          </button>
        </div>
        {result ? <Result result={result} strategy={strategy} /> : null}
      </main>
    </div>
  );
}
