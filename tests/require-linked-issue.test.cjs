const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const workflow = fs.readFileSync(path.join(__dirname, '../.github/workflows/require-linked-issue.yml'), 'utf8');
const script = workflow.split('          script: |\n')[1].split('\n').map(line => line.replace(/^            /, '')).join('\n');
const run = new (Object.getPrototypeOf(async function() {}).constructor)('github', 'context', 'core', script);
const page = (ids, next = false, cursor = null) => ({repository: {pullRequest: {closingIssuesReferences: {nodes: ids.map(id => ({id})), pageInfo: {hasNextPage: next, endCursor: cursor}}}}});
async function check(responses, number = '17') {
  const failures = [], calls = [], messages = [];
  const previous = process.env.PR_NUMBER;
  process.env.PR_NUMBER = number;
  try {
    await run({graphql: async (query, args) => {
      calls.push({query, args});
      const value = responses.shift();
      if (value instanceof Error) throw value;
      return value;
    }}, {repo: {owner: 'example', repo: 'project'}}, {setFailed: x => failures.push(x), info: x => messages.push(x)});
  } finally {
    if (previous === undefined) delete process.env.PR_NUMBER; else process.env.PR_NUMBER = previous;
  }
  return {failures, calls, messages};
}
test('manual and closing issue relationships pass without body parsing or author exemption', async () => {
  for (const id of ['manual-issue', 'closing-issue']) {
    const result = await check([page([id])]);
    assert.equal(result.failures.length, 0);
    assert.match(result.calls[0].query, /userLinkedOnly:false/);
    assert.deepEqual(result.calls[0].args, {owner: 'example', repo: 'project', number: 17, cursor: null});
    assert.doesNotMatch(script, /author|\.body|Bot|fetch\(/);
  }
});
test('no relationship fails: mentions and author identity cannot satisfy the predicate', async () => {
  assert.equal((await check([page([])])).failures.length, 1);
});
test('all pages are read, including a relationship after the first page', async () => {
  const result = await check([page([], true, 'next'), page(['issue'])]);
  assert.equal(result.failures.length, 0);
  assert.equal(result.calls[1].args.cursor, 'next');
});
test('API errors fail closed without disclosing private diagnostics', async () => {
  const result = await check([new Error('private response')]);
  assert.equal(result.failures.length, 1);
  assert.doesNotMatch(result.failures[0], /private response/);
});
test('later page failure fails closed even after finding a relationship', async () => {
  assert.equal((await check([page(['issue'], true, 'next'), new Error('failure')])).failures.length, 1);
});
test('missing, null and malformed relationships fail closed', async () => {
  for (const response of [null, {}, {repository: {pullRequest: null}}, page([null]), {repository:{pullRequest:{closingIssuesReferences:{nodes:[],pageInfo:{}}}}}]) {
    assert.equal((await check([response])).failures.length, 1);
  }
});
test('pagination without a fresh cursor fails closed', async () => {
  for (const responses of [[page([], true)], [page([], true, 'same'), page([], true, 'same')]]) {
    assert.equal((await check(responses)).failures.length, 1);
  }
});
test('invalid PR numbers never query GitHub', async () => {
  for (const number of ['0', '-1', '1.5', 'bad', '9007199254740992']) {
    const result = await check([], number);
    assert.equal(result.failures.length, 1);
    assert.equal(result.calls.length, 0);
  }
});
test('explicit rerun fetches fresh state: attach passes and unlink fails', async () => {
  assert.equal((await check([page([])])).failures.length, 1);
  assert.equal((await check([page(['attached'])])).failures.length, 0);
  assert.equal((await check([page([])])).failures.length, 1);
});
test('workflow has no checkout, inherited secrets, writes or mutable action reference', () => {
  assert.doesNotMatch(workflow, /actions\/checkout|secrets: inherit|: write/);
  assert.match(workflow, /actions\/github-script@[a-f0-9]{40}/);
  assert.match(workflow, /name: linked-issue/);
});

test('query uses only documented issue connection argument names', () => {
  const args = script.match(/closingIssuesReferences\(([^)]*)\)/)[1];
  assert.deepEqual([...args.matchAll(/([A-Za-z]+):/g)].map(x => x[1]).sort(), ['after', 'first', 'userLinkedOnly']);
});

test('runner selection defaults to hosted and is controlled only by the caller', () => {
  assert.match(workflow, /runner-label:[\s\S]*?type: string[\s\S]*?default: ubuntu-latest/);
  assert.match(workflow, /runs-on: \$\{\{ inputs.runner-label \}\}/);
  assert.doesNotMatch(script, /runner-label/);
});
