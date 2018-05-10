import React, {PropTypes} from 'react';
import BaseDialog from '@cdo/apps/templates/BaseDialog';
import i18n from '@cdo/locale';
import color from '@cdo/apps/util/color';
import Button from "../../templates/Button";
import {isEmail} from '../../util/formatValidation';
import $ from 'jquery';
import MD5 from 'crypto-js/md5';

// TODO: List for this feature overall
// Handle failed submissions gracefully.
// Update the email on the Account page after successful submit without reload.
// Send the email opt-in to the server and handle it correctly
// Testing!
// Deduplicate and test client-side email hashing logic
// A less clumsy way to use Rails UJS? At least a comment describing how this works.
//   see http://guides.rubyonrails.org/working_with_javascript_in_rails.html#rails-ujs-event-handlers

const styles = {
  container: {
    margin: 20,
    color: color.charcoal,
  },
  label: {
    display: 'block',
    fontWeight: 'bold',
    color: color.charcoal,
  },
  input: {
    marginBottom: 4,
  },
};

/**
 * Pops up a dialog that prompts the user to confirm their email address.
 * This is used when oauth accounts switch from student to teacher, in order
 * to verify that the email address is already known to the user (it will
 * become visible on the accounts page after the transition, which is a
 * potential violation of student privacy).
 */
export default class ChangeEmailModal extends React.Component {
  static propTypes = {
    isOpen: PropTypes.bool.isRequired,
    handleSubmit: PropTypes.func.isRequired,
    handleCancel: PropTypes.func.isRequired,
    userAge: PropTypes.number.isRequired,
  };

  constructor(props) {
    super(props);
    this.state = {
      newEmail: '',
      currentPassword: '',
      emailOptIn: '',
    };
  }

  componentDidMount() {
    this._form = $('form[data-form-for=ChangeEmailModal]');
    this._form.on('ajax:success', this.onSubmitSuccess);
    this._form.on('ajax:error', this.onSubmitFailure);
  }

  componentWillUnmount() {
    this._form.off('ajax:success', this.onSubmitSuccess);
    this._form.off('ajax:error', this.onSubmitFailure);
  }

  save = () => {
    this._form.find('#user_email').val(this.props.userAge < 13 ? '' : this.state.newEmail);
    this._form.find('#user_hashed_email').val(MD5(this.state.newEmail));
    this._form.find('#user_current_password').val(this.state.currentPassword);
    // this._form.find('#user_email_opt_in').val(this.state.emailOptIn);
    this._form.submit();
  };

  cancel = () => this.props.handleCancel();

  onSubmitSuccess = (data, status, xhr) => {
    this.props.handleSubmit();
  };

  onSubmitFailure = (xhr, status, error) => {
    // TODO: I'm not getting useful validation information back from Rails,
    // TODO: just a 422 Unprocessable Entity.
    // TODO: How do I detect, for example, that an email is already in use?
    console.error(xhr, status, error);
  };

  getValidationErrors() {
    return {
      newEmail: this.getNewEmailValidationError(),
      currentPassword: this.getCurrentPasswordValidationError(),
      // emailOptIn: this.getEmailOptInValidationError(),
    };
  }

  getNewEmailValidationError = () => {
    if (this.state.newEmail.trim().length === 0) {
      return i18n.changeEmailModal_newEmail_isRequired();
    }
    if (!isEmail(this.state.newEmail.trim())) {
      return i18n.changeEmailModal_newEmail_invalid();
    }
    return null;
  };

  getCurrentPasswordValidationError = () => {
    if (this.state.currentPassword.length === 0) {
      return i18n.changeEmailModal_currentPassword_isRequired();
    }
    return null;
  };

  getEmailOptInValidationError = () => {
    if (this.state.emailOptIn.length === 0) {
      return i18n.changeEmailModal_emailOptIn_isRequired();
    }
    return null;
  };

  onNewEmailChange = (event) => this.setState({newEmail: event.target.value});
  onCurrentPasswordChange = (event) => this.setState({currentPassword: event.target.value});
  onEmailOptInChange = (event) => this.setState({emailOptIn: event.target.value});


