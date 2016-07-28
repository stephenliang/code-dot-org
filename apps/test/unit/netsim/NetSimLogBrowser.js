/** @file NetSimLogBrowser tests */
import React from 'react';
import {shallow} from 'enzyme';
import {spy} from 'sinon';
import {expect} from '../../util/configuredChai';
import {throwOnConsoleErrors} from '../../util/testUtils';
import NetSimLogBrowser from '@cdo/apps/netsim/NetSimLogBrowser';

describe('NetSimLogBrowser', function () {
  throwOnConsoleErrors();

  it('renders warning-free with the least possible parameters', function () {
    let shallowResult = shallow(
      <NetSimLogBrowser
        i18n={{}}
        setRouterLogMode={spy()}
        currentTrafficFilter="none"
        setTrafficFilter={spy()}
        headerFields={[]}
        logRows={[]}
      />);
    expect(shallowResult).not.to.be.empty;
  });
});
