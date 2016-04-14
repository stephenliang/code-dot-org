var msg = require('./locale');

var SpellingControls = function (props) {
  return (
    <div id="spelling-table-wrapper">
      <table id="spelling-table" className="float-right">
        <tbody>
          <tr>
            <td className="spellingTextCell">{msg.word()}:</td>
            <td className="spellingButtonCell">
              <button id="searchWord" className="spellingButton" disabled>
                <img src="/blockly/media/1x1.gif"/>
                {props.searchWord}
              </button>
            </td>
          </tr>
          <tr>
            <td className="spellingTextCell">{msg.youSpelled()}:</td>
            <td className="spellingButtonCell">
              <button id="currentWord" className="spellingButton" disabled>
                <img src="/blockly/media/1x1.gif"/>
                <span id="currentWordContents"/>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

SpellingControls.propTypes = {
  searchWord: React.PropTypes.string.isRequired
};

module.exports = SpellingControls;