  render = () => {
    const validationErrors = this.getValidationErrors();
    const isFormValid = Object.keys(validationErrors).every(key => !validationErrors[key]);
    return (
      <BaseDialog
        useUpdatedStyles
        isOpen={this.props.isOpen}
        handleClose={this.cancel}
      >
        <div style={styles.container}>
          <SystemDialogHeader text={i18n.changeEmailModal_title()}/>
          <div>
            <Field>
              <label
                htmlFor="user_email"
                style={styles.label}
              >
                {i18n.changeEmailModal_newEmail_label()}
              </label>
              <input
                id="user_email"
                type="email"
                value={this.state.newEmail}
                onChange={this.onNewEmailChange}
                autoComplete="off"
                maxLength="255"
                size="255"
                style={styles.input}
              />
              <FieldError>
                {validationErrors.newEmail}
              </FieldError>
            </Field>
            <Field>
              <label
                htmlFor="user_current_password"
                style={styles.label}
              >
                {i18n.changeEmailModal_currentPassword_label()}
              </label>
              <input
                id="user_current_password"
                type="password"
                value={this.state.currentPassword}
                onChange={this.onCurrentPasswordChange}
                maxLength="255"
                size="255"
                style={styles.input}
              />
              <FieldError>
                {validationErrors.currentPassword}
              </FieldError>
            </Field>
            <Field style={{display: 'none'}}>
              <p>
                {i18n.changeEmailModal_emailOptIn_description()}
              </p>
              <select
                value={this.state.emailOptIn}
                onChange={this.onEmailOptInChange}
                style={{
                  ...styles.input,
                  width: 100,
                }}
              >
                <option value=""/>
                <option value="yes">
                  {i18n.yes()}
                </option>
                <option value="no">
                  {i18n.no()}
                </option>
              </select>
              <FieldError>
                {validationErrors.emailOptIn}
              </FieldError>
            </Field>
          </div>
          <SystemDialogConfirmCancelFooter
            confirmText={i18n.changeEmailModal_save()}
            onConfirm={this.save}
            onCancel={this.cancel}
            disableConfirm={!isFormValid}
          />
        </div>
      </BaseDialog>
    );
  };
}

const Field = ({children, style}) => (
  <div
    style={{
      marginBottom: 15,
      ...style,
    }}
  >
    {children}
  </div>
);
Field.propTypes = {
  children: PropTypes.any,
  style: PropTypes.object,
};

const FieldError = ({children}) => (
  <div
    style={{
      color: color.red,
      fontStyle: 'italic',
    }}
  >
    {children}
  </div>
);
FieldError.propTypes = {children: PropTypes.string};

const horizontalRuleStyle = {
  borderStyle: 'solid',
  borderColor: color.lighter_gray,
  borderTopWidth: 0,
  borderBottomWidth: 0,
  borderRightWidth: 0,
  borderLeftWidth: 0,
};

class SystemDialogHeader extends React.Component {
  static propTypes = {
    text: PropTypes.string.isRequired,
  };

  static style = {
    fontSize: 16,
    lineHeight: '20px',
    color: color.charcoal,
    fontFamily: "'Gotham 5r', sans-serif",
    ...horizontalRuleStyle,
    borderBottomWidth: 1,
    paddingBottom: 10,
    paddingTop: 0,
    paddingLeft: 0,
    paddingRight: 0,
    marginBottom: 10,
  };

  render() {
    return (
      <h1 style={SystemDialogHeader.style}>
        {this.props.text}
      </h1>
    );
  }
}

class SystemDialogConfirmCancelFooter extends React.Component {
  static propTypes = {
    onConfirm: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
    confirmText: PropTypes.string.isRequired,
    cancelText: PropTypes.string.isRequired,
    disableConfirm: PropTypes.bool.isRequired,
  };

  static defaultProps = {
    confirmText: i18n.dialogOK(),
    cancelText: i18n.cancel(),
    disableConfirm: false,
  };

  static style = {
    display: 'flex',
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    ...horizontalRuleStyle,
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 10,
  };

  render() {
    return (
      <div style={SystemDialogConfirmCancelFooter.style}>
        <Button
          onClick={this.props.onConfirm}
          text={this.props.confirmText}
          color={Button.ButtonColor.orange}
          disabled={this.props.disableConfirm}
        />
        <Button
          onClick={this.props.onCancel}
          text={this.props.cancelText}
          color={Button.ButtonColor.gray}
        />
      </div>
    );
  }
}
