var React = require('react');

var PropertyRow = React.createClass({
  propTypes: {
    initialValue: React.PropTypes.oneOfType([
      React.PropTypes.string,
      React.PropTypes.number
    ]).isRequired,
    isNumber: React.PropTypes.bool,
    handleChange: React.PropTypes.func
  },

  getInitialState: function () {
    return {
      value: this.props.initialValue
    };
  },

  handleChangeInternal: function(event) {
    var value = event.target.value;
    this.props.handleChange(value);
    this.setState({value: value});
  },

  render: function() {
    return (
      <tr>
        <td>{this.props.desc}</td>
        <td>
          <input
            type={this.props.isNumber ? 'number' : undefined}
            value={this.state.value}
            onChange={this.handleChangeInternal}/>
        </td>
      </tr>
    );
  }
});

module.exports = PropertyRow;
