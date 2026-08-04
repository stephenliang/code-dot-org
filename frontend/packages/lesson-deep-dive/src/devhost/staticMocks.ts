// Mock API for the single-file static build (`yarn build:static`).
//
// The dev host mocks with MSW, which needs a service worker served from the
// origin root. A single-file bundle has no second file to serve and no
// controllable scope, so the static build patches `fetch` instead. Every
// dev-host stub in cdoStubs.ts goes through `fetch`, so that is enough.
//
// mocks/handlers.ts is the source of truth for these shapes; keep the two in
// step. Media that the browser loads directly (the podcast <audio> element,
// the tutor <video>) cannot be reached from here at all — the static build
// rewrites those URLs to inlined data URIs instead. See vite.static.config.ts.

import {
  CHALLENGES,
  PODCAST_SCRIPT,
  SERVER_PRACTICE_PROBLEMS,
} from '../mocks/fixtures';

type Method = 'GET' | 'POST' | 'PUT';
type Route = {
  method: Method;
  // Matched against the pathname only; ':id' matches one path segment.
  path: string;
  respond: () => Promise<Response> | Response;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {'Content-Type': 'application/json'},
  });

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

let attemptId = 500;

const ROUTES: Route[] = [
  // -- Reflection ----------------------------------------------------------
  {
    method: 'POST',
    path: '/user_lesson_reflections',
    respond: () => json({}, 201),
  },
  {
    method: 'POST',
    path: '/user_lesson_objective_reflections',
    respond: () => json({}, 201),
  },

  // -- Podcast modality ----------------------------------------------------
  {
    method: 'POST',
    path: '/ai_student_podcasts/generate_podcast',
    respond: () => json({}, 202),
  },
  {
    method: 'GET',
    path: '/ai_student_podcasts',
    respond: async () => {
      await sleep(800); // simulate the generation job finishing
      return json({podcast_script: JSON.stringify(PODCAST_SCRIPT)});
    },
  },

  // -- Challenge modality --------------------------------------------------
  {method: 'GET', path: '/challenges', respond: () => json(CHALLENGES)},
  {
    method: 'POST',
    path: '/challenge_responses',
    respond: () =>
      json({id: 601, assets: [{id: 701, asset_type: 'whiteboard_image'}]}, 201),
  },
  {
    method: 'PUT',
    path: '/challenge_response_assets/:id/upload',
    respond: () => json({}),
  },

  // -- Skills check --------------------------------------------------------
  {
    method: 'GET',
    path: '/practice_problems',
    respond: () => json(SERVER_PRACTICE_PROBLEMS),
  },
  {
    method: 'GET',
    path: '/user_practice_problem_attempts',
    respond: () => json([]),
  },
  {
    method: 'POST',
    path: '/user_practice_problem_attempts/',
    respond: () => json({id: ++attemptId}, 201),
  },
  {
    method: 'PUT',
    path: '/user_practice_problem_attempts/:id',
    respond: () => json({}),
  },
];

function matches(pattern: string, pathname: string): boolean {
  const p = pattern.replace(/\/$/, '');
  const t = pathname.replace(/\/$/, '');
  if (!p.includes(':')) {
    return p === t;
  }
  const ps = p.split('/');
  const ts = t.split('/');
  return (
    ps.length === ts.length &&
    ps.every((seg, i) => seg.startsWith(':') || seg === ts[i])
  );
}

/**
 * Patch window.fetch so the mocked dashboard routes resolve locally. Anything
 * that is not a mocked route (data: URIs, blob: URIs) falls through to the
 * real fetch.
 */
export function startStaticMocks(): void {
  const real = window.fetch.bind(window);

  // Routes are matched on pathname alone, deliberately ignoring the page's
  // scheme and origin. The bundle has to behave the same served over https and
  // double-clicked from disk, and under file:// a relative dashboard path
  // resolves to file:///user_lesson_reflections — which the real fetch rejects.
  // A fixed sentinel base makes the pathname the only thing that matters.
  const BASE = 'http://mock.invalid';

  window.fetch = async (input, init) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url;

    // Inlined media and object URLs are never mocked.
    if (/^(data|blob):/i.test(url)) {
      return real(input as RequestInfo, init);
    }

    const method = (
      init?.method ?? (input instanceof Request ? input.method : 'GET')
    ).toUpperCase() as Method;

    let pathname: string;
    try {
      pathname = new URL(url, BASE).pathname;
    } catch {
      return real(input as RequestInfo, init);
    }

    const route = ROUTES.find(
      r => r.method === method && matches(r.path, pathname),
    );
    if (!route) {
      return real(input as RequestInfo, init);
    }
    return route.respond();
  };
}
