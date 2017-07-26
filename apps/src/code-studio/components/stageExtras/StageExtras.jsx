import React from 'react';
import msg from '@cdo/locale';
import BonusLevels from './BonusLevels';
import ProjectWidget from '../../../templates/projects/ProjectWidget.jsx';

export default class StageExtras extends React.Component {
  static propTypes = {
    stageNumber: React.PropTypes.number.isRequired,
    nextLevelPath: React.PropTypes.string.isRequired,
    bonusLevels: React.PropTypes.array,
    showProjectWidget: React.PropTypes.bool,
    projectTypes: React.PropTypes.arrayOf(React.PropTypes.string),
    projectList: React.PropTypes.array
  }

  render() {
    const nextMessage = /stage/.test(this.props.nextLevelPath) ?
      msg.extrasNextLesson({number: this.props.stageNumber + 1}) :
      msg.extrasNextFinish();

    return (
      <div>
        <h1>{msg.extrasStageNumberCompleted({number: this.props.stageNumber})}</h1>

        <h2>{msg.extrasTryAChallenge()}</h2>
        {this.props.bonusLevels ?
          <BonusLevels bonusLevels={this.props.bonusLevels}/> :
          <p>{msg.extrasNoBonusLevels()}</p>
        }

        {this.props.showProjectWidget &&
          <ProjectWidget
            projectList={this.props.projectList}
            projectTypes={this.props.projectTypes}
          />
        }
        <div className="clear" />

        <h2>{msg.continue()}</h2>
        <a href={this.props.nextLevelPath}>{nextMessage}</a>
      </div>
    );
  }
}
