/*global dashboard*/
import React from 'react';
import PropTypes from 'prop-types';
import libraryParser from './libraryParser';
import i18n from '@cdo/locale';
import color from '@cdo/apps/util/color';
import {Heading2} from '@cdo/apps/lib/ui/Headings';
import Button from '@cdo/apps/templates/Button';

const styles = {
  alert: {
    color: color.red,
    width: '90%',
    paddingTop: 8,
    fontStyle: 'italic'
  },
  functionSelector: {
    display: 'flex',
    alignItems: 'center',
    margin: '10px 10px 10px 0'
  },
  largerCheckbox: {
    width: 20,
    height: 20
  },
  functionLabel: {
    margin: 0,
    fontSize: 20
  },
  info: {
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 1.2
  },
  textInput: {
    fontSize: 14,
    padding: 6,
    color: color.dimgray
  },
  description: {
    width: '98%',
    resize: 'vertical'
  },
  unpublishButton: {
    right: 0,
    marginTop: 20,
    position: 'absolute'
  }
};

/**
 * @readonly
 * @enum {string}
 */
export const PublishState = {
  DEFAULT: 'default',
  ERROR_PUBLISH: 'error_publish',
  INVALID_INPUT: 'invalid_input',
  ERROR_UNPUBLISH: 'error_unpublish'
};

/**
 * An interactive page for a dialog that can be used to publish or unpublish
 * a library from a source project.
 */
export default class LibraryPublisher extends React.Component {
  static propTypes = {
    onPublishSuccess: PropTypes.func.isRequired,
    onUnpublishSuccess: PropTypes.func.isRequired,
    libraryDetails: PropTypes.object.isRequired,
    libraryClientApi: PropTypes.object.isRequired,
    onShareTeacherLibrary: PropTypes.func
  };

  constructor(props) {
    super(props);

    const initialSelectedFunctions = props.libraryDetails.selectedFunctions;
    let validSelectedFunctions = {};
    props.libraryDetails.sourceFunctionList.forEach(sourceFunction => {
      if (
        initialSelectedFunctions[sourceFunction.functionName] &&
        this.isFunctionValid(sourceFunction)
      ) {
        validSelectedFunctions[sourceFunction.functionName] = true;
      }
    });

    this.state = {
      publishState: PublishState.DEFAULT,
      libraryName: libraryParser.suggestName(props.libraryDetails.libraryName),
      libraryDescription: props.libraryDetails.libraryDescription,
      selectedFunctions: validSelectedFunctions
    };
  }

  setLibraryName = event => {
    const {libraryName} = this.state;
    const sanitizedName = libraryParser.sanitizeName(event.target.value);
    if (sanitizedName === libraryName) {
      return;
    }
    this.setState({libraryName: sanitizedName});
  };

  publish = () => {
    const {libraryDescription, libraryName, selectedFunctions} = this.state;
    const {librarySource, sourceFunctionList} = this.props.libraryDetails;
    const {libraryClientApi, onPublishSuccess} = this.props;
    const functionsToPublish = sourceFunctionList.filter(sourceFunction => {
      return selectedFunctions[sourceFunction.functionName];
    });

    if (!(libraryDescription && functionsToPublish.length > 0)) {
      this.setState({publishState: PublishState.INVALID_INPUT});
      return;
    }

    const libraryJson = libraryParser.createLibraryJson(
      librarySource,
      functionsToPublish,
      libraryName,
      libraryDescription
    );

    // Publish to S3
    libraryClientApi.publish(
      libraryJson,
      error => {
        console.warn(`Error publishing library: ${error}`);
        this.setState({publishState: PublishState.ERROR_PUBLISH});
      },
      data => {
        // Write to projects database
        dashboard.project.setLibraryDetails({
          libraryName,
          libraryDescription,
          publishing: true,
          latestLibraryVersion: data && data.versionId
        });

        onPublishSuccess(libraryName);
      }
    );
  };

  displayNameInput = () => {
    const {libraryName} = this.state;
    return (
      <div>
        <input
          style={styles.textInput}
          type="text"
          value={libraryName}
          onChange={this.setLibraryName}
          onBlur={event =>
            this.setState({
              libraryName: libraryParser.suggestName(event.target.value)
            })
          }
        />
        <div style={styles.info}>{i18n.libraryNameRequirements()}</div>
      </div>
    );
  };

  resetErrorMessage = () => {
    const {libraryDescription, selectedFunctions, publishState} = this.state;
    if (
      libraryDescription &&
      Object.values(selectedFunctions).find(value => value) &&
      publishState === PublishState.INVALID_INPUT
    ) {
      this.setState({publishState: PublishState.DEFAULT});
    }
  };

  displayDescription = () => {
    const {libraryDescription} = this.state;
    return (
      <textarea
        rows="2"
        cols="200"
        style={{...styles.textInput, ...styles.description}}
        placeholder={i18n.libraryDescriptionPlaceholder()}
        value={libraryDescription}
        onChange={event => {
          this.setState(
            {libraryDescription: event.target.value},
            this.resetErrorMessage
          );
        }}
      />
    );
  };

  hasComment = sourceFunction => {
    return (sourceFunction.comment || '').length > 0;
  };

  duplicateFunction = sourceFunction => {
    const {sourceFunctionList} = this.props.libraryDetails;
    const {functionName} = sourceFunction;
    return (
      sourceFunctionList.filter(source => source.functionName === functionName)
        .length > 1
    );
  };

