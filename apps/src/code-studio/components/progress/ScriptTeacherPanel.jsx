import React from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import TeacherPanel from '../TeacherPanel';
import SectionSelector from './SectionSelector';
import ViewAsToggle from './ViewAsToggle';
import FontAwesome from '@cdo/apps/templates/FontAwesome';
import {fullyLockedStageMapping} from '../../stageLockRedux';
import {ViewType} from '../../viewAsRedux';
import {hasLockableStages} from '../../progressRedux';
import StudentTable, {studentShape} from './StudentTable';
import {teacherDashboardUrl} from '@cdo/apps/templates/teacherDashboard/urlHelpers';
import {SelectedStudentInfo} from './SelectedStudentInfo';
import Button from '@cdo/apps/templates/Button';
import i18n from '@cdo/locale';

const styles = {
  scrollable: {
    overflowY: 'auto',
    overflowX: 'hidden',
    maxHeight: '90%'
  },
  text: {
    margin: 10
  },
  exclamation: {
    color: 'red'
  },
  dontForget: {
    display: 'inline',
    marginLeft: 10,
    fontSize: 16,
    fontFamily: '"Gotham 7r", sans-serif'
  },
  sectionHeader: {
    margin: 10,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  exampleSolutions: {
    textAlign: 'center',
    margin: 5
  }
};

class ScriptTeacherPanel extends React.Component {
  static propTypes = {
    onSelectUser: PropTypes.func,
    getSelectedUserId: PropTypes.func,
    sectionData: PropTypes.object,

    // Provided by redux.
    viewAs: PropTypes.oneOf(Object.values(ViewType)).isRequired,
    hasSections: PropTypes.bool.isRequired,
    sectionsAreLoaded: PropTypes.bool.isRequired,
    selectedSection: PropTypes.shape({
      id: PropTypes.number.isRequired,
      name: PropTypes.string.isRequired
    }),
    scriptHasLockableStages: PropTypes.bool.isRequired,
    scriptAllowsHiddenStages: PropTypes.bool.isRequired,
    unlockedStageNames: PropTypes.arrayOf(PropTypes.string).isRequired,
    students: PropTypes.arrayOf(studentShape),
    inMiniRubricExperiment: PropTypes.bool
  };

  render() {
    const {
      inMiniRubricExperiment,
      sectionData,
      viewAs,
      hasSections,
      sectionsAreLoaded,
      selectedSection,
      scriptHasLockableStages,
      scriptAllowsHiddenStages,
      unlockedStageNames,
      students
    } = this.props;

    const currentLevelSection = sectionData ? sectionData.section_levels : null;

    const currentStudent = sectionData
      ? sectionData.section.students.find(
          student => this.props.getSelectedUserId() === student.id
        )
      : null;
    const currentStudentLevel =
      sectionData && currentStudent
        ? sectionData.section_levels.find(
            level => this.props.getSelectedUserId() === level.user_id
          )
        : null;

    return (
      <TeacherPanel>
        <h3>{i18n.teacherPanel()}</h3>
        <div style={styles.scrollable}>
          <ViewAsToggle />
          {sectionData && (
            <div style={styles.exampleSolutions}>
              {sectionData.level_examples &&
                sectionData.level_examples.map((example, index) => (
                  <Button
                    key={index}
                    text={i18n.exampleSolution({number: index + 1})}
                    color="blue"
                    href={example}
                    target="_blank"
                  />
                ))}
            </div>
          )}
          {selectedSection && (
            <h4 style={styles.sectionHeader}>
              {`${i18n.section()} `}
              <a href={teacherDashboardUrl(selectedSection.id)}>
                {selectedSection.name}
              </a>
            </h4>
          )}
          {!sectionsAreLoaded && (
            <div style={styles.text}>{i18n.loading()}</div>
          )}
          {(scriptAllowsHiddenStages || scriptHasLockableStages) && (
            <SectionSelector style={{margin: 10}} reloadOnChange={true} />
          )}
          {hasSections &&
            scriptHasLockableStages &&
            viewAs === ViewType.Teacher && (
              <div>
                <div style={styles.text}>
                  {i18n.selectSectionInstructions()}
                </div>
                {unlockedStageNames.length > 0 && (
                  <div>
                    <div style={styles.text}>
                      <FontAwesome
                        icon="exclamation-triangle"
                        style={styles.exclamation}
                      />
                      <div style={styles.dontForget}>{i18n.dontForget()}</div>
                    </div>
                    <div style={styles.text}>
                      {i18n.lockFollowing()}
                      <ul>
                        {unlockedStageNames.map((name, index) => (
                          <li key={index}>{name}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}
          {viewAs === ViewType.Teacher && (students || []).length > 0 && (
            <div>
              {currentStudent && (
                <SelectedStudentInfo
                  selectedStudent={currentStudent}
                  level={currentStudentLevel}
                  inMiniRubricExperiment={inMiniRubricExperiment}
                />
              )}
              <StudentTable
                levels={currentLevelSection}
                students={students}
                onSelectUser={this.props.onSelectUser}
                getSelectedUserId={this.props.getSelectedUserId}
                inMiniRubricExperiment={inMiniRubricExperiment}
              />
            </div>
          )}
        </div>
      </TeacherPanel>
    );
  }
}

export const UnconnectedScriptTeacherPanel = ScriptTeacherPanel;
export default connect(state => {
  const {stagesBySectionId, lockableAuthorized} = state.stageLock;
  const {
    selectedSectionId,
    sectionsAreLoaded,
    sectionIds
  } = state.teacherSections;
  const currentSection = stagesBySectionId[selectedSectionId];

  const fullyLocked = fullyLockedStageMapping(
    state.stageLock.stagesBySectionId[selectedSectionId]
  );
  const unlockedStageIds = Object.keys(currentSection || {}).filter(
    stageId => !fullyLocked[stageId]
  );

  let stageNames = {};
  state.progress.stages.forEach(stage => {
    stageNames[stage.id] = stage.name;
  });

  // Pretend we don't have lockable stages if we're not authorized to see them
  const scriptHasLockableStages =
    lockableAuthorized && hasLockableStages(state.progress);

  return {
    viewAs: state.viewAs,
    hasSections: sectionIds.length > 0,
    sectionsAreLoaded,
    scriptHasLockableStages,
    selectedSection: state.teacherSections.sections[selectedSectionId],
    scriptAllowsHiddenStages: state.hiddenStage.hideableStagesAllowed,
    unlockedStageNames: unlockedStageIds.map(id => stageNames[id]),
    students: state.teacherSections.selectedStudents
  };
})(ScriptTeacherPanel);
