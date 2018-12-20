import React, {PropTypes, Component} from 'react';
import {Route, Switch} from 'react-router-dom';
import TeacherDashboardNavigation from './TeacherDashboardNavigation';
import StatsTableWithData from './StatsTableWithData';

export default class TeacherDashboard extends Component {
  static propTypes = {
    sectionId: PropTypes.string
  };

  render() {
    const {sectionId} = this.props;

    return (
      <div>
        <TeacherDashboardNavigation/>
        <Switch>
          <Route
            path="/stats"
            component={props => <StatsTableWithData {...props} sectionId={sectionId}/>}
          />
          <Route
            path="/progress"
            component={props => <div>Progress content goes here!</div>}
          />
          <Route
            path="/manage_students"
            component={props => <div>Manage Students content goes here!</div>}
          />
          <Route
            path="/projects"
            component={props => <div>Projects content goes here!</div>}
          />
          <Route
            path="/text_responses"
            component={props => <div>Text responses content goes here!</div>}
          />
          <Route
            path="/assessments"
            component={props => <div>Assessments/Surveys content goes here!</div>}
          />
          <Route component={props => <div>Progress content goes here - default for now.</div>} />
        </Switch>
      </div>
    );
  }
}
