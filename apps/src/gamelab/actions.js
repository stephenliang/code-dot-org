/** @file Redux action-creators for Game Lab.
 *  @see http://redux.js.org/docs/basics/Actions.html */
'use strict';

var _ = require('../lodash');
var utils = require('../utils');

/** @enum {string} */
var ActionType = module.exports.ActionType = utils.makeEnum(
  'ADD_ANIMATION_AT',
  'DELETE_ANIMATION',
  'SET_ANIMATION_NAME',
  'SET_INITIAL_ANIMATION_METADATA',
  'SET_INITIAL_LEVEL_PROPS',
  'CHANGE_INTERFACE_MODE'
);

/**
 * Change the interface mode between Code Mode and the Animation Tab
 * @param {!GameLabInterfaceMode} interfaceMode
 * @returns {{type: ActionType, interfaceMode: GameLabInterfaceMode}}
 */
module.exports.changeInterfaceMode = function (interfaceMode) {
  return {
    type: ActionType.CHANGE_INTERFACE_MODE,
    interfaceMode: interfaceMode
  };
};

/**
 * Push lots of view properties of the level into the store.
 * Should be called during level init.
 * Any properties omitted from the props argument are not set in the state.
 *
 * @param {!Object} props
 * @param {function} [props.assetUrl] - Helper function for retrieving
 *        assets for this particular level type.
 * @param {boolean} [props.isEmbedView] - Whether the level is being embedded
 *        in an iFrame.
 * @param {boolean} [props.isShareView] - Whether we are displaying the level
 *        on a share page.
 *
 * @returns {{type: ActionType, props: Object}}
 */
module.exports.setInitialLevelProps = function (props) {
  return {
    type: ActionType.SET_INITIAL_LEVEL_PROPS,
    props: props
  };
};

/**
 * Push full animation metadata into the store, usually on first load
 * from the sources API.
 * 
 * @param {Object} metadata
 * @returns {{type: ActionType, metadata: Object}}
 */
module.exports.setInitialAnimationMetadata = function (metadata) {
  return {
    type: ActionType.SET_INITIAL_ANIMATION_METADATA,
    metadata: metadata
  }
};

module.exports.addAnimation = function (animationProps) {
  // TODO: Validate animationProps?
  return function(dispatch, getState) {
    dispatch({
      type: ActionType.ADD_ANIMATION_AT,
      index: getState().animations.length,
      animationProps: animationProps
    });
  }
};

module.exports.cloneAnimation = function (animationKey) {
  return function(dispatch, getState) {
    var animations = getState().animations;
    
    // Track down the source animation and its index in the collection
    var sourceIndex;
    for (sourceIndex = 0; sourceIndex < animations.length; sourceIndex++) {
      if (animations[sourceIndex].key === animationKey) {
        break;
      }
    }
    var sourceAnimation = animations[sourceIndex];
    if (!sourceAnimation) {
      throw new Error('Unable to clone animation with key "' + animationKey +
          '": Animation not found');
    }

    // Do async work of copying the S3 asset here, then create an animation with
    // the new key.
    // Fake it for now.
    dispatch({
      type: ActionType.ADD_ANIMATION_AT,
      index: sourceIndex + 1,
      animationProps: _.assign({}, sourceAnimation, {
        key: utils.createUuid(),
        name: sourceAnimation.name + '_copy', // TODO: better generated names
        version: "111111"
      })
    });
  };
};

/**
 * Delete the specified animation from the project.
 * @param {string} animationKey
 * @returns {{type: ActionType, animationKey: string}}
 */
module.exports.deleteAnimation = function (animationKey) {
  return {
    type: ActionType.DELETE_ANIMATION,
    animationKey: animationKey
  };
};

/**
 * Set the display name of the specified animation.
 * @param {string} animationKey
 * @param {string} name
 * @returns {{type: ActionType, animationKey: string, name: string}}
 */
module.exports.setAnimationName = function (animationKey, name) {
  return {
    type: ActionType.SET_ANIMATION_NAME,
    animationKey: animationKey,
    name: name
  };
};
