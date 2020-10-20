import PropTypes from 'prop-types';
import React, {Component} from 'react';
import BaseDialog from '@cdo/apps/templates/BaseDialog';
import DialogFooter from '@cdo/apps/templates/teacherDashboard/DialogFooter';
import RailsAuthenticityToken from '@cdo/apps/lib/util/RailsAuthenticityToken';
import color from '@cdo/apps/util/color';

const styles = {
  dialog: {
    paddingLeft: 20,
    paddingRight: 20,
    paddingBottom: 20,
    fontFamily: '"Gotham 4r", sans-serif, sans-serif'
  },
  container: {
    display: 'flex',
    flexDirection: 'column'
  },
  dropdownRow: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  inputAndLabel: {
    display: 'flex',
    flexDirection: 'column'
  },
  textInput: {
    width: '100%'
  },
  selectAndLabel: {
    display: 'flex',
    flexDirection: 'column',
    width: '45%'
  },
  selectInput: {
    width: '100%'
  },
  checkboxInput: {
    marginTop: 0,
    marginLeft: 10
  },
  submitButton: {
    backgroundColor: color.orange,
    color: 'white',
    borderRadius: 3,
    fontSize: 12
  }
};

// TODO: Hook up adding a resource when resources are associated with lessons

export default class AddResourceDialog extends Component {
  static propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onSave: PropTypes.func,
    handleClose: PropTypes.func.isRequired,
    typeOptions: PropTypes.arrayOf(PropTypes.string),
    audienceOptions: PropTypes.arrayOf(PropTypes.string)
  };

  constructor(props) {
    super(props);

    this.state = {
      key: '',
      name: '',
      type: '',
      audience: '',
      pdf: false,
      assessment: false,
      url: '',
      downloadUrl: '',
      error: ''
    };
  }

  validateResource = () => {
    const {key, name, url} = this.state;
    let error = '';
    if (name === '') {
      error += 'Name is required. ';
    }
    if (url === '') {
      error += 'URL is required. ';
    }
    if (key === '') {
      error += 'Embed slug is required.';
    }
    if (error === '') {
      return true;
    } else {
      this.setState({error});
      return false;
    }
  };

  resetState = () => {
    this.setState({
      key: '',
      name: '',
      type: '',
      audience: '',
      pdf: false,
      assessment: false,
      url: '',
      downloadUrl: ''
    });
  };

  saveResource = e => {
    e.preventDefault();
    if (this.validateResource()) {
      const formData = new FormData(e.target);
      fetch('/resources', {
        method: 'POST',
        headers: {'X-CSRF-Token': formData.get('authenticity_token')},
        body: formData
      })
        .then(response => (response.ok ? response.json() : {}))
        .then(json => {
          if (json !== {}) {
            this.resetState();
            if (this.props.onSave) {
              this.props.onSave(json);
            }
            this.props.handleClose();
          }
        })
        .catch(error => this.setState({error}));
    }
  };

  handleInputChange = e => {
    const target = e.target;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    this.setState({[target.name]: value});
  };

  render() {
    return (
      <BaseDialog
        isOpen={this.props.isOpen}
        handleClose={this.props.handleClose}
        useUpdatedStyles
        style={styles.dialog}
      >
        <h2>Add Resource</h2>
        {this.state.error !== '' && (
          <h3 style={{color: 'red'}}>{this.state.error}</h3>
        )}
        <form id="create-resource-form" onSubmit={this.saveResource}>
          <RailsAuthenticityToken />
          <div style={styles.container}>
            <label style={styles.inputAndLabel}>
              Resource Name *
              <input
                style={styles.textInput}
                type="text"
                name="name"
                value={this.state.name}
                onChange={this.handleInputChange}
              />
            </label>
            <div style={styles.dropdownRow}>
              <label style={styles.selectAndLabel}>
                <span>Type:</span>
                <select
                  style={styles.selectInput}
                  onChange={this.handleInputChange}
                  name="type"
                  value={this.state.type}
                >
                  <option value={''}>{''}</option>
                  {(this.props.typeOptions || []).map(option => (
                    <option value={option} key={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label style={styles.selectAndLabel}>
                Audience
                <select
                  style={styles.selectInput}
                  name="audience"
                  value={this.state.audience}
                  onChange={this.handleInputChange}
                >
                  <option value={''}>{''}</option>
                  {(this.props.audienceOptions || []).map(option => (
                    <option value={option} key={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div style={{display: 'flex'}}>
              <label>
                Assessment
                <input
                  type="checkbox"
                  style={styles.checkboxInput}
                  name="assessment"
                  value={this.state.assessment}
                  onChange={this.handleInputChange}
                />
              </label>
              <label style={{marginLeft: 20}}>
                Include in PDF
                <input
                  type="checkbox"
                  style={styles.checkboxInput}
                  name="pdf"
                  value={this.state.pdf}
                  onChange={this.handleInputChange}
                />
              </label>
            </div>
            <label style={styles.inputAndLabel}>
              URL *
              <input
                style={styles.textInput}
                type="text"
                value={this.state.url}
                name="url"
                onChange={this.handleInputChange}
              />
            </label>
            <label style={styles.inputAndLabel}>
              Download URL
              <input
                style={styles.textInput}
                type="text"
                name="downloadUrl"
                value={this.state.downloadUrl}
                onChange={this.handleInputChange}
              />
            </label>
            <label style={styles.inputAndLabel}>
              Embed Slug *
              <input
                style={styles.textInput}
                type="txt"
                name="key"
                value={this.state.key}
                onChange={this.handleInputChange}
              />
            </label>
          </div>
          <DialogFooter rightAlign>
            <input
              id="submit-button"
              type="submit"
              value="Close and Add"
              style={styles.submitButton}
            />
          </DialogFooter>
        </form>
      </BaseDialog>
    );
  }
}
