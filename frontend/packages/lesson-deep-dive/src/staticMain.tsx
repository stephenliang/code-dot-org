// Entry point for the single-file static build (`yarn build:static`), used to
// share the prototype as one self-contained .html file.
//
// Differs from main.tsx in three ways, all forced by having no server:
//   - mocks are a fetch patch, not an MSW service worker (see staticMocks.ts)
//   - FontAwesome is not injected; its CSS lives on dsco.code.org and a shared
//     file may be opened where that host is unreachable
//   - the scenario is picked in-page rather than from ?scenario=, because a
//     query string does not survive being pasted around

import {configureStore} from '@reduxjs/toolkit';
import {type FC, StrictMode, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Provider} from 'react-redux';

// Design-system color custom properties, which the Studio host loads
// globally. The sketchlab canvas draws its shape strokes from them; without
// these sheets the border shorthand is invalid and shapes get no outline.
import '@code-dot-org/component-library-styles/primitiveColors.css';
import '@code-dot-org/component-library-styles/colors.css';

import {currentUserSlice} from './devhost/cdoStubs';
import {startStaticMocks} from './devhost/staticMocks';
import LessonDeepDiveContainer from './lessonDeepDive/LessonDeepDiveContainer';
import {SCENARIO_TAGS, SCENARIOS, type ScenarioTag} from './mocks/fixtures';

startStaticMocks();

const store = configureStore({
  reducer: {currentUser: currentUserSlice.reducer},
});

const SCENARIO_NOTE: Record<ScenarioTag, string> = {
  fresh: 'partway through, one wrong answer to review',
  aced: 'everything attempted and correct',
  sparse: 'barely started',
};

// Remounts the whole flow on scenario change so it restarts from the first box.
const ScenarioSwitcher: FC = () => {
  const [scenario, setScenario] = useState<ScenarioTag>('fresh');

  return (
    <>
      <LessonDeepDiveContainer
        key={scenario}
        lessonDeepDiveData={SCENARIOS[scenario]}
      />
      <div className="ldd-scenario-switcher">
        <span>scenario</span>
        {SCENARIO_TAGS.map(tag => (
          <button
            key={tag}
            type="button"
            aria-pressed={tag === scenario}
            title={SCENARIO_NOTE[tag]}
            onClick={() => setScenario(tag)}
          >
            {tag}
          </button>
        ))}
      </div>
    </>
  );
};

createRoot(document.getElementById('lesson-deep-dive-container')!).render(
  <StrictMode>
    <Provider store={store}>
      <ScenarioSwitcher />
    </Provider>
  </StrictMode>,
);
