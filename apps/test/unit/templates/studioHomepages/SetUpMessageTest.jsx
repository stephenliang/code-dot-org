import React from 'react';
import {expect} from '../../../util/reconfiguredChai';
import {isolateComponent} from 'isolate-components';
import {UnconnectedSetUpMessage} from '@cdo/apps/templates/studioHomepages/SetUpMessage';

describe('SetUpMessage', () => {
  const headingText = 'Do Something';
  const descriptionText = 'Get started now';
  const buttonText = 'Get to it';
  const defaultProps = {
    headingText,
    descriptionText,
    buttonText
  };

  describe('default behavior', () => {
    const setUpMessage = isolateComponent(
      <UnconnectedSetUpMessage {...defaultProps} />
    );
    it('renders a heading', () => {
      expect(setUpMessage.content()).contains(descriptionText);
    });
    it('renders a description', () => {
      expect(setUpMessage.content()).contains(descriptionText);
    });
    it('renders a gray button with text', () => {
      const button = setUpMessage.findOne('Button');
      expect(button.props.text).to.equal(buttonText);
      expect(button.props.color).to.equal('gray');
    });
    it('has a dashed border', () => {
      expect(setUpMessage.findAll('div')[0].props.style).to.contain({
        borderStyle: 'dashed',
        borderWidth: 5
      });
    });
  });
  describe('custom behavior', () => {
    it('can have a solid border', () => {
      const setUpMessage = isolateComponent(
        <UnconnectedSetUpMessage {...defaultProps} solidBorder />
      );
      expect(setUpMessage.findAll('div')[0].props.style).to.contain({
        borderStyle: 'solid',
        borderWidth: 1
      });
    });
  });
});