  isFunctionValid = sourceFunction => {
    return (
      this.hasComment(sourceFunction) && !this.duplicateFunction(sourceFunction)
    );
  };

  boxChecked = sourceFunction => {
    // No-op if function is invalid
    if (!this.isFunctionValid(sourceFunction)) {
      return;
    }

    const name = sourceFunction.functionName;
    this.setState(state => {
      state.selectedFunctions[name] = !state.selectedFunctions[name];
      return state;
    }, this.resetErrorMessage);
  };

  displayFunctions = () => {
    const {selectedFunctions} = this.state;
    const {sourceFunctionList} = this.props.libraryDetails;
    return sourceFunctionList.map(sourceFunction => {
      const {functionName, comment} = sourceFunction;
      const checked = selectedFunctions[functionName] || false;

      return (
        <div key={functionName}>
          <div style={styles.functionSelector}>
            <input
              style={styles.largerCheckbox}
              type="checkbox"
              id={functionName}
              disabled={!this.isFunctionValid(sourceFunction)}
              name={functionName}
              checked={checked}
              onChange={() => this.boxChecked(sourceFunction)}
            />
            <label htmlFor={functionName} style={styles.functionLabel}>
              {functionName}
            </label>
          </div>
          {!this.hasComment(sourceFunction) && (
            <p style={styles.alert}>{i18n.libraryExportNoCommentError()}</p>
          )}
          {this.duplicateFunction(sourceFunction) && (
            <p style={styles.alert}>
              {i18n.libraryExportDuplicationFunctionError()}
            </p>
          )}
          <pre style={styles.textInput}>{comment}</pre>
        </div>
      );
    });
  };

  displayError = () => {
    const {publishState} = this.state;
    let errorMessage;
    switch (publishState) {
      case PublishState.INVALID_INPUT:
        errorMessage = i18n.libraryPublishInvalid();
        break;
      case PublishState.ERROR_PUBLISH:
        errorMessage = i18n.libraryPublishFail();
        break;
      case PublishState.ERROR_UNPUBLISH:
        errorMessage = i18n.libraryUnPublishFail();
        break;
      default:
        return;
    }
    return (
      <div>
        <p style={styles.alert}>{errorMessage}</p>
      </div>
    );
  };

  unpublish = () => {
    const {libraryClientApi, onUnpublishSuccess} = this.props;
    libraryClientApi.delete(
      () => {
        dashboard.project.setLibraryDetails({
          libraryName: undefined,
          libraryDescription: undefined,
          publishing: false,
          latestLibraryVersion: -1
        });
        onUnpublishSuccess();
      },
      error => {
        console.warn(`Error unpublishing library: ${error}`);
        this.setState({publishState: PublishState.ERROR_UNPUBLISH});
      }
    );
  };

  allFunctionsSelected = () => {
    const {sourceFunctionList} = this.props.libraryDetails;
    const {selectedFunctions} = this.state;

    let allSelected = true;
    sourceFunctionList.forEach(sourceFunction => {
      if (
        !selectedFunctions[sourceFunction.functionName] &&
        this.isFunctionValid(sourceFunction)
      ) {
        allSelected = false;
      }
    });

    return allSelected;
  };

  toggleAllFunctionsSelected = () => {
    if (this.allFunctionsSelected()) {
      this.setState({selectedFunctions: {}});
    } else {
      const {sourceFunctionList} = this.props.libraryDetails;
      let selectedFunctions = {};
      sourceFunctionList.forEach(sourceFunction => {
        if (this.isFunctionValid(sourceFunction)) {
          selectedFunctions[sourceFunction.functionName] = true;
        }
      });
      this.setState({selectedFunctions});
    }
  };

  render() {
    const {alreadyPublished} = this.props.libraryDetails;
    const {onShareTeacherLibrary} = this.props;

    return (
      <div>
        <Heading2>{i18n.libraryName()}</Heading2>
        {this.displayNameInput()}
        <Heading2>{i18n.description()}</Heading2>
        {this.displayDescription()}
        <Heading2>{i18n.catProcedures()}</Heading2>
        <div style={styles.functionSelector}>
          <input
            style={styles.largerCheckbox}
            type="checkbox"
            id="func-select-all"
            checked={this.allFunctionsSelected()}
            onChange={this.toggleAllFunctionsSelected}
          />
          <label htmlFor="func-select-all" style={styles.functionLabel}>
            {i18n.selectAllFunctions()}
          </label>
        </div>
        {this.displayFunctions()}
        <div style={styles.info}>{i18n.libraryFunctionRequirements()}</div>
        <div style={{position: 'relative'}}>
          <Button
            __useDeprecatedTag
            style={{marginTop: 20}}
            onClick={this.publish}
            text={alreadyPublished ? i18n.update() : i18n.publish()}
          />
          {onShareTeacherLibrary && (
            <Button
              __useDeprecatedTag
              style={{marginTop: 20, marginLeft: 10}}
              onClick={onShareTeacherLibrary}
              text={i18n.manageLibraries()}
              color={Button.ButtonColor.gray}
            />
          )}
          {alreadyPublished && (
            <Button
              __useDeprecatedTag
              style={styles.unpublishButton}
              onClick={this.unpublish}
              text={i18n.unpublish()}
              color={Button.ButtonColor.red}
            />
          )}
        </div>
        {this.displayError()}
      </div>
    );
  }
}
